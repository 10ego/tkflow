import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../src/runtime.mjs';
import { locateObsidian, requireCLI, connectionError, launchObsidian, revealProject, appProcessState } from '../src/obsidian-cli.mjs';
const mac = { platform:'darwin',home:'/home/ted',env:{PATH:'/bin:/tools'},directory:p=>p==='/Applications/Obsidian.app' };
const located = {status:'located',platform:'darwin',cli:{path:'/tools/obsidian',source:'PATH'},application:{path:'/Applications/Obsidian.app'},sandbox:{hint:true,indicators:['CODEX_SANDBOX']}};
test('explicit CLI override wins without falling back to another binary',()=>{
 const r=locateObsidian({...mac,env:{PATH:'/tools',TKFLOW_OBSIDIAN_CLI:'/custom/cli'},executable:p=>['/custom/cli','/tools/obsidian'].includes(p)});assert.equal(r.cli.path,'/custom/cli');assert.equal(r.cli.source,'TKFLOW_OBSIDIAN_CLI');
 const bad=locateObsidian({...mac,env:{PATH:'/tools',TKFLOW_OBSIDIAN_CLI:'/missing/cli'},executable:p=>p==='/tools/obsidian'});assert.throws(()=>requireCLI(bad),e=>e.code==='OBSIDIAN_CLI_OVERRIDE_INVALID');
});
test('PATH is used before the bundled CLI',()=>{const r=locateObsidian({...mac,executable:p=>['/tools/obsidian','/Applications/Obsidian.app/Contents/MacOS/obsidian-cli'].includes(p)});assert.equal(r.cli.path,'/tools/obsidian');assert.equal(r.application.path,'/Applications/Obsidian.app');assert.equal(r.candidates,undefined);});
test('macOS system and user bundles work without PATH registration or app-name lookup',()=>{
 const system=locateObsidian({...mac,env:{},executable:p=>p==='/Applications/Obsidian.app/Contents/MacOS/obsidian-cli'});assert.equal(system.cli.source,'macOS app bundle');
 const user=locateObsidian({...mac,env:{},directory:p=>p==='/home/ted/Applications/Obsidian.app',executable:p=>p==='/home/ted/Applications/Obsidian.app/Contents/MacOS/obsidian-cli'});assert.equal(user.application.path,'/home/ted/Applications/Obsidian.app');assert.match(user.cli.path,/home\/ted\/Applications/);
});
test('Linux user CLI and Windows official redirector have bounded discovery paths',()=>{
 const linux=locateObsidian({platform:'linux',home:'/home/ted',env:{},executable:p=>p==='/home/ted/.local/bin/obsidian'});assert.equal(linux.cli.path,'/home/ted/.local/bin/obsidian');
 const windows=locateObsidian({platform:'win32',home:'C:\\Users\\ted',env:{LOCALAPPDATA:'C:\\Users\\ted\\AppData\\Local'},executable:p=>p==='C:\\Users\\ted\\AppData\\Local\\Programs\\Obsidian\\Obsidian.com'});assert.ok(windows.cli.path.endsWith('Obsidian.com'));
});
test('app IPC failure retains the found CLI and directs the same-command retry',()=>{
 const e=connectionError({stdout:'The CLI is unable to find Obsidian. Please make sure Obsidian is running and try again.'},located);assert.equal(e.code,'OBSIDIAN_APP_UNREACHABLE');assert.equal(e.toJSON().discovery.cli.path,'/tools/obsidian');assert.match(e.actions[0],/EXACT same/);assert.match(e.message,/cannot distinguish/);assert.doesNotMatch(e.message,/not installed/);
});
test('failed commands do not disclose eval payloads embedded in exception messages',()=>{const e=connectionError({message:'Command failed: eval code=PRIVATE NOTE'},located);assert.ok(!JSON.stringify(e.toJSON()).includes('PRIVATE NOTE'));});
test('CLI permission, timeout, disabled, and vault errors remain distinct',()=>{
 assert.equal(connectionError({code:'EPERM'},located).code,'OBSIDIAN_CLI_PERMISSION_DENIED');assert.equal(connectionError({code:'ETIMEDOUT'},located).code,'OBSIDIAN_CLI_TIMEOUT');assert.equal(connectionError({stdout:'Vault not found.'},located).code,'OBSIDIAN_VAULT_UNAVAILABLE');assert.equal(connectionError({stderr:'Command line interface is not enabled'},located).code,'OBSIDIAN_CLI_DISABLED');
});
test('startup uses the absolute app bundle and project reveal targets the exact vault/file',()=>{
 const calls=[];const execute=(binary,args)=>calls.push({binary,args});launchObsidian(located,execute);assert.deepEqual(calls[0],{binary:'/usr/bin/open',args:['-g','-a','/Applications/Obsidian.app']});
 revealProject(located,'/notes/tkflow','Projects/my-idea/Sketch.excalidraw.md',execute);assert.deepEqual(calls[1],{binary:'/usr/bin/open',args:['-a','/Applications/Obsidian.app','obsidian://open?vault=tkflow&file=Projects%2Fmy-idea%2FSketch.excalidraw.md']});
});
test('process visibility does not turn a denied probe into a stopped app',()=>{
 assert.equal(appProcessState(located,()=> '123'),'running');assert.equal(appProcessState(located,()=>{throw {status:1,stderr:''};}),'stopped');assert.equal(appProcessState(located,()=>{throw {status:1,stderr:'Operation not permitted'};}),'unknown');
});
test('locate works without a vault or app IPC; doctor emits a single structured failure', {skip:process.platform==='win32'},t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tkflow-discovery-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const cli=path.join(dir,'obsidian');
 fs.writeFileSync(cli,'#!/bin/sh\nprintf "The CLI is unable to find Obsidian.\\n" >&2\nexit 1\n',{mode:0o755});const runner=path.join(ROOT,'skills/tkflow/scripts/run.mjs');const env={...process.env,TKFLOW_OBSIDIAN_CLI:cli};
 const locate=spawnSync(process.execPath,[runner,'locate','--vault',path.join(dir,'missing-vault')],{env,encoding:'utf8'});assert.equal(locate.status,0);assert.equal(JSON.parse(locate.stdout).cli.path,cli);assert.equal(locate.stderr,'');
 const vault=path.join(dir,'vault');fs.mkdirSync(vault);const doctor=spawnSync(process.execPath,[runner,'doctor','--vault',vault],{env,encoding:'utf8'});assert.equal(doctor.status,1);const error=JSON.parse(doctor.stderr);assert.equal(error.code,'OBSIDIAN_APP_UNREACHABLE');assert.equal(error.discovery.cli.path,cli);assert.equal(doctor.stdout,'');
});
