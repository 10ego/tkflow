import {COMPONENTS} from './blueprint-model.mjs';
import {renderBlueprint} from './blueprint-renderer.mjs';
export function componentLibrary() {
  const components=COMPONENTS.map(type=>({id:'library-'+type,type,label:({header:'Project overview',button:'Save changes',input:'Project name',empty:'No projects yet',loading:'Saving your changes…',error:'Could not save changes',dialog:'Approve this version?'})[type]||type[0].toUpperCase()+type.slice(1),
    ...(['button','input'].includes(type)?{}:{items:type==='table'?['Project','Status']:type==='nav'||type==='sidebar'?['Overview','Projects','Review']:['Cedar Bakery · Spring packaging','Northline Studio · Portfolio refresh']}),
    ...(type==='table'?{rows:[['Cedar Bakery','Ready for review'],['Northline Studio','Draft']]}:{})}));
  const model={version:1,title:'tkflow components',intent:'Reusable editable wireframe components. Replace example content with supported product behavior.',platform:'desktop',screens:[{id:'library',name:'Components',purpose:'Component examples',components}],flows:[],entities:[],rules:[],decisions:[]};
  const rendered=renderBlueprint(model,'component-library');
  return {type:'excalidrawlib',version:2,source:'tkflow',libraryItems:components.map(c=>{
    const bounds=rendered.components.find(b=>b.id===c.id);
    const elements=rendered.scene.elements.filter(e=>e.customData.tkflow.key.startsWith('component/'+c.id+'/')).map(e=>{
      const {customData,...element}=e;return {...element,x:e.x-bounds.x,y:e.y-bounds.y,link:null};
    });
    return {id:'tkflow-'+c.type,name:c.type,status:'unpublished',created:0,elements};
  })};
}
