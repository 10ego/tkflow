import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { Obsidian, initVault, start, projectPath, atomicWrite, digest, slugify } from './runtime.mjs';
import { locateObsidian, requireCLI, launchObsidian, appProcessState, revealProject, ObsidianCLIError } from './obsidian-cli.mjs';

export async function connect(bridge, discovery, options = {}) {
  const execute = options.execute || execFileSync;
  const wait = options.wait || setTimeout;
  try { return bridge.doctor(); }
  catch (error) {
    if (!options.launch || error.code !== 'OBSIDIAN_APP_UNREACHABLE') throw error;
    const state = (options.processState || appProcessState)(discovery, execute);
    error.processState = state;
    // A visible running process, or hidden process state inside a sandbox, is not
    // evidence that installation is missing or that another app launch is needed.
    if (state === 'running' || (state === 'unknown' && discovery.sandbox?.hint)) throw error;
    (options.launchApp || launchObsidian)(discovery, execute);
    for (let i = 0; i < 10; i++) {
      await wait(300);
      try { return bridge.doctor(); }
      catch (retry) { if (retry.code !== 'OBSIDIAN_APP_UNREACHABLE' || i === 9) throw retry; }
    }
  }
}

export async function begin(vault, name, options = {}) {
  const discovery = options.discovery || locateObsidian();
  requireCLI(discovery);
  // Vault bootstrap is distinct from live note writing. Existing non-tkflow folders
  // are never adopted; project notes and drawings are created only through the CLI.
  if (!fs.existsSync(path.join(vault, '.tkflow'))) initVault(vault);
  const bridge = options.bridge || new Obsidian(vault, options.execute || execFileSync, { discovery });
  let info;
  try { info = await connect(bridge, discovery, { ...options, launch: true }); }
  catch (error) {
    if (error.code !== 'OBSIDIAN_VAULT_UNAVAILABLE') throw error;
    (options.reveal || revealProject)(discovery, vault, 'Home.md', options.execute || execFileSync);
    for (let i = 0; i < 10; i++) {
      await (options.wait || setTimeout)(300);
      try { info = await connect(bridge, discovery, { ...options, launch: true }); break; }
      catch (retry) { if (retry.code !== 'OBSIDIAN_VAULT_UNAVAILABLE' || i === 9) throw retry; }
    }
  }
  if (!info.automation) throw new ObsidianCLIError('OBSIDIAN_EXCALIDRAW_UNAVAILABLE', 'The tkflow vault is connected, but Excalidraw is not ready to create the project sketch.', discovery,
    ['Complete the dedicated vault’s one-time Excalidraw setup. Enable community plugins only with explicit approval, then use setup-plugin.', 'Retry begin afterward; no existing project notes will be overwritten.']);
  let workspace, bindings, bindingsFile;
  if (options.workspace) {
    workspace = fs.realpathSync(path.resolve(options.workspace));
    bindingsFile = path.join(vault, '.tkflow/workspaces.json');
    bindings = fs.existsSync(bindingsFile) ? JSON.parse(fs.readFileSync(bindingsFile, 'utf8')) : {};
    if (!name) {
      name = bindings[workspace] || path.basename(workspace);
      if (!bindings[workspace] && Object.values(bindings).includes(slugify(name))) name += '-' + digest(workspace).slice(0, 8);
    }
  }
  const project = start(vault, bridge, name);
  const sketch = projectPath(project, 'Sketch.excalidraw');
  if (workspace) {
    const statusPath = projectPath(project, 'Status');
    const previous = bridge.read(statusPath);
    const updated = previous.replace('- Repository and branch: Not linked yet.', '- Repository/workspace: ' + workspace + '; branch not selected yet.');
    if (updated !== previous) bridge.replace(statusPath, updated, digest(previous));
  }
  (options.reveal || revealProject)(discovery, vault, sketch, options.execute || execFileSync);
  if (workspace) { bindings[workspace] = project; atomicWrite(bindingsFile, JSON.stringify(bindings, null, 2)); }
  return { status: 'opened', project, vault, sketch, ...(workspace ? { workspace } : {}), cli: discovery.cli };
}
