# tkflow

Sketch an idea in Obsidian. Refine an intent-rich blueprint. Build one testable
behavior at a time, with enough recorded rationale for a fresh agent to continue.

## Installed entry points

- `/tkflow` in the Codex skill menu, or `$tkflow` in a prompt. Restart the agent
  session if the newly installed skill has not appeared yet.
- `tkflow` in your terminal. Run `tkflow --help` for local artifact tools.
- Dedicated vault: `~/Documents/tkflow`. Code: `~/workspace/tkflow`.

The agent skill performs blueprint reasoning and build coordination. The terminal
tool manages saved artifacts; it does not call a model or turn a sketch into a
blueprint by itself. No separate API key is required for the local tool.

## First use

```sh
tkflow doctor
tkflow start "My idea"
```

Draw in the opened Excalidraw note. Then ask your agent:

```text
/tkflow blueprint
/tkflow refine
/tkflow build
/tkflow status
/tkflow verify
```

These are modes of the agent skill, not terminal subcommands. The skill reads the
current project record, captures the saved sketch, and reasons about its meaning.
Markdown remains authoritative; the optional HTML view is regenerated.

## Local artifact tools

```sh
tkflow start                       # resume active sketch, or create a new idea
tkflow read --note Blueprint       # content plus SHA-256 revision token
tkflow read --note Decisions
tkflow read --note Status
tkflow open --note Blueprint --split
tkflow capture                     # saved scene JSON and PNG/SVG visuals in Evidence/
tkflow preview --open              # generated HTML reading view
tkflow handoff                     # frozen three-note packet for a fresh agent
tkflow checkpoint --message 'docs(project): record milestone evidence'
```

To update a note, write the proposed text to a temporary file, then:

```sh
tkflow write --note Blueprint --from /absolute/proposal.md --expect SHA256_FROM_READ
```

A stale revision is rejected. Reread and reconcile the user's changes before
retrying. Writes use Obsidian's `Vault.process()` for the final content comparison.
Protection applies to saved content; allow Obsidian to save current editor/drawing
changes before capture or refinement. The tool never edits the original sketch.

`--project name` selects a project explicitly. `--vault /absolute/vault` or
`TKFLOW_VAULT` selects another initialized tkflow vault. Every live request validates
the actual vault path, even if another vault has the same name.

## Setup on another Mac

Requires Python 3.10+, Git, a recent Obsidian installer with its official CLI enabled,
and Excalidraw. The bundled CLI is used if `obsidian` is absent from PATH. Override
its location with `TKFLOW_OBSIDIAN_CLI` when necessary.

```sh
python3 tkflow.py install
tkflow init
tkflow register
```

The official CLI does not expose vault creation/registration. `init` bootstraps a
new local vault, and `register` adds only its entry to macOS Obsidian configuration,
preserving existing entries and creating a backup. It never restarts Obsidian.
If the app was already running, save your work and restart it to load registration.
Then open the registered vault from the terminal:

```sh
open 'obsidian://open?vault=tkflow&file=Home'
tkflow doctor
```

Community plugins must be enabled for this dedicated vault before Excalidraw can
run. tkflow reports that condition and does not change restricted mode automatically.
After explicitly approving that setting change, use the official CLI:

```sh
obsidian vault=tkflow plugins:restrict off
tkflow setup-plugin
```

If `obsidian` is not on PATH, its macOS binary is
`/Applications/Obsidian.app/Contents/MacOS/obsidian-cli`. App communication may require
running outside an agent's shell sandbox; use the normal approval mechanism rather
than bypassing it or silently writing notes on disk.

## Project record

```text
Projects/my-idea/
  Sketch.excalidraw.md
  Blueprint.md
  Decisions.md
  Status.md
  Evidence/
  Preview/blueprint.html
```

Blueprints carry purpose, provenance, why, scope, promises, ranked tiebreakers,
behavior IDs, acceptance scenarios, vertical slices, and unknowns. Decisions retain
provisional choices and superseded rationale. Status gives a short current briefing
and the repository/environment instructions a fresh agent needs.

At every milestone, verify the real acceptance behavior, show the user how to try
it, record deviations and provisional decisions, checkpoint the work, and run a fresh
agent audit. A handoff packet contains only the three notes, generic audit prompt,
and revision hashes. Creating a packet is not an audit. A docs-only audit is not
implementation verification.

## Verification and limits

```sh
python3 -m unittest discover -s tests -v
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/tkflow
```

The skill validator requires PyYAML; install it into an isolated virtual environment
if your Python environment does not already provide it.

Tests cover the isolated lifecycle, conflict rejection, vault/path boundaries,
escaping, and frozen handoff behavior. Live app results are recorded separately in
the tkflow project's Evidence/ folder. The first version uses the agent host's skill
menu; it does not add an Obsidian chat panel, background watcher, or autonomous model
daemon. The HTML renderer supports the blueprint template's headings, paragraphs,
bullets, callouts, code, and Obsidian links, rather than all Markdown extensions.

Sources: [Obsidian CLI](https://obsidian.md/help/cli),
[safe note updates](https://docs.obsidian.md/Plugins/Vault),
[Excalidraw automation API](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/docs/API/ExcalidrawAutomate.d.ts),
[Codex skill invocation](https://learn.chatgpt.com/docs/reference/slash-commands).
