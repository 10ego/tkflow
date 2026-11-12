---
name: tkflow
description: Sketch, refine intent-rich blueprints, build vertical slices, and verify fresh-agent continuation in the dedicated tkflow Obsidian vault. Use for /tkflow, $tkflow, or an explicit tkflow project request.
---
# tkflow

The durable project record must let a fresh agent continue without this conversation.
This workflow ships inside the tkflow plugin. Resolve this skill's directory from
the host's advertised skill path, then use `node <this-skill-directory>/scripts/run.mjs`
as the runner for every helper command below. References to `tkflow doctor`,
`tkflow read`, etc. mean that runner followed by the command; no global helper
installation is required. Node.js 22+ is required. Default vault: `~/Documents/tkflow`.
For initiation, execute `begin` as described below; it performs connection checks.
Use `locate` for filesystem-only CLI discovery and `doctor` for read-only diagnostics.
All live operations explicitly target and validate that vault through Obsidian CLI.
Do not operate on the user's other vaults. Do not silently replace CLI failures with disk writes.
`tkflow` is already the vault. Save each actual project directly under
`Projects/<project>/`, never inside an extra tkflow project folder. Toolkit reference
records belong in `System/` and demonstrations in `Examples/`.

## Start or resume

- On `/tkflow` or the start command, **execute** `tkflow begin "project name"` using
  the bundled runner. Without a name, `begin` resumes the active project or creates
  a new idea. Do not stop after checking setup or merely describe these steps.
- When initiating for the repository/workspace the user is working in, pass
  `--workspace /absolute/workspace/path`. This creates its corresponding project or
  resumes its saved binding instead of opening an unrelated last-used project.
- `begin` connects through the CLI, starts the known app bundle if it is stopped,
  creates the sketch and linked blueprint/decisions/status notes, and brings Obsidian
  forward at that exact vault and sketch. Notes and drawings are preserved on resume.
- Only after `begin` returns `status: opened`, tell the user where to draw. Read the
  three notes on resume to identify the next step. Do not claim the sketch opened
  when the command failed.
- Do not invent a blueprint from an empty sketch. Let the user draw. Use their
  conversation text as additional stated input when available.

## CLI connection recovery

- `locate` resolves `TKFLOW_OBSIDIAN_CLI`, PATH, and standard app-bundle CLI paths.
  It does not need app IPC. Treat its exact executable path as installation evidence.
- `OBSIDIAN_APP_UNREACHABLE` with a found executable is a connection failure, not
  proof of a missing app. In a sandboxed host, retry the **same bundled begin/doctor
  command** through the host's normal approval mechanism outside the sandbox first.
- Do not fall back to GUI automation, Spotlight, `find`, app-name guessing, or note
  writes on disk. If the host cannot grant the needed access, provide the exact
  helper command to run in a normal terminal and report startup as pending.
- `begin` distinguishes a visible running process from a stopped or unobservable
  one. A stopped macOS app is started by its absolute bundle path through a terminal
  command. No automatic restart, permission changes, or sandbox disabling occur.
- First-time vault registration or Excalidraw setup may still be required. Follow
  the reported setup action; community-plugin/security changes require explicit
  approval. Once setup is complete, retry begin and open the project.

The command set also exposes `/tkflow-start`, `/tkflow-blueprint`, `/tkflow-refine`,
`/tkflow-build`, `/tkflow-status`, and `/tkflow-verify`. These select the corresponding
workflow below. Codex can explicitly invoke the same skills with `$tkflow-*`.
OpenCode and Pi use native commands to load this shared skill; Claude and Codex use
skills. Never assume that another host supports fresh subagents: if it cannot launch
an independent context, prepare the packet for a new session and report the audit pending.

## Blueprint and refine

Read [blueprint guidance](references/blueprint.md). Run `tkflow capture` to get
saved scene elements and PNG/SVG visuals. Inspect both; never treat text extraction
as understanding the drawing. Save source element IDs for claims made from it.
Inspect the exported PNG with the host's image viewer; do not claim visual review
based only on the scene JSON. Captures include the source path and revision hash.

Read notes with `tkflow read --note Blueprint` (also Decisions and Status).
The output includes the SHA-256 revision token. Write proposed content to a temporary
UTF-8 file, then use `tkflow write --note Blueprint --from /absolute/file --expect TOKEN`.
A conflict means reread and merge the user's edits; never retry with a fresh token
without reconciling them. Use the same protection for all three notes.
On **every /tkflow-blueprint**, produce BOTH the project-specific Markdown blueprint
AND editable `Wireframes.excalidraw.md`; do not stop at a blank drawing, an image,
or a promise to generate one. Follow [wireframe authoring](references/wireframes.md). Use its semantic model and
`compose` component renderer by default; individual coordinates are for deliberate
manual merges or unsupported custom components.
For older projects run `begin` first to add the missing drawing without replacing
saved notes. Capture/read existing wireframes before refinement. Preserve user
elements and notes, reconcile both representations with shared B-IDs, and record
the reviewed drawing hash and unresolved mismatches in Blueprint/Status. Open the
generated wireframe after saving. If visual inspection is unavailable, report that
verification pending; do not claim the drawing was reviewed.
Run `tkflow preview` after refinement to regenerate the optional HTML view.

## Build

Read [build and continuation guidance](references/build.md). Read the current three
notes and the target repository's AGENTS.md. Link the repository, branch, environment,
run/test commands, and preview location in Status before implementation.
Build only a ready slice whose blockers are resolved. Approval to build is not
approval to deploy, delete data, change permissions, or spend money.

Before asking a question: search Blueprint and Decisions; apply intent and ranked
tiebreakers; make supported reversible decisions provisionally and log them.
Ask only about a costly new product commitment or unresolved material contradiction.
Questions must describe user-observable consequences, include a recommendation and
its rationale, and distinguish a reversible default from a required answer.

At every milestone: verify acceptance scenarios against the real behavior, show how
the user can try it, update Status (about 150 words), record deviations and provisional
decisions, and make a single-line Conventional Commit without co-authors.

## Status and fresh verification

`/tkflow status`: read Status and report Works / Try / Left / Deviations / Provisional.
Do not present old evidence as current proof without checking its revision/environment.

`/tkflow verify`: run `tkflow handoff`. Start an independent agent with no inherited
conversation and ONLY the packet's Prompt.md, Blueprint.md, Decisions.md, Status.md.
The prompt asks it to identify the next behavior, resolve ambiguity using the record,
and report missing context. Do not send the expected answer or prior reasoning.
If delegation is unavailable, provide the packet and exact new-session instructions;
report the audit as not run. A packet alone is not verification.

Run this check at every completed milestone and before continuing after substantial
context loss. Fix documentation gaps in the canonical notes and repeat the audit
with a fresh agent. After the docs-only check, a continuation agent may access the
repository and environment named in Status to exercise the acceptance tests.
