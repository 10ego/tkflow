import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/runtime.mjs';
import { MODES, commandPrompt, setupOpenCode, setupPi } from '../plugins/shared.mjs';
const json=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
test('Codex and Claude marketplaces resolve a versioned plugin root',()=>{
 const codex=json('.codex-plugin/plugin.json'),claude=json('.claude-plugin/plugin.json');assert.equal(codex.name,'tkflow');assert.equal(codex.version,json('package.json').version);assert.equal(claude.version,codex.version);assert.ok(fs.existsSync(path.join(ROOT,codex.skills,'tkflow/SKILL.md')));
 assert.equal(json('.agents/plugins/marketplace.json').plugins[0].source.path,'./');assert.equal(json('.claude-plugin/marketplace.json').plugins[0].source,'./');
});
test('OpenCode registers all commands and forwards attachments and delivery',async()=>{
 const definitions=[];const prompts=[];await setupOpenCode({command:{transform:async fn=>fn({add:d=>definitions.push(d)})},session:{prompt:async p=>prompts.push(p)}});
 assert.deepEqual(definitions.map(x=>x.name),Object.keys(MODES));const command=definitions.find(x=>x.name==='tkflow-blueprint');await command.execute({sessionID:'session',prompt:{text:'offline items',files:['drawing.png']},delivery:'queue'});
 assert.equal(prompts[0].sessionID,'session');assert.deepEqual(prompts[0].files,['drawing.png']);assert.equal(prompts[0].delivery,'queue');assert.match(prompts[0].text,/offline items/);assert.match(prompts[0].text,/run.mjs/);
});
test('Pi registers native extension commands and forwards the user input',async()=>{
 const definitions=new Map(),messages=[];setupPi({registerCommand:(name,spec)=>definitions.set(name,spec),sendUserMessage:async text=>messages.push(text)});assert.equal(definitions.size,7);await definitions.get('tkflow-status').handler('my project');assert.match(messages[0],/my project/);assert.match(messages[0],/Status/);
});
test('loading an adapter does not run Obsidian or alter the vault',async()=>{
 let calls=0;await setupOpenCode({command:{transform:async fn=>fn({add:()=>calls++})},session:{prompt:()=>{throw Error('no prompt during load');}}});assert.equal(calls,7);
 setupPi({registerCommand:()=>{},sendUserMessage:()=>{throw Error('no prompt during load');}});
});
test('packaged entry points do not depend on a global install or Python',()=>{
 const pkg=json('package.json');assert.deepEqual(pkg.pi.extensions,['./plugins/pi.mjs']);assert.ok(!pkg.pi.prompts);assert.equal(pkg.exports['.'],'./plugins/opencode.mjs');assert.match(commandPrompt('tkflow-build'),/bundled Node runner/);
 for(const name of Object.keys(MODES)){const text=fs.readFileSync(path.join(ROOT,'skills',name,'SKILL.md'),'utf8');assert.ok(!text.includes('run.py'));assert.ok(!text.includes('.local/share/tkflow/current'));}
});
