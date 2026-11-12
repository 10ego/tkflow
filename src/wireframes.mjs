import { randomInt } from 'node:crypto';
import { digest } from './runtime.mjs';

// Accept model-authored scene JSON; fill standard element defaults for concise
// new elements while preserving all fields in captured scenes on refinement.
export function normalizeScene(scene) {
  if (!scene || !Array.isArray(scene.elements)) throw Error('Wireframe input requires an elements array.');
  const ids = new Set();
  const elements = scene.elements.map(element => {
    if (!element || !/^[a-zA-Z0-9_-]+$/.test(element.id || '') || ids.has(element.id)) throw Error('Every element needs a unique alphanumeric id (hyphens/underscores allowed).');
    ids.add(element.id);
    if (typeof element.type !== 'string' || !['x','y','width','height'].every(k => Number.isFinite(element[k]))) throw Error('Each element requires type and finite x/y/width/height.');
    if (element.type === 'text' && typeof element.text !== 'string') throw Error('Text elements require text.');
    const defaults = { angle:0, strokeColor:'#1e1e1e',backgroundColor:'transparent',fillStyle:'solid',strokeWidth:1,strokeStyle:'solid',roughness:0,opacity:100,groupIds:[],frameId:null,roundness:null,seed:randomInt(1,2147483647),version:1,versionNonce:randomInt(1,2147483647),isDeleted:false,boundElements:null,updated:Date.now(),link:null,locked:false };
    if (element.type === 'text') Object.assign(defaults,{fontSize:20,fontFamily:1,textAlign:'left',verticalAlign:'top',containerId:null,originalText:element.text,autoResize:true,lineHeight:1.25});
    if (['arrow','line'].includes(element.type)) Object.assign(defaults,{points:[[0,0],[element.width,element.height]],lastCommittedPoint:null,startBinding:null,endBinding:null,startArrowhead:null,endArrowhead:element.type==='arrow'?'arrow':null});
    return {...defaults,...element};
  });
  return {type:'excalidraw',version:2,source:'tkflow',...scene,elements,appState:scene.appState || {viewBackgroundColor:'#ffffff'},files:scene.files || {}};
}
export function wireframeDocument(scene, current) {
  const normalized = normalizeScene(scene);
  const drawing = /(^## Drawing\s*\n)```(?:compressed-json|json)\s*\n[\s\S]*?\n```/m;
  if (!drawing.test(current) || !/^## Text Elements\s*$/m.test(current)) throw Error('Unsupported drawing format; preserve the file and use Obsidian to inspect it.');
  const text = normalized.elements.filter(e=>e.type==='text'&&!e.isDeleted).map(e=>`${e.text} ^${e.id}\n`).join('\n');
  // Callback replacements keep dollar signs in user labels literal. Keep other
  // Markdown sections (including embedded-file references) and frontmatter intact.
  return current.replace(drawing,(_,heading)=>heading+'```json\n'+JSON.stringify(normalized,null,2)+'\n```')
    .replace(/(^## Text Elements\s*\n)[\s\S]*?(?=^## |^%%)/m,(_,heading)=>heading+'\n'+text+'\n');
}
export function saveWireframes(bridge, file, scene, expected) {
  const current=bridge.read(file);
  if (digest(current)!==expected) throw Error('Revision conflict: reread and merge the saved wireframe before writing.');
  const content=wireframeDocument(scene,current);
  bridge.replace(file,content,expected);
  return digest(content);
}
