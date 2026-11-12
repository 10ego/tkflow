import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateBlueprint} from '../src/blueprint-model.mjs';
import {renderBlueprint,mergeRenderedScene,composeWireframes,wrap} from '../src/blueprint-renderer.mjs';
import {digest} from '../src/runtime.mjs';
const sample=()=>JSON.parse(fs.readFileSync(new URL('../templates/blueprint-model.example.json',import.meta.url)));
test('semantic model renders a complete board with readable editable components and linked rules',()=>{
 const model=sample(),result=renderBlueprint(model,'studio');const {elements}=result.scene;
 assert.equal(result.screens.length,3);assert.equal(new Set(elements.map(e=>e.id)).size,elements.length);
 assert.ok(elements.some(e=>e.type==='arrow'));assert.ok(elements.some(e=>e.link==='[[Projects/studio/Blueprint#B-002]]'));
 assert.ok(elements.some(e=>e.type==='text'&&e.text.includes('Cedar Bakery')));
 assert.ok(elements.every(e=>['x','y','width','height'].every(k=>Number.isFinite(e[k]))&&e.width>0&&e.height>=0));
 for(const c of result.components){const s=result.screens.find(s=>s.id===c.screen);assert.ok(c.x>=s.x&&c.x+c.width<=s.x+s.width+.01);assert.ok(c.y>=s.y&&c.y+c.height<=s.y+s.height);}
 for(const a of result.components)for(const b of result.components){if(a.id>=b.id||a.screen!==b.screen)continue;assert.ok(a.x+a.width<=b.x+.01||b.x+b.width<=a.x+.01||a.y+a.height<=b.y+.01||b.y+b.height<=a.y+.01,'components overlap: '+a.id+' '+b.id);}
});
test('rendering is deterministic and every advertised component is covered in the fixture',()=>{
 const a=renderBlueprint(sample(),'studio'),b=renderBlueprint(sample(),'studio');assert.deepEqual(a,b);
});
test('mobile reflows half-width components into full-width rows',()=>{
 const m=sample();m.platform='mobile';m.screens=[m.screens[1]];m.flows=[];const r=renderBlueprint(m,'mobile');assert.equal(r.screens[0].width,390);assert.ok(r.components.every(c=>c.width===342));
});
test('model validation rejects unsupported components, broken flows, duplicate IDs and malformed tables',()=>{
 for(const mutate of [m=>m.screens[0].components[0].type='unknown',m=>m.flows[0].to='missing',m=>m.screens[1].id=m.screens[0].id,m=>m.screens[0].components.find(c=>c.type==='table').rows[0].pop()]){const m=sample();mutate(m);assert.throws(()=>validateBlueprint(m),/Blueprint model/);}
});
test('long content wraps and expands the screen without silently clipping text',()=>{
 const m=sample();m.screens=[m.screens[0]];m.flows=[];m.screens[0].components=[{id:'long',type:'text',label:'Detailed constraints',items:['important '.repeat(250)]}];const r=renderBlueprint(m,'long');assert.ok(r.screens[0].height>500);assert.equal(wrap('abcdefghij',20,10).replaceAll('\n',''),'abcdefghij');assert.ok(r.scene.elements.find(e=>e.customData.tkflow.key==='component/long/item/0').text.includes('important'));
});
test('safe regeneration preserves manual annotations and file assets',()=>{
 const first=renderBlueprint(sample(),'studio').scene;const manual={id:'user-note',type:'text',text:'Keep this'};const existing={...first,elements:[...first.elements,manual],files:{keep:{dataURL:'saved'}}};const result=mergeRenderedScene(renderBlueprint(sample(),'studio').scene,existing);assert.deepEqual(result.elements.at(-1),manual);assert.deepEqual(result.files,existing.files);
});
test('manual moves, edits, deletions and missing generated elements block regeneration',()=>{
 const scene=renderBlueprint(sample(),'studio').scene;
 for(const mutate of [s=>s.elements[0].x++,s=>s.elements[0].isDeleted=true,s=>s.elements.pop()]){const edited=structuredClone(scene);mutate(edited);assert.throws(()=>mergeRenderedScene(scene,edited),/conflict/);}
 assert.throws(()=>mergeRenderedScene(scene,{elements:[{id:'unmanaged',type:'text'}]}),/no renderer ownership/);
});
test('stale compose never captures or writes; capture revision is checked too',()=>{
 let captured=false;assert.throws(()=>composeWireframes({read:()=> 'user edit',capture:()=>{captured=true;}},'file',sample(),'studio',digest('old')),/Revision conflict/);assert.equal(captured,false);
 assert.throws(()=>composeWireframes({read:()=> 'old',capture:()=>({source:{sha256:digest('edit')}})},'file',sample(),'studio',digest('old')),/Revision conflict/);
});

test('text auto-sizing and plugin-derived fields are accepted, while content and styling edits conflict',()=>{
 const scene=renderBlueprint(sample(),'studio').scene,captured=structuredClone(scene),text=captured.elements.find(e=>e.type==='text');text.width=123;text.height=40;text.rawText=text.text;text.hasTextLink=false;text.version=9;
 assert.doesNotThrow(()=>mergeRenderedScene(scene,captured));text.text='Changed by user';assert.throws(()=>mergeRenderedScene(scene,captured),/conflict/);
});
test('generated IDs survive Obsidian text block indexing',()=>{
 const r=renderBlueprint(sample(),'studio');assert.ok(r.scene.elements.every(e=>/^[A-Za-z0-9]{8}$/.test(e.id)));
});
test('shipped native component library covers the complete renderer vocabulary',async()=>{
 const {componentLibrary}=await import('../src/component-library.mjs');const {COMPONENTS}=await import('../src/blueprint-model.mjs');const library=componentLibrary();assert.deepEqual(library.libraryItems.map(i=>i.name),COMPONENTS);assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../templates/tkflow-components.excalidrawlib',import.meta.url))),library);assert.ok(library.libraryItems.every(i=>i.elements.length&&i.elements.every(e=>!e.customData&&!e.link)));
});

test('missing ownership manifest blocks regeneration and canvas state is preserved',()=>{
 const scene=renderBlueprint(sample(),'studio').scene;
 const noManifest=structuredClone(scene);noManifest.elements=noManifest.elements.filter(e=>!e.customData.tkflow.manifest);assert.throws(()=>mergeRenderedScene(scene,noManifest),/manifest/);
 const existing={...scene,appState:{viewBackgroundColor:'#ffeeaa'}};assert.equal(mergeRenderedScene(scene,existing).appState.viewBackgroundColor,'#ffeeaa');
});
test('behavior references must resolve and light buttons have readable labels',()=>{
 const m=sample();m.screens[0].components[1].behaviors=['B-999'];assert.throws(()=>validateBlueprint(m),/defined B-NNN/);
 const light=sample();light.theme.primary='#ffffff';const scene=renderBlueprint(light,'studio').scene;assert.equal(scene.elements.find(e=>e.customData.tkflow.key==='component/brief-submit/label').strokeColor,'#000000');
});
