---
name: tkflow
description: Sketch, refine intent-rich blueprints, build vertical slices, and verify fresh-agent continuation in the dedicated tkflow Obsidian vault. Use for /tkflow, $tkflow, or an explicit tkflow project request.
---
# tkflow

The durable project record must let a fresh agent continue without this conversation.
Use the local tool at `~/.local/bin/tkflow`. Run `tkflow --help` for syntax and
`tkflow doctor` before the first live operation. Default vault: `~/Documents/tkflow`.
All live operations explicitly target and validate that vault through Obsidian CLI.
Do not operate on the user's other vaults. Do not silently replace CLI failures with disk writes.
`tkflow` is already the vault. Save each actual project directly under
`Projects/<project>/`, never inside an extra tkflow project folder. Toolkit reference
records belong in `System/` and demonstrations in `Examples/`.

## Start or resume

- `/tkflow` with no project resumes the active project; without one, create a uniquely
  named idea using `tkflow start`. With a project name, use `tkflow start "name"`.
- The tool creates a sketch and linked blueprint, decisions, and status notes, then
  opens the drawing. Resume reads the three notes before deciding the next action.
- Do not invent a blueprint from an empty sketch. Let the user draw. Use their
  conversation text as additional stated input when available.

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
