# tkflow

Sketch an idea in Obsidian. Refine an intent-rich blueprint. Build one testable
behavior at a time, with enough recorded rationale for a fresh agent to continue.

## Install

Requires Python 3.10+ and Git. For the Obsidian workflow, also install Obsidian with
its official CLI enabled and the Excalidraw plugin in your tkflow vault.

```sh
gh repo clone tkkhq/tkflow
cd tkflow
python3 tkflow.py install --host all
```

Or install only selected hosts:

```sh
python3 tkflow.py install --host codex
python3 tkflow.py install --host claude
python3 tkflow.py install --host opencode
python3 tkflow.py install --host pi
# Multiple selections are supported:
python3 tkflow.py install --host codex --host claude
# Preview without writing:
python3 tkflow.py install --host all --dry-run
```

The default without `--host` remains Codex. The installer copies the runtime,
templates, shared skill, and command resources into a content-addressed release under
`~/.local/share/tkflow/releases/`, then installs host entry points and
`~/.local/bin/tkflow`. You can move or remove the checkout after installation.
Existing unrelated commands are never replaced. Conflicts are checked before any
host entry changes. Re-running the installer updates only tkflow-owned links.

| Host | Entry points | Installation location |
| --- | --- | --- |
| Codex | Skills, including explicit `$tkflow-*` invocation | `~/.codex/skills/tkflow*` |
| Claude Code | Skills exposed as slash commands | `~/.claude/skills/tkflow*` |
| OpenCode | Prompt commands plus shared skill | `~/.config/opencode/commands/` and `skills/tkflow/` |
| Pi | Prompt templates plus shared skill | `~/.pi/agent/prompts/` and `skills/tkflow/` |

`CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, and `PI_CODING_AGENT_DIR` are
respected. `--home /temporary/root` creates an isolated installation and ignores those
overrides; it is useful for testing. No host permission settings or credentials change.
Ensure `~/.local/bin` is on PATH to use `tkflow` from the terminal.

Start a new agent session after installation. In Pi, `/reload` also refreshes prompts.
The model uses your host's existing provider setup; tkflow does not need another API key.

## Commands

```text
/tkflow                    start or resume
/tkflow-start My idea       open a project sketch
/tkflow-blueprint           interpret the saved sketch and draft the blueprint
/tkflow-refine              refine the blueprint and decisions
/tkflow-build               build the next ready vertical slice
/tkflow-status              brief progress in observable behavior
/tkflow-verify              audit continuation with a fresh agent
```

`/tkflow blueprint`, `/tkflow refine`, and the other mode arguments remain supported.
These are agent commands, not terminal subcommands. The shared skill performs model
reasoning and build coordination; the terminal tool manages the saved artifacts.
Fresh-agent verification uses each host's available isolation mechanism. If a host
cannot launch a fresh context, tkflow provides the packet for a new session and marks
the audit pending instead of claiming that it ran.

## Native Pi package (alternative)

Pi can install this repository directly as a package:

```sh
pi install git:github.com/tkkhq/tkflow
```

Git must have access to the repository (it is initially private). Choose this route or
`install --host pi`, rather than registering the same commands twice. The package
manifest exposes the shared skill and all seven prompt templates. The skill includes
`scripts/run.py` to run its bundled helper when `tkflow` is not on PATH, so native Pi
installation does not require a second executable installation.

## First use

Your dedicated vault defaults to `~/Documents/tkflow`. Complete the one-time vault
setup below if needed, then:

```sh
tkflow doctor
tkflow start "My idea"
```

Draw and save in Obsidian, then invoke `/tkflow-blueprint` in your agent. Refine until
the first slice is ready, then `/tkflow-build`.

## Update

```sh
cd /path/to/tkflow
git pull --ff-only
python3 tkflow.py install --host all
```

For a native Pi package, use `pi update`. Installation never changes project notes;
the vault is separate from both this repository and the installed runtime.

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

On macOS, installation also exposes the bundled official CLI at
`~/.local/bin/obsidian` when no `obsidian` command is already available. Existing
commands and skill installations are never overwritten.

```sh
python3 tkflow.py install --host all
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

`tkflow` is the vault itself. Each actual project lives directly under its
`Projects/` folder; do not add another `tkflow` project layer.

```text
tkflow/                         # Obsidian vault
  Home.md
  Projects/
    my-idea/
      Sketch.excalidraw.md
      Blueprint.md
      Decisions.md
      Status.md
      Evidence/
      Preview/blueprint.html
  System/                       # toolkit setup and verification records
  Examples/                     # clearly labeled demonstrations
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
the vault's System/Evidence/ folder. The first version uses the agent host's skill
menu; it does not add an Obsidian chat panel, background watcher, or autonomous model
daemon. The HTML renderer supports the blueprint template's headings, paragraphs,
bullets, callouts, code, and Obsidian links, rather than all Markdown extensions.

Sources: [Obsidian CLI](https://obsidian.md/help/cli),
[safe note updates](https://docs.obsidian.md/Plugins/Vault),
[Excalidraw automation API](https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/docs/API/ExcalidrawAutomate.d.ts),
[Codex skill invocation](https://learn.chatgpt.com/docs/reference/slash-commands),
[Claude skills](https://code.claude.com/docs/en/skills),
[OpenCode commands](https://opencode.ai/docs/commands/),
[OpenCode skills](https://opencode.ai/docs/skills/),
[Pi packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md),
and [Pi prompt templates](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/prompt-templates.md).
