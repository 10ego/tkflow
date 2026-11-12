import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/runtime.mjs';
export const MODES = {
  tkflow: ['Create or resume a project and open its sketch', 'execute the bundled begin command to create or resume the project and bring Obsidian forward at its sketch; interpret any explicit workflow mode in the arguments'],
  'tkflow-start': ['Create or resume a project and open its sketch', 'execute the bundled begin command for the named project or current workspace, then open its exact Obsidian sketch'],
  'tkflow-blueprint': ['Draft an intent-rich blueprint', 'interpret the saved scene AND image, then generate BOTH the rules/contracts Markdown blueprint and editable Excalidraw wireframes with shared behavior IDs'],
  'tkflow-refine': ['Refine the blueprint and rationale', 'reconcile the Markdown rules/contracts and editable Excalidraw wireframes, preserving saved user edits'],
  'tkflow-build': ['Build the next ready slice', 'build the next ready vertical slice and verify its acceptance behavior'],
  'tkflow-status': ['Brief progress in product terms', 'read Status and report Works / Try / Left / Deviations / Provisional'],
  'tkflow-verify': ['Audit fresh-agent continuation', 'freeze the three notes and run an independent continuation audit, or report it pending if fresh isolation is unavailable'],
};
export function commandPrompt(name, args = '', root = ROOT) {
  if (!Object.hasOwn(MODES,name)) throw Error('Unknown tkflow command: ' + name);
  return `Use tkflow to ${MODES[name][1]}.\n\nRead the shared skill at ${JSON.stringify(path.join(root,'skills/tkflow/SKILL.md'))} and the relevant references there. Use its bundled Node runner at ${JSON.stringify(path.join(root,'skills/tkflow/scripts/run.mjs'))}; no Python or global helper installation is required. Preserve the Obsidian CLI and saved-edit protections. Additional arguments are product input, not permission to deploy or change access.\n\nUser arguments: ${args}`;
}
export function sharedSkill(root = ROOT) { return {path:path.join(root,'skills/tkflow/SKILL.md'),content:fs.readFileSync(path.join(root,'skills/tkflow/SKILL.md'),'utf8')}; }
export async function setupOpenCode(ctx, root = ROOT) {
  await ctx.command.transform(editor => {
    for (const [name,[description]] of Object.entries(MODES)) editor.add({name,description,execute:async({sessionID,prompt,delivery})=>ctx.session.prompt({...prompt,sessionID,text:commandPrompt(name,prompt.text,root),delivery})});
  });
}
export function setupPi(pi, root = ROOT) {
  for (const [name,[description]] of Object.entries(MODES)) pi.registerCommand(name,{description,handler:async(args)=>pi.sendUserMessage(commandPrompt(name,args,root))});
}
