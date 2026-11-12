#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { Obsidian, defaultVault, initVault, registerVault, activeProject, projectPath, digest, saveArtifact, handoff, checkpoint, NOTES } from './runtime.mjs';
import { saveWireframes } from './wireframes.mjs';
import { renderHTML } from './preview.mjs';
import { locateObsidian, requireCLI, ObsidianCLIError } from './obsidian-cli.mjs';
import { begin, connect } from './startup.mjs';
export function reportError(error) { console.error(error instanceof ObsidianCLIError ? JSON.stringify(error.toJSON(), null, 2) : 'tkflow: ' + error.message); process.exitCode = 1; }
export async function main(argv = process.argv.slice(2)) {
  const { values: args, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    vault: { type:'string' }, workspace:{type:'string'}, project:{type:'string'}, note:{type:'string',default:'Blueprint'}, from:{type:'string'}, expect:{type:'string'}, split:{type:'boolean'}, open:{type:'boolean'}, launch:{type:'boolean'}, message:{type:'string'}, help:{type:'boolean',short:'h'},
  }});
  const [command, ...rest] = positionals;
  if (args.help || !command) { console.log('tkflow plugin helper\n\nCommands: begin [name], locate, init, register, doctor [--launch], setup-plugin, start [name], read, write, open, capture, wireframe, preview, handoff, checkpoint\nOptions: --vault PATH --workspace PATH --project NAME --note Blueprint|Decisions|Status|Sketch.excalidraw|Wireframes.excalidraw --from FILE --expect SHA256 --split --open --message TEXT\nbegin connects, creates or resumes a project, and opens its sketch in Obsidian. start is an alias.\nlocate discovers the CLI without app IPC. doctor reports connection errors with a bounded recovery path.\nInstall the workflow through your host plugin manager; no standalone installer is required.'); return; }
  const supported = ['begin','locate','init','register','doctor','setup-plugin','start','read','write','open','capture','wireframe','preview','handoff','checkpoint'];
  if (!supported.includes(command)) throw Error('Unknown command: ' + command);
  let vault = args.vault || process.env.TKFLOW_VAULT || defaultVault();
  if (vault.startsWith('~/')) vault = path.join(os.homedir(), vault.slice(2));
  vault = path.resolve(vault);
  if (args.launch && command !== 'doctor') throw Error('--launch is supported only with doctor.');
  if (command === 'locate') {
    const discovery = locateObsidian();
    console.log(JSON.stringify({ ...discovery, vault: { path: vault, name: path.basename(vault), exists: fs.existsSync(vault) } }, null, 2));
    requireCLI(discovery); return;
  }
  if (command === 'init') { console.log('Vault ready: ' + initVault(vault)); return; }
  if (command === 'register') { console.log(registerVault(vault)); return; }
  if (command === 'begin' || command === 'start') {
    console.log(JSON.stringify(await begin(vault, rest.join(' ') || undefined, { workspace: args.workspace }), null, 2)); return;
  }
  const discovery = locateObsidian();
  requireCLI(discovery);
  if (!fs.existsSync(vault)) throw new ObsidianCLIError('OBSIDIAN_VAULT_MISSING', 'The configured tkflow vault folder does not exist.', discovery, ['Initialize the dedicated vault explicitly with init, then register it if needed.']);
  const bridge = new Obsidian(vault, execFileSync, { discovery });
  if (command === 'doctor') {
    const info = await connect(bridge, discovery, { launch: args.launch });
    console.log(JSON.stringify({ status: 'ready', ...info, cli: discovery.cli, application: discovery.application, sandbox: discovery.sandbox }, null, 2)); return;
  }
  if (command === 'setup-plugin') {
    let info = bridge.doctor();
    if (!info.communityPluginsEnabled) throw Error('Community plugins are disabled. Obtain explicit approval before enabling them in this vault; tkflow will not change restricted mode automatically.');
    if (!info.excalidraw) console.log(bridge.run('plugin:install','id=obsidian-excalidraw-plugin','enable'));
    for (let i=0;i<10;i++) { info = bridge.doctor(); if (info.automation) break; await setTimeout(500); }
    if (!info.automation) throw Error('Excalidraw automation is not ready; check the dedicated vault plugin state.');
    console.log(JSON.stringify(info,null,2)); return;
  }
  const project = activeProject(vault,args.project);
  if (['read','write','open'].includes(command)) {
    if (![...NOTES,'Sketch.excalidraw','Wireframes.excalidraw'].includes(args.note)) throw Error('Choose Blueprint, Decisions, Status, Sketch.excalidraw, or Wireframes.excalidraw.');
    const file = projectPath(project,args.note);
    if (command === 'read') { const content=bridge.read(file); console.log('SHA256: ' + digest(content)); process.stdout.write(content); }
    if (command === 'open') console.log(bridge.open(file,args.split));
    if (command === 'write') {
      if (args.note.endsWith('.excalidraw')) throw Error('Preserve the original sketch. Use wireframe with scene JSON and --expect to refine Wireframes.excalidraw.');
      if (!args.from || !args.expect) throw Error('write requires --from FILE and --expect SHA256.');
      const content=fs.readFileSync(args.from,'utf8');bridge.replace(file,content,args.expect);console.log('Saved. SHA256: ' + digest(content));
    }
  } else if (command === 'wireframe') {
    if (!args.from || !args.expect) throw Error('wireframe requires --from scene.json and --expect SHA256 from read --note Wireframes.excalidraw.');
    const revision=saveWireframes(bridge,projectPath(project,'Wireframes.excalidraw'),JSON.parse(fs.readFileSync(args.from,'utf8')),args.expect);
    console.log('Saved wireframes. SHA256: '+revision);
    if(args.open) bridge.open(projectPath(project,'Wireframes.excalidraw'));
  } else if (command === 'capture') {
    const drawing=args.note==='Blueprint'?'Sketch.excalidraw':args.note;
    if (!['Sketch.excalidraw','Wireframes.excalidraw'].includes(drawing)) throw Error('capture supports Sketch.excalidraw or Wireframes.excalidraw.');
    const result=bridge.capture(projectPath(project,drawing));
    result.scene.elements=result.scene.elements.filter(e=>!e.isDeleted);result.scene.tkflowSource=result.source;
    const base=`Projects/${project}/Evidence/${drawing.split('.')[0].toLowerCase()}-${Date.now()}-${randomUUID().slice(0,6)}`;
    const scene=saveArtifact(vault,base+'.json',JSON.stringify(result.scene,null,2));
    const svg=saveArtifact(vault,base+'.svg',result.svg);
    const encoded=result.png.split(',').at(-1);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw Error('Invalid PNG response.');
    const visual=saveArtifact(vault,base+'.png',Buffer.from(encoded,'base64'));
    console.log(JSON.stringify({scene,visual,svg,elements:result.scene.elements.length,texts:result.scene.elements.filter(e=>e.type==='text').map(e=>({id:e.id,text:e.text,x:e.x,y:e.y})),note:'Read saved scene AND inspect visual. Unsaved drawing edits are not captured.'},null,2));
  } else if (command === 'preview') {
    const content=bridge.read(projectPath(project,'Blueprint'));
    const file=saveArtifact(vault,`Projects/${project}/Preview/blueprint.html`,renderHTML(content,project,path.basename(vault)));
    console.log(file);if(args.open) execFileSync(process.platform==='darwin'?'open':'xdg-open',[file]);
  } else if (command === 'handoff') { console.log(handoff(vault,bridge,project));console.log('Give a fresh agent only Prompt.md and the three notes. Audit has NOT run yet.'); }
  else if (command === 'checkpoint') console.log(checkpoint(vault,project,args.message));
}
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) main().catch(reportError);
