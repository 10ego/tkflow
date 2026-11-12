import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScene,wireframeDocument,saveWireframes} from '../src/wireframes.mjs';
import {digest} from '../src/runtime.mjs';
const current='---\nexcalidraw-plugin: parsed\n---\nUser notes stay.\n## Text Elements\nOld ^old\n\n## Embedded Files\nasset: [[keep.png]]\n\n%%\n## Drawing\n```compressed-json\nold-data\n```\n%%';
const scene={elements:[{id:'b001',type:'text',x:20,y:30,width:300,height:25,text:'B-001 — $& saved',link:'[[Projects/app/Blueprint#B-001]]'}]};
test('generated wireframe stays editable and preserves notes, links and embedded references',()=>{
 const text=wireframeDocument(scene,current);assert.ok(text.includes('User notes stay.'));assert.ok(text.includes('asset: [[keep.png]]'));assert.ok(text.includes('B-001 — $& saved ^b001'));assert.ok(!text.includes('old-data'));
 const saved=JSON.parse(/```json\n([\s\S]*?)\n```/.exec(text)[1]);assert.equal(saved.elements[0].type,'text');assert.equal(saved.elements[0].link,scene.elements[0].link);assert.equal(saved.elements[0].fontSize,20);
});
test('refinement preserves captured element metadata and files',()=>{
 const full={...scene,elements:[{...scene.elements[0],version:17,customData:{user:'keep'},isDeleted:true}],files:{image:{dataURL:'data:image/png;base64,test'}},appState:{viewBackgroundColor:'#aaa'}};const result=normalizeScene(full);assert.equal(result.elements[0].version,17);assert.deepEqual(result.elements[0].customData,{user:'keep'});assert.deepEqual(result.files,full.files);assert.equal(result.appState.viewBackgroundColor,'#aaa');
});
test('stale wireframe revisions are refused without writing',()=>{
 let written=false;assert.throws(()=>saveWireframes({read:()=>current+'edit',replace:()=>{written=true;}},'Wireframes.excalidraw.md',scene,digest(current)),/Revision conflict/);assert.equal(written,false);
});
test('wireframe saves use the guarded bridge replacement',()=>{
 let saved;saveWireframes({read:()=>current,replace:(file,text,expected)=>{assert.equal(expected,digest(current));saved=text;}},'Wireframes.excalidraw.md',scene,digest(current));assert.ok(saved.includes('```json'));
});
test('invalid scenes and unsupported drawing formats preserve existing content',()=>{
 assert.throws(()=>normalizeScene({elements:[scene.elements[0],scene.elements[0]]}),/unique/);assert.throws(()=>normalizeScene({elements:[{...scene.elements[0],x:NaN}]}),/finite/);assert.throws(()=>wireframeDocument(scene,'User note'),/Unsupported/);
});
