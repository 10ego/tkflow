// Semantic input, independent of Excalidraw geometry. Reject malformed input
// rather than silently dropping requirements or substituting generic components.
export const COMPONENTS = ['header','nav','sidebar','text','button','input','form','cards','list','table','stats','dialog','empty','loading','error','toggle'];
const fail = message => { throw Error('Blueprint model: ' + message); };
const object = (v,label) => { if (!v || typeof v!=='object' || Array.isArray(v)) fail(label+' must be an object.'); };
const text = (v,label) => { if (typeof v!=='string' || !v.trim() || v.length>4000) fail(label+' requires nonempty text (up to 4000 characters).'); };
const list = (v,label,max=100) => { if (!Array.isArray(v) || v.length>max) fail(label+' must be an array with at most '+max+' entries.'); };
const strings = (v,label) => { list(v,label);v.forEach(x=>text(x,label)); };
const id = (v,label) => { if (typeof v!=='string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(v)) fail(label+' needs a stable alphanumeric ID.'); };
export function validateBlueprint(model) {
  object(model,'root');if(model.version!==1)fail('version must be 1.');text(model.title,'title');text(model.intent,'intent');
  if(!['desktop','mobile'].includes(model.platform))fail('platform must be desktop or mobile.');
  const theme=model.theme || {};object(theme,'theme');
  for(const k of ['primary','accent','surface'])if(theme[k]!==undefined&&!/^#[0-9a-f]{6}$/i.test(theme[k]))fail('theme.'+k+' must be #RRGGBB.');
  if(theme.density!==undefined&&!['compact','comfortable','airy'].includes(theme.density))fail('theme.density is invalid.');
  if(theme.tone!==undefined)text(theme.tone,'theme.tone');
  for(const k of ['observations','assumptions'])if(model[k]!==undefined)strings(model[k],k);
  list(model.screens,'screens',12);if(!model.screens.length)fail('at least one supported screen is required.');
  list(model.rules,'rules');list(model.entities,'entities');list(model.decisions,'decisions');
  const screens=new Set(), rules=new Set(), componentIds=new Set();
  for(const r of model.rules){object(r,'rule');id(r.id,'rule.id');if(!/^B-\d+$/.test(r.id))fail('rule IDs must use shared B-NNN behavior IDs.');if(rules.has(r.id))fail('duplicate rule ID '+r.id);rules.add(r.id);text(r.text,'rule.text');text(r.why,'rule.why');if(!['access','data','behavior','feel'].includes(r.category))fail('rule.category is invalid.');if(!['must','should'].includes(r.strength))fail('rule.strength is invalid.');if(!['stated','inferred','provisional'].includes(r.provenance))fail('rule.provenance is required.');text(r.source,'rule.source');}
  for(const s of model.screens){object(s,'screen');id(s.id,'screen.id');if(screens.has(s.id))fail('duplicate screen ID '+s.id);screens.add(s.id);text(s.name,'screen.name');text(s.purpose,'screen.purpose');list(s.components,'screen.components',40);if(!s.components.length)fail(s.id+' needs components.');let nav=0,side=0;
    for(const c of s.components){object(c,'component');id(c.id,'component.id');if(componentIds.has(c.id))fail('duplicate component ID '+c.id);componentIds.add(c.id);if(!COMPONENTS.includes(c.type))fail('unknown component type '+c.type);text(c.label,'component.label');if(c.width!==undefined&&!['full','half','third'].includes(c.width))fail('component.width is invalid.');if(c.items!==undefined)strings(c.items,'component.items');if(c.rows!==undefined){list(c.rows,'component.rows');c.rows.forEach(row=>strings(row,'table row'));if(c.type!=='table')fail('rows are supported only for tables.');if(!c.items?.length||c.rows.some(row=>row.length!==c.items.length))fail('table rows must match the column count.');}if(c.type==='table'&&!c.items?.length)fail('tables need column names.');if(c.behaviors!==undefined){strings(c.behaviors,'component.behaviors');for(const b of c.behaviors)if(!/^B-\d+$/.test(b)||!rules.has(b))fail('component behavior '+b+' must reference a defined B-NNN rule.');}if(c.type==='nav')nav++;if(c.type==='sidebar')side++;}
    if(nav>1||side>1)fail(s.id+' can have at most one nav and sidebar.');if(model.platform==='mobile'&&side)fail('mobile screens use nav rather than a desktop sidebar.');
  }
  const edgeIds=new Set();list(model.flows,'flows');
  for(const f of model.flows){object(f,'flow');id(f.id,'flow.id');if(edgeIds.has(f.id))fail('duplicate flow ID '+f.id);edgeIds.add(f.id);if(!screens.has(f.from)||!screens.has(f.to))fail('flow references an unknown screen.');if(f.from===f.to)fail('same-screen transitions should be represented as states, not self-loop flows.');text(f.trigger,'flow.trigger');}
  const unique=new Set();for(const e of model.entities){object(e,'entity');id(e.id,'entity.id');if(unique.has(e.id))fail('duplicate entity ID '+e.id);unique.add(e.id);text(e.name,'entity.name');strings(e.fields,'entity.fields');if(e.why!==undefined)text(e.why,'entity.why');}
  unique.clear();for(const d of model.decisions){object(d,'decision');id(d.id,'decision.id');if(unique.has(d.id))fail('duplicate decision ID '+d.id);unique.add(d.id);text(d.question,'decision.question');strings(d.options,'decision.options');if(d.options.length<2)fail('decisions need at least two options.');text(d.recommendation,'decision.recommendation');}
  return model;
}
