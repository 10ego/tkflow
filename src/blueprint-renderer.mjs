import {digest} from './runtime.mjs';
import {normalizeScene,saveWireframes} from './wireframes.mjs';
import {validateBlueprint} from './blueprint-model.mjs';

const INK='#243247',MUTED='#52647b',LINE='#b8c4d3';
const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const onColor=hex=>luminance(hex)>.179?'#000000':'#ffffff';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
// Compare visible/generated properties only; Excalidraw may update version/seed/index.
export function elementFingerprint(e){const {seed,version,versionNonce,updated,index,rawText,hasTextLink,customData,...visible}=e;if(e.type==='text'&&e.autoResize){delete visible.width;delete visible.height;}return digest(JSON.stringify(canonical({...visible,customData:customData?Object.fromEntries(Object.entries(customData).filter(([k])=>k!=='tkflow')):{}})));}
export function wrap(text,width,size){
  const limit=Math.max(1,Math.floor(width/(size*.66)));
  return String(text).split('\n').flatMap(paragraph=>{
    if(!paragraph)return [''];const lines=[];let line='';
    for(const word of paragraph.split(/\s+/)){if(line&&line.length+word.length+1>limit){lines.push(line);line='';}let rest=word;while(rest.length>limit){if(line){lines.push(line);line='';}lines.push(rest.slice(0,limit));rest=rest.slice(limit);}if(rest)line+=(line?' ':'')+rest;}
    if(line)lines.push(line);return lines;
  }).join('\n');
}
export function renderBlueprint(input,project) {
  const m=validateBlueprint(input);if(!/^[a-z0-9][a-z0-9-]*$/.test(project))throw Error('A project slug is required.');
  const theme={primary:'#315bc7',accent:'#a54b15',surface:'#f3f6fb',density:'comfortable',...m.theme};
  const gap={compact:12,comfortable:20,airy:28}[theme.density],pad=24,screenWidth=m.platform==='mobile'?390:960;
  const elements=[],screens=[],bounds=[];let activeScreen=null;
  const add=(key,type,x,y,width,height,extra={})=>{const el={id:'t'+digest(key).slice(0,7),type,x,y,width,height,strokeColor:INK,...extra,customData:{tkflow:{key,screen:activeScreen}}};elements.push(el);return el;};
  const box=(key,x,y,w,h,fill='#ffffff',extra={})=>add(key,'rectangle',x,y,w,h,{backgroundColor:fill,strokeColor:LINE,roundness:{type:3},...extra});
  const label=(key,text,x,y,w,size=16,color=INK,extra={})=>{const value=wrap(text,w,size),height=value.split('\n').length*size*1.25;add(key,'text',x,y,w,height,{text:value,originalText:value,fontFamily:3,fontSize:size,lineHeight:1.25,strokeColor:color,...extra});return height;};
  const component=(c,x,y,w)=>{
    const start=elements.length,key='component/'+c.id;
    const behaviors=c.behaviors?.length?' · '+c.behaviors.join(', '):'';
    const heading=c.label+behaviors,items=c.items||[];
    let h=pad;
    const tx=(suffix,text,size=16,color=INK)=>{h+=label(key+'/'+suffix,text,x+pad,y+h,w-pad*2,size,color)+12;};
    switch(c.type){
      case 'nav': tx('label',heading,14,MUTED); { const cw=(w-pad*2)/Math.max(items.length,1); let rh=0; items.forEach((v,i)=>{rh=Math.max(rh,label(key+'/item/'+i,v,x+pad+i*cw,y+h,cw-12,15,i===0?theme.primary:INK));}); h+=rh+12; } break;
      case 'sidebar': tx('label',heading,14,MUTED);items.forEach((v,i)=>tx('item/'+i,(i===0?'● ':'○ ')+v,15,i===0?theme.primary:INK));break;
      case 'header': tx('label',heading,24);items.forEach((v,i)=>tx('action/'+i,'[ '+v+' ]',15,theme.primary));break;
      case 'button': tx('label',heading,17,onColor(theme.primary));break;
      case 'input': tx('label',heading,15);box(key+'/field',x+pad,y+h,w-pad*2,42,theme.surface);h+=54;break;
      case 'form': tx('label',heading,18);items.forEach((v,i)=>{tx('field-label/'+i,v,14,MUTED);box(key+'/field/'+i,x+pad,y+h,w-pad*2,40,theme.surface);h+=52;});break;
      case 'table': {
        tx('label',heading,18);const cols=items.length,cw=(w-pad*2)/cols;if(cw<64)throw Error('Table '+c.id+' is too narrow; use full width or fewer columns.');
        const rows=[items,...(c.rows||[])];rows.forEach((row,ri)=>{const top=h;let rh=0;row.forEach((cell,ci)=>{rh=Math.max(rh,label(key+'/cell/'+ri+'/'+ci,cell,x+pad+ci*cw+8,y+top+10,cw-16,14,ri===0?MUTED:INK)+20);});box(key+'/row/'+ri,x+pad,y+top,w-pad*2,rh,ri===0?theme.surface:'#ffffff');h+=rh;});h+=12;break;
      }
      case 'cards':case 'list':case 'stats':case 'toggle':
        tx('label',heading,18);items.forEach((v,i)=>{const top=h;const rh=label(key+'/item/'+i,(c.type==='toggle'?'○  ':'')+v,x+pad+12,y+top+12,w-pad*2-24,16)+24;box(key+'/item-bg/'+i,x+pad,y+top,w-pad*2,rh,theme.surface);h+=rh+10;});break;
      case 'dialog':tx('label',heading,21);items.forEach((v,i)=>tx('item/'+i,v));break;
      case 'empty':case 'loading':case 'error':tx('state',c.type.toUpperCase(),12,c.type==='error'?'#a52e2e':MUTED);tx('label',heading,18);items.forEach((v,i)=>tx('item/'+i,v));break;
      default:tx('label',heading,18);items.forEach((v,i)=>tx('item/'+i,v));
    }
    h+=12;
    const bg=box(key+'/background',x,y,w,h,c.type==='button'?theme.primary:'#ffffff');
    // Backgrounds first so all labels/cells stay visible in Excalidraw's z-order.
    const local=elements.splice(start);const backgrounds=local.filter(e=>e.type==='rectangle'),foreground=local.filter(e=>e.type!=='rectangle');
    elements.push(bg,...backgrounds.filter(e=>e!==bg),...foreground);
    const group='group-'+digest(key).slice(0,16);
    for(const e of elements.slice(start)){e.groupIds=[group];if(c.behaviors?.length)e.link=`[[Projects/${project}/Blueprint#${c.behaviors[0]}]]`;}
    bounds.push({id:c.id,screen:activeScreen,x,y,width:w,height:h});return h;
  };
  // Intent panel: observations and visual choices stay beside the experience.
  box('intent/background',0,0,340,120,theme.surface);let iy=24;
  iy+=label('intent/title',m.title,24,iy,292,28)+18;
  iy+=label('intent/summary',m.intent,24,iy,292,17)+22;
  for(const [heading,values] of [['SOURCE OBSERVATIONS',m.observations||[]],['PROVISIONAL ASSUMPTIONS',m.assumptions||[]]]){
    if(!values.length)continue;iy+=label('intent/'+heading,heading,24,iy,292,13,MUTED)+10;
    values.forEach((v,i)=>{iy+=label('intent/'+heading+'/'+i,'• '+v,24,iy,292,15)+12;});iy+=12;
  }
  iy+=label('intent/feel','VISUAL DIRECTION\n'+(theme.tone||'Unspecified')+'\n'+theme.density+' spacing',24,iy,292,14,MUTED)+16;
  for(const [i,role] of ['primary','accent','surface'].entries()){box('intent/color/'+role,24,iy,24,24,theme[role]);iy+=label('intent/role/'+role,role+' '+theme[role],60,iy,256,14)+16;}
  elements.find(e=>e.customData.tkflow.key==='intent/background').height=iy+12;
  let maxHeight=0;
  m.screens.forEach((s,si)=>{
    activeScreen=s.id;const x=420+si*(screenWidth+140),y=120,start=elements.length;
    label('screen/'+s.id+'/name',`${si+1}. ${s.name}`,x,y-58,screenWidth,24);
    let sy=y+58;
    const nav=s.components.find(c=>c.type==='nav');if(nav)sy+=component(nav,x+pad,sy,screenWidth-pad*2)+gap;
    const side=s.components.find(c=>c.type==='sidebar'),sideWidth=side?200:0;
    const contentX=x+pad+(side?sideWidth+gap:0),contentWidth=screenWidth-pad*2-(side?sideWidth+gap:0);
    const sideHeight=side?component(side,x+pad,sy,sideWidth):0,bodyTop=sy;
    let col=0,rowHeight=0;
    for(const c of s.components.filter(c=>!['nav','sidebar'].includes(c.type))){
      const span=m.platform==='mobile'?6:({full:6,half:3,third:2}[c.width||'full']);
      if(col+span>6){sy+=rowHeight+gap;col=0;rowHeight=0;}
      const cw=span===6?contentWidth:span===3?(contentWidth-gap)/2:(contentWidth-gap*2)/3;
      const cx=contentX+col/6*(contentWidth+gap);
      rowHeight=Math.max(rowHeight,component(c,cx,sy,cw));col+=span;
      if(col===6){sy+=rowHeight+gap;col=0;rowHeight=0;}
    }
    if(col)sy+=rowHeight+gap;
    const height=Math.max(500,sy-y+pad,bodyTop-y+sideHeight+pad);
    const frame=box('screen/'+s.id+'/frame',x,y,screenWidth,height,theme.surface,{strokeColor:LINE});
    const chrome=box('screen/'+s.id+'/chrome',x+1,y+1,screenWidth-2,38,'#e4eaf3');
    label('screen/'+s.id+'/url',s.name+' · '+m.platform,x+20,y+10,screenWidth-40,14,MUTED);
    const local=elements.splice(start);elements.push(frame,chrome,...local.filter(e=>e!==frame&&e!==chrome));
    const purposeHeight=label('screen/'+s.id+'/purpose',s.purpose,x,y+height+20,screenWidth,17,MUTED);
    screens.push({id:s.id,x,y,width:screenWidth,height});maxHeight=Math.max(maxHeight,y+height+20+purposeHeight);
    activeScreen=null;
  });
  // Route all transitions above the screen row, leaving the UI unobstructed.
  m.flows.forEach((f,i)=>{
    const a=screens.find(s=>s.id===f.from),b=screens.find(s=>s.id===f.to),ax=a.x+a.width/2,bx=b.x+b.width/2,lane=-80-i*80;
    add('flow/'+f.id,'arrow',ax,54,Math.abs(bx-ax),54-lane,{points:[[0,0],[0,lane-54],[bx-ax,lane-54],[bx-ax,0]],endArrowhead:'arrow',strokeColor:theme.primary});
    label('flow/'+f.id+'/trigger',f.trigger,Math.min(ax,bx),lane-32,Math.max(240,Math.abs(bx-ax)),15,theme.primary);
  });
  const boardBottom=Math.max(maxHeight,iy)+100;let ex=420;
  label('entities/title','DATA & RELATIONSHIPS',ex,boardBottom,screenWidth,20,MUTED);
  m.entities.forEach(e=>{let ey=boardBottom+64;const start=ey;ey+=label('entity/'+e.id+'/name',e.name,ex+20,ey,260,20)+18;e.fields.forEach((f,i)=>{ey+=label('entity/'+e.id+'/field/'+i,f,ex+20,ey,260,15)+10;});if(e.why)ey+=label('entity/'+e.id+'/why',e.why,ex+20,ey,260,14,MUTED)+12;const bg=box('entity/'+e.id+'/background',ex,start-20,300,ey-start+40,theme.surface);elements.splice(elements.indexOf(bg),1);elements.unshift(bg);ex+=332;});
  const rx=420+m.screens.length*(screenWidth+140);let ry=0;
  label('rules/title','RULEBOOK & OPEN DECISIONS',rx,ry,440,24);ry+=64;
  m.decisions.forEach(d=>{ry+=label('decision/'+d.id+'/question',d.id+' · '+d.question,rx,ry,440,18)+12;d.options.forEach((o,i)=>{ry+=label('decision/'+d.id+'/option/'+i,String.fromCharCode(65+i)+') '+o,rx+16,ry,424,15)+8;});ry+=label('decision/'+d.id+'/recommendation','Recommended: '+d.recommendation,rx,ry,440,14,theme.accent)+28;});
  for(const category of ['access','data','behavior','feel']){const rules=m.rules.filter(r=>r.category===category);if(!rules.length)continue;ry+=label('rules/'+category,category.toUpperCase(),rx,ry,440,16,MUTED)+20;rules.forEach(r=>{ry+=label('rule/'+r.id,r.id+' · '+r.strength.toUpperCase()+' · '+r.text+'\nWhy: '+r.why+'\n'+r.provenance+' · '+r.source,rx,ry,440,15,INK,{link:`[[Projects/${project}/Blueprint#${r.id}]]`})+24;});}
  const scene=normalizeScene({elements,appState:{viewBackgroundColor:'#ffffff'},files:{}});
  const manifest=scene.elements.map(e=>e.id);
  if(new Set(manifest).size!==manifest.length)throw Error('Generated element ID collision; use distinct component IDs.');
  scene.elements.forEach(e=>{e.seed=parseInt(digest(e.id).slice(0,7),16);e.versionNonce=1;e.updated=0;e.customData.tkflow.fingerprint=elementFingerprint(e);});
  scene.elements.find(e=>e.customData.tkflow.key==='intent/title').customData.tkflow.manifest=manifest;
  return {scene,screens,components:bounds};
}
export function mergeRenderedScene(generated,existing) {
  const elements=existing.elements||[];
  const managed=elements.filter(e=>e.customData?.tkflow?.fingerprint);
  const manifest=managed.find(e=>e.customData.tkflow.manifest)?.customData.tkflow.manifest;
  if(managed.length&&!manifest)throw Error('Wireframe conflict: renderer ownership manifest is missing. Capture and merge manually.');
  if(manifest?.some(id=>!elements.some(e=>e.id===id)))throw Error('Wireframe conflict: generated elements were removed. Capture and merge the drawing manually with wireframe.');
  for(const e of managed)if(e.isDeleted||elementFingerprint(e)!==e.customData.tkflow.fingerprint)throw Error('Wireframe conflict: saved element '+e.id+' was edited. Capture and merge with wireframe; compose will not overwrite it.');
  const manual=elements.filter(e=>!e.customData?.tkflow?.fingerprint);
  const ids=new Set(generated.elements.map(e=>e.id));if(manual.some(e=>ids.has(e.id)))throw Error('Wireframe conflict: element ID collision.');
  if(!managed.length&&manual.some(e=>!e.isDeleted))throw Error('Existing wireframe has no renderer ownership record. Capture and merge it with wireframe instead of replacing it.');
  return {...existing,...generated,appState:{...generated.appState,...existing.appState},files:{...existing.files,...generated.files},elements:[...generated.elements,...manual]};
}
export function composeWireframes(bridge,file,model,project,expected) {
  const generated=renderBlueprint(model,project);
  if(digest(bridge.read(file))!==expected)throw Error('Revision conflict: reread and merge before composing.');
  const captured=bridge.capture(file);
  if(captured.source.sha256!==expected)throw Error('Revision conflict: drawing changed during compose.');
  const scene=mergeRenderedScene(generated.scene,captured.scene);
  return {revision:saveWireframes(bridge,file,scene,expected),screens:generated.screens,components:generated.components};
}
