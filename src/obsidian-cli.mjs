import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

function executable(file) {
  try { return fs.statSync(file).isFile() && (fs.accessSync(file, fs.constants.X_OK), true); }
  catch { return false; }
}
function directory(file) { try { return fs.statSync(file).isDirectory(); } catch { return false; } }

// Filesystem-only discovery: no app launch, process/Spotlight query, shell, or IPC.
export function locateObsidian(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const home = options.home || os.homedir();
  const canExecute = options.executable || executable;
  const isDirectory = options.directory || directory;
  const join = platform === 'win32' ? path.win32.join : path.join;
  const candidates = [];
  const add = (file, source) => { if (file && !candidates.some(c => c.path === file)) candidates.push({ path: file, source }); };
  const fromPath = (name, source) => {
    for (const dir of (env.PATH || '').split(platform === 'win32' ? ';' : ':').filter(Boolean)) {
      const extensions = platform === 'win32' && !path.win32.extname(name) ? ['', '.com', '.exe', '.cmd'] : [''];
      for (const extension of extensions) add(join(dir, name + extension), source);
    }
  };
  const appPaths = platform === 'darwin' ? ['/Applications/Obsidian.app', join(home, 'Applications/Obsidian.app')] : [];
  const appPath = appPaths.find(isDirectory) || null;
  if (env.TKFLOW_OBSIDIAN_CLI) {
    const value = env.TKFLOW_OBSIDIAN_CLI.replace(/^~(?=[/\\])/, home);
    if (value.includes('/') || value.includes('\\')) add(value, 'TKFLOW_OBSIDIAN_CLI');
    else fromPath(value, 'TKFLOW_OBSIDIAN_CLI');
  } else {
    fromPath('obsidian', 'PATH');
    if (platform === 'darwin') for (const app of appPaths) add(join(app, 'Contents/MacOS/obsidian-cli'), 'macOS app bundle');
    if (platform === 'linux') add(join(home, '.local/bin/obsidian'), 'user CLI');
    if (platform === 'win32') {
      if (env.LOCALAPPDATA) add(join(env.LOCALAPPDATA, 'Programs/Obsidian/Obsidian.com'), 'Windows app bundle');
      if (env.ProgramFiles) add(join(env.ProgramFiles, 'Obsidian/Obsidian.com'), 'Windows app bundle');
    }
  }
  const cli = candidates.find(c => canExecute(c.path)) || null;
  const indicators = ['CODEX_SANDBOX', 'CODEX_SANDBOX_NETWORK_DISABLED', 'APP_SANDBOX_CONTAINER_ID']
    .filter(key => env[key] && !['0', 'false', 'none', 'danger-full-access'].includes(env[key]));
  return {
    status: cli ? 'located' : 'missing', platform,
    cli, application: appPath ? { path: appPath } : null,
    sandbox: { hint: indicators.length > 0, indicators },
    ...(cli ? {} : { candidates: candidates.map(c => ({ ...c, executable: canExecute(c.path) })) }),
    override: Boolean(env.TKFLOW_OBSIDIAN_CLI),
  };
}

export class ObsidianCLIError extends Error {
  constructor(code, message, discovery, actions) {
    super(message); this.code = code; this.discovery = discovery; this.actions = actions;
  }
  toJSON() { return { status: 'error', code: this.code, message: this.message, discovery: this.discovery, ...(this.processState ? { processState: this.processState } : {}), actions: this.actions }; }
}
export function requireCLI(discovery) {
  if (discovery.cli) return discovery.cli.path;
  throw new ObsidianCLIError(discovery.override ? 'OBSIDIAN_CLI_OVERRIDE_INVALID' : 'OBSIDIAN_CLI_MISSING',
    discovery.override ? 'TKFLOW_OBSIDIAN_CLI does not resolve to an executable. No other binary was substituted.' : 'The official Obsidian CLI was not found in PATH or the standard installation locations.', discovery,
    ['Enable and register the official CLI in Obsidian Settings → General → Command line interface.', 'For a nonstandard installation, set TKFLOW_OBSIDIAN_CLI to the absolute CLI executable path, then rerun locate.']);
}
export function connectionError(error, discovery) {
  // execFileSync errors can include the entire eval payload in .message. Never print it.
  const diagnostic = [error.stdout, error.stderr].filter(Boolean).map(v => v.toString().trim()).filter(Boolean).join('\n').slice(0, 1500);
  if (/unable to find Obsidian|Obsidian (?:is not|must be) running|connect.*running Obsidian/i.test(diagnostic)) {
    return new ObsidianCLIError('OBSIDIAN_APP_UNREACHABLE',
      'The CLI executable was found, but it cannot reach the Obsidian desktop process. This error alone cannot distinguish a stopped app from sandbox/IPC restrictions.', discovery,
      ['If this is a sandboxed agent shell, retry the EXACT same helper command through the host’s normal approval mechanism outside the sandbox. Do not infer that Obsidian is missing.',
       discovery.application ? 'Only if the unrestricted retry also cannot connect, run the same bundled helper with doctor --launch. It starts the known absolute app bundle through a terminal command, then retries the CLI.' : 'If an unrestricted retry also cannot connect, start Obsidian normally, then retry the same CLI helper.',
       'Do not use GUI automation, Spotlight, recursive application searches, or app-name guessing to recover this CLI error.']);
  }
  if (/Vault not found|vault.*(?:not found|unavailable)/i.test(diagnostic)) return new ObsidianCLIError('OBSIDIAN_VAULT_UNAVAILABLE', 'The CLI is available, but the requested vault is not open or registered.', discovery, ['Check the configured tkflow vault path; use its explicit init/register setup if required. Do not select another vault.']);
  if (/command.line interface.*(?:disabled|not enabled)|CLI.*not enabled/i.test(diagnostic)) return new ObsidianCLIError('OBSIDIAN_CLI_DISABLED', 'The official CLI is installed but not enabled.', discovery, ['Enable Command line interface in Obsidian’s first-time setup, then retry doctor.']);
  const code = error.code === 'ETIMEDOUT' ? 'OBSIDIAN_CLI_TIMEOUT' : ['EACCES', 'EPERM'].includes(error.code) ? 'OBSIDIAN_CLI_PERMISSION_DENIED' : error.code === 'ENOENT' ? 'OBSIDIAN_CLI_MISSING' : 'OBSIDIAN_CLI_FAILED';
  return new ObsidianCLIError(code, diagnostic || `Obsidian CLI execution failed (${error.code || error.status || 'unknown status'}).`, discovery,
    ['Use locate to inspect the selected executable. Retry through normal host approval if the shell restricts execution or IPC. Preserve the vault and report any remaining failure.']);
}
export function launchObsidian(discovery, execute = execFileSync) {
  if (discovery.platform !== 'darwin' || !discovery.application) throw new ObsidianCLIError('OBSIDIAN_LAUNCH_UNAVAILABLE', 'No supported absolute app bundle is available for terminal startup.', discovery, ['Start the desktop process normally, then rerun doctor.']);
  try { execute('/usr/bin/open', ['-g', '-a', discovery.application.path], { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { throw new ObsidianCLIError('OBSIDIAN_LAUNCH_FAILED', `Terminal startup of ${discovery.application.path} failed (${error.code || error.status || 'unknown status'}).`, discovery, ['Retry doctor through normal host approval outside the sandbox; do not switch to desktop automation or app-name discovery.']); }
}

export function appProcessState(discovery, execute = execFileSync) {
  if (discovery.platform !== 'darwin') return 'unknown';
  try { execute('/usr/bin/pgrep', ['-x', 'Obsidian'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe'] }); return 'running'; }
  catch (error) { return error.status === 1 && !error.stderr?.toString().trim() ? 'stopped' : 'unknown'; }
}

export function revealProject(discovery, vault, sketch, execute = execFileSync) {
  const uri = `obsidian://open?vault=${encodeURIComponent(path.basename(vault))}&file=${encodeURIComponent(sketch)}`;
  const binary = discovery.platform === 'darwin' ? '/usr/bin/open' : discovery.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
  const args = discovery.platform === 'darwin' && discovery.application ? ['-a', discovery.application.path, uri] : [uri];
  try { execute(binary, args, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw new ObsidianCLIError('OBSIDIAN_PROJECT_REVEAL_FAILED', `The project was prepared at ${sketch}, but its Obsidian window could not be brought forward.`, discovery, ['Retry the same begin command through normal host approval; the existing project and sketch will be reused.']); }
}
