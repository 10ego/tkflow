import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { begin, connect } from '../src/startup.mjs';
import { digest, projectPath } from '../src/runtime.mjs';
import { ObsidianCLIError } from '../src/obsidian-cli.mjs';
const discovery={status:'located',platform:'darwin',cli:{path:'/test/cli',source:'test'},application:{path:'/Applications/Obsidian.app'},sandbox:{hint:false}};
class Fake {
 docs=new Map();opened=[];sketchCount=0;
 doctor(){return {automation:true};}
 create(p,s){if(!this.docs.has(p))this.docs.set(p,s);}
 read(p){assert.ok(this.docs.has(p),p);return this.docs.get(p);}
 replace(p,s,hash){assert.equal(digest(this.read(p)),hash);this.docs.set(p,s);}
 createSketch(p){if(!this.docs.has(p)){this.docs.set(p,'drawing');this.sketchCount++;}}
 open(p){this.opened.push(p);}
}
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'tkflow-begin-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,vault:path.join(root,'tkflow')};}
function options(bridge,extra={}){return {bridge,discovery,wait:async()=>{},reveal:()=>{},...extra};}
function unreachable(d=discovery){return new ObsidianCLIError('OBSIDIAN_APP_UNREACHABLE','CLI found but app unreachable',d,['retry through normal approval']);}
test('initiation creates the project and brings Obsidian to its exact sketch',async t=>{
 const {vault}=fixture(t),b=new Fake(),revealed=[];const result=await begin(vault,'My idea',options(b,{reveal:(d,v,p)=>revealed.push({v,p})}));assert.equal(result.status,'opened');assert.equal(result.project,'my-idea');assert.ok(b.docs.has('Projects/my-idea/Blueprint.md'));assert.equal(b.opened.at(-1),'Projects/my-idea/Sketch.excalidraw.md');assert.deepEqual(revealed,[{v:vault,p:'Projects/my-idea/Sketch.excalidraw.md'}]);
});
test('resuming reopens the existing sketch and preserves saved edits',async t=>{
 const {vault}=fixture(t),b=new Fake();await begin(vault,'My idea',options(b));b.docs.set(projectPath('my-idea','Blueprint'),'Edited user intent');const result=await begin(vault,undefined,options(b));assert.equal(result.project,'my-idea');assert.equal(b.read(projectPath('my-idea','Blueprint')),'Edited user intent');assert.equal(b.sketchCount,2);
});
test('current workspace selects its own project rather than an unrelated active project',async t=>{
 const {root,vault}=fixture(t),b=new Fake(),workspace=path.join(root,'my-app');fs.mkdirSync(workspace);await begin(vault,'Other idea',options(b));
 let result=await begin(vault,undefined,options(b,{workspace}));assert.equal(result.project,'my-app');assert.match(b.read(projectPath('my-app','Status')),/my-app; branch not selected/);
 await begin(vault,'Another idea',options(b));result=await begin(vault,undefined,options(b,{workspace}));assert.equal(result.project,'my-app');assert.equal(b.opened.at(-1),projectPath('my-app','Sketch.excalidraw'));
});
test('workspace binding keeps an explicit project name on later initiations',async t=>{
 const {root,vault}=fixture(t),b=new Fake(),workspace=path.join(root,'app');fs.mkdirSync(workspace);await begin(vault,'Reading room',options(b,{workspace}));assert.equal((await begin(vault,undefined,options(b,{workspace}))).project,'reading-room');
});
test('same-named workspaces do not silently share a project',async t=>{
 const {root,vault}=fixture(t),b=new Fake();const first=path.join(root,'one/app'),second=path.join(root,'two/app');fs.mkdirSync(first,{recursive:true});fs.mkdirSync(second,{recursive:true});const a=await begin(vault,undefined,options(b,{workspace:first}));const c=await begin(vault,undefined,options(b,{workspace:second}));assert.equal(a.project,'app');assert.notEqual(c.project,a.project);
});
test('a stopped app is started once before project creation and reveal',async t=>{
 const {vault}=fixture(t),b=new Fake();let ready=false,launches=0;b.doctor=()=>{if(!ready)throw unreachable();return {automation:true};};const result=await begin(vault,'Idea',options(b,{processState:()=> 'stopped',launchApp:()=>{launches++;ready=true;}}));assert.equal(launches,1);assert.equal(result.status,'opened');assert.equal(b.sketchCount,2);
});
test('a running app with sandbox IPC failure is not searched for or relaunched',async t=>{
 const {vault}=fixture(t),b=new Fake();let launches=0,reveals=0;b.doctor=()=>{throw unreachable();};await assert.rejects(begin(vault,'Idea',options(b,{processState:()=> 'running',launchApp:()=>launches++,reveal:()=>reveals++})),e=>e.code==='OBSIDIAN_APP_UNREACHABLE'&&e.processState==='running');assert.equal(launches,0);assert.equal(reveals,0);assert.equal(b.docs.size,0);
});
test('unobservable app state in a sandbox asks for the same-command retry',async t=>{
 const {vault}=fixture(t),b=new Fake(),restricted={...discovery,sandbox:{hint:true}};b.doctor=()=>{throw unreachable(restricted);};let launched=false;await assert.rejects(begin(vault,'Idea',options(b,{discovery:restricted,processState:()=> 'unknown',launchApp:()=>{launched=true;}})),e=>e.code==='OBSIDIAN_APP_UNREACHABLE'&&e.processState==='unknown');assert.equal(launched,false);assert.equal(b.docs.size,0);
});
test('a closed registered vault is opened before creating the project',async t=>{
 const {vault}=fixture(t),b=new Fake(),revealed=[];let opened=false;b.doctor=()=>{if(!opened)throw new ObsidianCLIError('OBSIDIAN_VAULT_UNAVAILABLE','not open',discovery,[]);return {automation:true};};const result=await begin(vault,'Idea',options(b,{reveal:(_,v,p)=>{revealed.push(p);opened=true;}}));assert.equal(result.status,'opened');assert.deepEqual(revealed,['Home.md','Projects/idea/Sketch.excalidraw.md']);
});
test('missing Excalidraw reports setup instead of claiming an opened sketch',async t=>{
 const {vault}=fixture(t),b=new Fake();b.doctor=()=>({automation:false});let revealed=false;await assert.rejects(begin(vault,'Idea',options(b,{reveal:()=>{revealed=true;}})),e=>e.code==='OBSIDIAN_EXCALIDRAW_UNAVAILABLE');assert.equal(revealed,false);assert.equal(b.docs.size,0);
});
test('a reveal failure leaves a reusable project and does not report success',async t=>{
 const {vault}=fixture(t),b=new Fake();await assert.rejects(begin(vault,'Idea',options(b,{reveal:()=>{throw Error('reveal failed');}})),/reveal failed/);assert.ok(b.docs.has('Projects/idea/Blueprint.md'));await begin(vault,'Idea',options(b));assert.equal(b.sketchCount,2);
});
test('a normal diagnostic probe never starts an application',async()=>{
 let launches=0;await assert.rejects(connect({doctor:()=>{throw unreachable();}},discovery,{launchApp:()=>launches++}),/unreachable/);assert.equal(launches,0);
});
