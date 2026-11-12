import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { locateObsidian, requireCLI, connectionError, ObsidianCLIError } from './obsidian-cli.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const NOTES = ['Blueprint', 'Decisions', 'Status'];
export const defaultVault = () => path.join(os.homedir(), 'Documents/tkflow');
export const digest = text => createHash('sha256').update(text, 'utf8').digest('hex');
export function slugify(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  if (!slug) throw Error('Use a project name containing letters or numbers.');
  return slug;
}
export function safePath(root, relative) {
  root = fs.realpathSync(root);
  const candidate = path.resolve(root, relative);
  const resolveLinks = (file, depth = 0) => {
    if (depth > 40) throw Error('Too many symbolic links.');
    const parsed = path.parse(file); const parts = file.slice(parsed.root.length).split(path.sep);
    let current = parsed.root;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      let stat;
      try { stat = fs.lstatSync(current); } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return path.join(current, ...parts.slice(i + 1));
      }
      if (stat.isSymbolicLink()) return resolveLinks(path.resolve(path.dirname(current), fs.readlinkSync(current), ...parts.slice(i + 1)), depth + 1);
    }
    return current;
  };
  const resolved = resolveLinks(candidate);
  if (resolved === root || !resolved.startsWith(root + path.sep)) throw Error('Path must stay within the tkflow vault.');
  return resolved;
}
export function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tkflow-' + randomUUID();
  try { fs.writeFileSync(temp, content, { flag: 'wx' }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export function saveArtifact(vault, relative, content) {
  const file = safePath(vault, relative); atomicWrite(file, content); return file;
}
const q = JSON.stringify;
export class Obsidian {
  constructor(vault, execute = execFileSync, options = {}) { this.vault = fs.realpathSync(vault); this.execute = execute; this.discovery = options.discovery; }
  run(...args) {
    this.discovery ||= locateObsidian();
    const binary = requireCLI(this.discovery);
    try {
      const output = this.execute(binary, [`vault=${path.basename(this.vault)}`, ...args], { encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (/^Vault not found\.?$/i.test(output)) throw connectionError({ stdout: output }, this.discovery);
      return output;
    } catch (error) { if (error instanceof ObsidianCLIError) throw error; throw connectionError(error, this.discovery); }
  }
  evaluate(body) {
    const code = `(async()=>{try{if(app.vault.adapter.basePath!==${q(this.vault)})throw Error("Wrong vault path; refusing operation");const value=await(async()=>{${body}})();return JSON.stringify({tkflow:true,ok:true,value});}catch(e){return JSON.stringify({tkflow:true,ok:false,error:String(e.message||e)});}})()`;
    const output = this.run('eval', `code=${code}`);
    const index = output.indexOf('{"tkflow":true,');
    if (index < 0) throw Error(`Unexpected Obsidian response: ${output.slice(0, 500)}`);
    let result;
    try { result = JSON.parse(output.slice(index)); } catch { throw Error('Obsidian returned an incomplete response.'); }
    if (!result.ok) throw Error(result.error);
    return result.value;
  }
  doctor() { return this.evaluate(`return {name:app.vault.getName(),path:app.vault.adapter.basePath,communityPluginsEnabled:app.plugins.isEnabled(),excalidraw:!!app.plugins.getPlugin("obsidian-excalidraw-plugin"),automation:typeof ExcalidrawAutomate!=="undefined"};`); }
  read(file) { return this.evaluate(`const f=app.vault.getFileByPath(${q(file)});if(!f)throw Error("Note not found: "+${q(file)});return await app.vault.read(f);`); }
  create(file, content) { return this.evaluate(`const file=${q(file)};const parts=file.split('/');parts.pop();let dir='';for(const p of parts){dir=dir?dir+'/'+p:p;if(!app.vault.getAbstractFileByPath(dir))await app.vault.createFolder(dir);}if(app.vault.getAbstractFileByPath(file))return false;await app.vault.create(file,${q(content)});return true;`); }
  replace(file, content, expected) {
    if (!/^[a-f0-9]{64}$/.test(expected || '')) throw Error('Expected revision must be the SHA-256 token from read.');
    const current = this.read(file);
    if (digest(current) !== expected) throw Error('Revision conflict: reread and merge user edits before writing.');
    return this.evaluate(`const f=app.vault.getFileByPath(${q(file)});if(!f)throw Error("Note disappeared");await app.vault.process(f,data=>{if(data!==${q(current)})throw Error("Revision conflict: note changed during write; reread and merge");return ${q(content)};});return true;`);
  }
  open(file, split = false) { return this.evaluate(`const f=app.vault.getFileByPath(${q(file)});if(!f)throw Error("File not found");const existing=app.workspace.getLeavesOfType('markdown').concat(app.workspace.getLeavesOfType('excalidraw')).find(l=>l.view.file?.path===f.path);if(existing){await app.workspace.revealLeaf(existing);return f.path;}await app.workspace.getLeaf(${q(split ? 'split' : 'tab')}).openFile(f);return f.path;`); }
  createSketch(file) { return this.evaluate(`const file=${q(file)};if(app.vault.getFileByPath(file))return file;if(typeof ExcalidrawAutomate==="undefined")throw Error("Enable Excalidraw in the tkflow vault first");const ea=new ExcalidrawAutomate.constructor(app.plugins.getPlugin("obsidian-excalidraw-plugin"));let created;try{created=await ea.create({exactPath:file,silent:true});}finally{ea.destroy();}if(created!==file)throw Error("Unexpected drawing path: "+created);return created;`); }
  capture(file) { return this.evaluate(`const f=app.vault.getFileByPath(${q(file)});if(!f)throw Error("Sketch not found");if(typeof ExcalidrawAutomate==="undefined")throw Error("Excalidraw automation unavailable");const ea=new ExcalidrawAutomate.constructor(app.plugins.getPlugin("obsidian-excalidraw-plugin"));try{const original=await app.vault.read(f);const scene=await ea.getSceneFromFile(f);const svg=await ea.createSVG(f.path);if(!svg)throw Error("SVG export failed");const png=await ea.createPNGBase64(f.path,1);if(await app.vault.read(f)!==original)throw Error("Sketch changed during capture; save edits and retry");const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(original));return {scene,svg:new XMLSerializer().serializeToString(svg),png,source:{path:f.path,sha256:Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''),capturedAt:new Date().toISOString()}};}finally{ea.destroy();}`); }
}
export function initVault(vault) {
  if (fs.existsSync(vault) && fs.readdirSync(vault).length && !fs.existsSync(path.join(vault, '.tkflow'))) throw Error('Refusing to initialize a nonempty folder that is not a tkflow vault.');
  for (const dir of ['.tkflow', '.obsidian/snippets', 'Projects']) fs.mkdirSync(path.join(vault, dir), { recursive: true });
  const files = {
    '.obsidian/app.json': JSON.stringify({ alwaysUpdateLinks: true }, null, 2),
    '.obsidian/appearance.json': JSON.stringify({ enabledCssSnippets: ['tkflow'] }, null, 2),
    '.obsidian/snippets/tkflow.css': fs.readFileSync(path.join(ROOT, 'templates/tkflow.css'), 'utf8'),
    '.gitignore': '.obsidian/workspace*.json\n.obsidian/cache\n.obsidian/plugins/*/main.js\n.obsidian/plugins/*/styles.css\n.tkflow/\n.DS_Store\n',
    'Home.md': '# tkflow\n\nSketch → blueprint → refine → build → verify.\n\nUse the tkflow plugin in your agent to start or resume.\n\n## Projects\n',
  };
  for (const [name, content] of Object.entries(files)) { const file = safePath(vault, name); if (!fs.existsSync(file)) fs.writeFileSync(file, content, { flag: 'wx' }); }
  return vault;
}
export function registerVault(vault, config) {
  if (!fs.existsSync(path.join(vault, '.tkflow'))) throw Error('Initialize the tkflow vault first.');
  if (!config) {
    if (process.platform !== 'darwin') throw Error('Automatic registration supports macOS; open the folder as a vault once.');
    config = path.join(os.homedir(), 'Library/Application Support/obsidian/obsidian.json');
  }
  const raw = fs.readFileSync(config, 'utf8'); const data = JSON.parse(raw);
  if (Object.values(data.vaults || {}).some(v => v.path === vault)) return 'Vault already registered.';
  const backup = config + '.tkflow-backup-' + randomUUID(); fs.writeFileSync(backup, raw, { flag: 'wx' });
  data.vaults ||= {}; data.vaults[digest(vault).slice(0, 16)] = { path: vault, ts: Date.now() };
  if (fs.readFileSync(config, 'utf8') !== raw) throw Error('Obsidian config changed; registration cancelled.');
  atomicWrite(config, JSON.stringify(data));
  return `Registered ${vault}. Backup: ${backup}. Save your edits and restart Obsidian yourself if needed; no restart was performed.`;
}
export function activeProject(vault, supplied) {
  if (supplied) return slugify(supplied);
  const file = path.join(vault, '.tkflow/active.json');
  if (!fs.existsSync(file)) throw Error('No active project. Start a named project first.');
  return slugify(JSON.parse(fs.readFileSync(file, 'utf8')).project);
}
export const projectPath = (project, note) => `Projects/${project}/${note}.md`;
export function start(vault, bridge, name, options = {}) {
  if (!fs.existsSync(path.join(vault, '.tkflow'))) throw Error('Initialize the tkflow vault first.');
  let slug = name && slugify(name);
  if (!slug) {
    if (fs.existsSync(path.join(vault, '.tkflow/active.json'))) slug = activeProject(vault);
    else { name = 'Idea ' + new Date().toISOString().replace(/[:.]/g, '-'); slug = slugify(name); }
  }
  const title = name || slug.replaceAll('-', ' ');
  if (!bridge.doctor().automation) throw Error('Excalidraw is unavailable. Complete the explicit plugin setup first.');
  for (const note of NOTES) {
    const template = fs.readFileSync(path.join(ROOT, 'templates', note + '.md'), 'utf8');
    bridge.create(projectPath(slug, note), template.replaceAll('{{title}}', title).replaceAll('{{slug}}', slug));
  }
  bridge.createSketch(projectPath(slug, 'Sketch.excalidraw'));
  bridge.createSketch(projectPath(slug, 'Wireframes.excalidraw'));
  bridge.create('Home.md', '# tkflow\n\n## Projects\n');
  const home = bridge.read('Home.md');
  if (!home.includes(`[[Projects/${slug}/Blueprint|`)) {
    const link = `- [[Projects/${slug}/Blueprint|${title}]]`;
    const section = /^## Projects[ \t]*$/m.exec(home);
    let updated;
    if (section) {
      const end = section.index + section[0].length;
      const next = /^## /m.exec(home.slice(end));
      const position = next ? end + next.index : home.length;
      updated = home.slice(0, position).trimEnd() + '\n\n' + link + '\n\n' + home.slice(position);
    } else updated = home.trimEnd() + '\n\n## Projects\n\n' + link + '\n';
    bridge.replace('Home.md', updated, digest(home));
  }
  atomicWrite(path.join(vault, '.tkflow/active.json'), JSON.stringify({ project: slug }, null, 2));
  if (options.open !== false) bridge.open(projectPath(slug, 'Sketch.excalidraw'));
  return slug;
}
export function handoff(vault, bridge, project) {
  const docs = Object.fromEntries(NOTES.map(n => [n, bridge.read(projectPath(project, n))]));
  if (NOTES.some(n => bridge.read(projectPath(project, n)) !== docs[n])) throw Error('Project changed while capturing handoff; retry after edits settle.');
  const packet = fs.mkdtempSync(path.join(os.tmpdir(), 'tkflow-handoff-'));
  for (const [name, text] of Object.entries(docs)) fs.writeFileSync(path.join(packet, name + '.md'), text);
  fs.writeFileSync(path.join(packet, 'Prompt.md'), fs.readFileSync(path.join(ROOT, 'templates/Handoff.md')));
  fs.writeFileSync(path.join(packet, 'manifest.json'), JSON.stringify({ project, sha256: Object.fromEntries(Object.entries(docs).map(([n, text]) => [n, digest(text)])) }, null, 2));
  return packet;
}
export function checkpoint(vault, project, message, execute = execFileSync) {
  if (!/^(feat|fix|docs|style|refactor|test|chore)(\([^\r\n]+\))?!?: [^\r\n]+$/.test(message || '')) throw Error('Use a single-line Conventional Commit message.');
  if (!fs.existsSync(path.join(vault, '.git'))) execute('git', ['init', '-b', 'main', vault]);
  execute('git', ['-C', vault, 'add', '--', `Projects/${project}`, '.gitignore', 'Home.md']);
  return execute('git', ['-C', vault, 'commit', '-m', message], { encoding: 'utf8' });
}
