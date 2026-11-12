import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { Obsidian, ROOT, NOTES, digest, slugify, safePath, initVault, registerVault, activeProject, start, projectPath, handoff, checkpoint, saveArtifact } from '../src/runtime.mjs';
import { renderHTML } from '../src/preview.mjs';
function fixture(t) { const root=fs.mkdtempSync(path.join(os.tmpdir(),'tkflow-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const vault=path.join(root,'tkflow');return {root,vault}; }
class FakeVault {
  docs=new Map();opened=[];sketches=0;
  doctor(){return {automation:true};}
  create(file,text){if(!this.docs.has(file))this.docs.set(file,text);}
  read(file){if(!this.docs.has(file))throw Error('missing');return this.docs.get(file);}
  replace(file,text,expected){assert.equal(digest(this.read(file)),expected);this.docs.set(file,text);}
  createSketch(file){if(!this.docs.has(file)){this.docs.set(file,'drawing');this.sketches++;}}
  open(file){this.opened.push(file);return file;}
}
test('initialize and resume preserves saved user intent and the sketch',t=>{
 const {vault}=fixture(t);initVault(vault);const b=new FakeVault();start(vault,b,'My idea');b.docs.set('Projects/my-idea/Blueprint.md','User intent');start(vault,b);
 assert.equal(b.read('Projects/my-idea/Blueprint.md'),'User intent');assert.equal(b.sketches,1);assert.equal(activeProject(vault),'my-idea');assert.equal(b.opened.at(-1),'Projects/my-idea/Sketch.excalidraw.md');
 assert.equal(b.read('Home.md').split('[[Projects/my-idea/Blueprint|').length,2);
});
test('actual projects are direct children and navigation precedes references',t=>{
 const {vault}=fixture(t);initVault(vault);const b=new FakeVault();b.docs.set('Home.md','# tkflow\n\n## Projects\n\n## Reference\n\n[[System/Blueprint]]');start(vault,b,'Reading room');
 assert.ok(b.docs.has('Projects/reading-room/Blueprint.md'));assert.ok(![...b.docs.keys()].some(p=>p.startsWith('Projects/tkflow/')));assert.ok(b.read('Home.md').indexOf('[[Projects/reading-room/')<b.read('Home.md').indexOf('## Reference'));
});
test('initialization refuses unrelated notes without mutation',t=>{
 const {vault}=fixture(t);fs.mkdirSync(vault);fs.writeFileSync(path.join(vault,'private.md'),'Keep');assert.throws(()=>initVault(vault),/nonempty/);assert.equal(fs.readFileSync(path.join(vault,'private.md'),'utf8'),'Keep');assert.ok(!fs.existsSync(path.join(vault,'.tkflow')));
});
test('reinitialization preserves user settings',t=>{const {vault}=fixture(t);initVault(vault);const file=path.join(vault,'.obsidian/app.json');fs.writeFileSync(file,'custom');initVault(vault);assert.equal(fs.readFileSync(file,'utf8'),'custom');});
test('path traversal and existing or broken outward symlinks are refused',t=>{
 const {root,vault}=fixture(t);fs.mkdirSync(vault);assert.throws(()=>safePath(vault,'../other'),/within/);fs.symlinkSync(root,path.join(vault,'outside'));assert.throws(()=>safePath(vault,'outside/private'),/within/);fs.symlinkSync(path.join(root,'not-created'),path.join(vault,'broken'));assert.throws(()=>safePath(vault,'broken'),/within/);
});
test('nested derived artifacts stay in the vault',t=>{const {vault}=fixture(t);initVault(vault);const file=saveArtifact(vault,'Projects/a/Evidence/proof.txt','proof');assert.equal(fs.readFileSync(file,'utf8'),'proof');});
test('a stale revision is rejected without making a write',t=>{const {vault}=fixture(t);initVault(vault);const b=new Obsidian(vault);b.read=()=> 'saved user edit';b.evaluate=()=>{throw Error('should not write');};assert.throws(()=>b.replace('Blueprint.md','agent edit',digest('old')),/Revision conflict/);});
test('the final Vault.process callback rejects an intervening save',async t=>{
 const {vault}=fixture(t);initVault(vault);const b=new Obsidian(vault);let body;b.read=()=> 'initial';b.evaluate=code=>{body=code;return true;};b.replace('Blueprint.md','agent proposal',digest('initial'));
 let saved='intervening edit';const app={vault:{getFileByPath:()=>({}),process:async(_,callback)=>{saved=callback(saved);}}};
 await assert.rejects(vm.runInNewContext(`(async()=>{${body}})()`,{app}),/Revision conflict/);assert.equal(saved,'intervening edit');
});
test('a matching revision saves through the same callback',async t=>{
 const {vault}=fixture(t);initVault(vault);const b=new Obsidian(vault);let body;b.read=()=> 'initial';b.evaluate=code=>{body=code;return true;};b.replace('Blueprint.md','new intent',digest('initial'));
 let saved='initial';await vm.runInNewContext(`(async()=>{${body}})()`,{app:{vault:{getFileByPath:()=>({}),process:async(_,callback)=>{saved=callback(saved);}}}});assert.equal(saved,'new intent');
});
test('wrong vault and failed CLI responses are never silently accepted',t=>{
 const {vault}=fixture(t);initVault(vault);let args;const b=new Obsidian(vault,(_,a)=>{args=a;return '=> {"tkflow":true,"ok":false,"error":"Wrong vault path"}';},{discovery:{cli:{path:'obsidian'}}});assert.throws(()=>b.read('Blueprint.md'),/Wrong vault/);assert.ok(args[2].includes(fs.realpathSync(vault)));assert.equal(args[0],'vault=tkflow');
 const failed=new Obsidian(vault,()=>{throw {stderr:'disconnected'};},{discovery:{cli:{path:'obsidian'}}});assert.throws(()=>failed.read('Blueprint.md'),/disconnected/);
});
test('shell metacharacters remain literal CLI arguments',t=>{
 const {vault}=fixture(t);initVault(vault);let args,options;const b=new Obsidian(vault,(_,a,o)=>{args=a;options=o;return '=> {"tkflow":true,"ok":true,"value":true}';},{discovery:{cli:{path:'obsidian'}}});const text='$(touch /tmp/never) `secret` "quote"\nNext';b.create('Notes/test.md',text);assert.ok(Array.isArray(args));assert.ok(args[2].includes(JSON.stringify(text)));assert.equal(options.shell,undefined);
});
test('HTML escapes raw content, formats intent, and links the selected vault',()=>{
 const html=renderHTML('# Purpose\n\n> [!abstract] Intent\n> Keep ideas\n\n- **Why:** useful\n\n<script>alert(1)</script>\n\n[[Projects/a/Blueprint|Read intent]]','Demo <unsafe>','Other Vault');
 assert.ok(html.includes('<h1>Purpose</h1>'));assert.ok(html.includes('<strong>Why:</strong>'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('vault=Other%20Vault'));assert.ok(!html.includes('[!abstract]'));
});
test('handoff freezes exactly three notes and a generic prompt',t=>{
 const {vault}=fixture(t);initVault(vault);const b=new FakeVault();for(const n of NOTES)b.docs.set(projectPath('demo',n),n+' intent');const packet=handoff(vault,b,'demo');t.after(()=>fs.rmSync(packet,{recursive:true,force:true}));
 b.docs.set(projectPath('demo','Blueprint'),'later');assert.equal(fs.readFileSync(path.join(packet,'Blueprint.md'),'utf8'),'Blueprint intent');assert.deepEqual(fs.readdirSync(packet).sort(),['Blueprint.md','Decisions.md','Prompt.md','Status.md','manifest.json']);assert.equal(JSON.parse(fs.readFileSync(path.join(packet,'manifest.json'))).sha256.Blueprint,digest('Blueprint intent'));
});
test('handoff refuses notes changed while capturing',t=>{const {vault}=fixture(t);initVault(vault);const b=new FakeVault();let count=0;b.read=()=>['a','b','c','changed'][count++];assert.throws(()=>handoff(vault,b,'demo'),/changed/);});
test('failed project creation retains the previous active project',t=>{const {vault}=fixture(t);initVault(vault);const b=new FakeVault();start(vault,b,'Working');b.createSketch=()=>{throw Error('unavailable');};assert.throws(()=>start(vault,b,'Broken'),/unavailable/);assert.equal(activeProject(vault),'working');});
test('corrupt resume state is reported rather than replaced',t=>{const {vault}=fixture(t);initVault(vault);fs.writeFileSync(path.join(vault,'.tkflow/active.json'),'invalid');assert.throws(()=>start(vault,new FakeVault()));assert.equal(fs.readFileSync(path.join(vault,'.tkflow/active.json'),'utf8'),'invalid');});
test('registration is idempotent and preserves other vault entries',t=>{
 const {root,vault}=fixture(t);initVault(vault);const config=path.join(root,'obsidian.json');const original={vaults:{old:{path:'/my/notes',open:true}},cli:true};fs.writeFileSync(config,JSON.stringify(original));registerVault(vault,config);const first=fs.readFileSync(config,'utf8');registerVault(vault,config);assert.equal(fs.readFileSync(config,'utf8'),first);assert.deepEqual(JSON.parse(first).vaults.old,original.vaults.old);assert.equal(Object.keys(JSON.parse(first).vaults).length,2);const backup=fs.readdirSync(root).find(n=>n.startsWith('obsidian.json.tkflow-backup'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,backup))),original);
});
test('checkpoint validates the message before running Git',t=>{const {vault}=fixture(t);initVault(vault);let called=false;assert.throws(()=>checkpoint(vault,'demo','fix: x\ncoauthor',()=>{called=true;}),/single-line/);assert.equal(called,false);});
test('helper works from a relocated plugin bundle and symlinked executable',t=>{
 const {root}=fixture(t);const copied=path.join(root,'plugin');fs.mkdirSync(copied);for(const item of ['src','templates','skills'])fs.cpSync(path.join(ROOT,item),path.join(copied,item),{recursive:true});
 const runner=path.join(copied,'skills/tkflow/scripts/run.mjs');assert.match(execFileSync(process.execPath,[runner,'--help'],{encoding:'utf8'}),/capture/);
 const symlink=path.join(root,'tkflow');fs.symlinkSync(path.join(copied,'src/cli.mjs'),symlink);assert.match(execFileSync(process.execPath,[symlink,'--help'],{encoding:'utf8'}),/capture/);
});
test('invalid project names are rejected',()=>assert.throws(()=>slugify('???'),/project name/));
