# tkflow

An Obsidian-first workflow plugin for Codex, Claude Code, OpenCode, and Pi.
Sketch an idea, refine a blueprint that records why, then build and verify one
observable behavior at a time.

## Prerequisites

- [Obsidian desktop](https://obsidian.md/) with its official CLI enabled.
- The Excalidraw community plugin installed and enabled in your dedicated tkflow vault.
- Node.js 22+ and Git.
- Codex, Claude Code, OpenCode 2.x, or Pi with an existing model setup.
- Git credentials that can read this private repository.

See [Obsidian setup](#obsidian-setup) for vault initialization and setup checks.
There is no Python installer, Python runtime, or separate helper installation.

## Install as a plugin

### Codex

```sh
codex plugin marketplace add 10ego/tkflow
codex plugin add tkflow@tkflow-plugins
```

Start a new session and invoke `$tkflow` or select the tkflow plugin/skills from the
command menu. The plugin bundles the workflow and all six mode skills.

### Claude Code

```sh
claude plugin marketplace add 10ego/tkflow
claude plugin install tkflow@tkflow-plugins
```

Start a new session. Plugin skills use Claude's namespace, for example
`/tkflow:tkflow`, `/tkflow:tkflow-blueprint`, and `/tkflow:tkflow-build`.

### OpenCode 2.x

```sh
opencode plugin add git+ssh://git@github.com/10ego/tkflow.git
```

This uses OpenCode's plugin manager to install and configure the package, preserving
other plugins. Its native server adapter registers the seven commands below. The
package pins its OpenCode SDK dependency; it does not change permissions or providers.

### Pi

```sh
pi install git:github.com/10ego/tkflow
```

Use `/reload` in an existing session. The package loads a native extension that
registers the seven commands, plus the shared workflow skill.

## Commands

| Command | Behavior |
| --- | --- |
| `/tkflow` | Start or resume the active project |
| `/tkflow-start My idea` | Open a new or existing project sketch |
| `/tkflow-blueprint` | Inspect the saved drawing and draft an intent-rich blueprint |
| `/tkflow-refine` | Refine the blueprint and decision log |
| `/tkflow-build` | Build the next ready vertical slice |
| `/tkflow-status` | Brief Works / Try / Left / Deviations / Provisional |
| `/tkflow-verify` | Audit continuation with a fresh agent |

Claude prefixes these skill names with `tkflow:`; Codex also accepts explicit
`$tkflow-*` skill invocation. `/tkflow blueprint` and other mode arguments remain
supported by the shared workflow.

## Obsidian setup

Install a recent Obsidian desktop app and enable its official CLI. Excalidraw must
be installed and enabled in the dedicated vault. The default vault is
`~/Documents/tkflow`; override it with `TKFLOW_VAULT` or the helper's `--vault` option.

Ask the plugin to check setup. It runs its bundled helper through
`node <plugin-root>/skills/tkflow/scripts/run.mjs doctor`.

For a new vault, the helper supports `init`, `register`, and `setup-plugin`.
`init` refuses an unrelated nonempty folder. On macOS, `register` adds only the new
vault entry to Obsidian's local registry and backs up the original configuration.
It does not restart Obsidian. `setup-plugin` checks that community plugins have
already been enabled with explicit approval before installing Excalidraw.

Each live request validates the actual vault path and uses the official Obsidian CLI.
CLI failures are reported; they never trigger a silent fallback to disk note writes.
Derived captures, previews, and temporary handoff packets are local artifacts.

## Project record

`tkflow` is the vault itself. Actual projects live directly under `Projects/`:

```text
tkflow/
  Home.md
  Projects/my-idea/
    Sketch.excalidraw.md
    Blueprint.md
    Decisions.md
    Status.md
    Evidence/
    Preview/blueprint.html
  System/                 # toolkit reference and verification records
  Examples/               # clearly labeled demonstrations
```

The blueprint records purpose, provenance, why, scope, promises, ranked tiebreakers,
behavior IDs, acceptance examples, vertical slices, and unknowns. Markdown is
canonical; HTML is a generated reading view.

Before asking you a question, the agent searches the spec and log, then applies
intent and tiebreakers to supported reversible choices and logs them provisionally.
It asks about costly new product commitments or unresolved material contradictions,
using observable behavior rather than code details. Silence does not approve an
irreversible action.

Each milestone ends in a behavior you can try, acceptance evidence, a short briefing,
and a checkpoint commit. A fresh-agent audit initially uses only Blueprint,
Decisions, and Status. Missing context is repaired in the notes. If the host cannot
launch an independent context, the plugin provides a packet and reports the audit
pending. Packet generation alone is not verification.

## Bundled helper

The host resolves the helper from the installed plugin, so it works from the native
plugin cache without a checkout or a global command. For local development:

```sh
node skills/tkflow/scripts/run.mjs --help
node skills/tkflow/scripts/run.mjs doctor
node skills/tkflow/scripts/run.mjs start "My idea"
node skills/tkflow/scripts/run.mjs capture
node skills/tkflow/scripts/run.mjs preview --open
node skills/tkflow/scripts/run.mjs handoff
```

Reading a note returns a SHA-256 revision token. A write requires that token:

```sh
node skills/tkflow/scripts/run.mjs read --note Blueprint
node skills/tkflow/scripts/run.mjs write --note Blueprint --from /absolute/proposal.md --expect TOKEN
```

Stale writes are rejected, including changes between the initial read and the final
`Vault.process()` callback. Reread and merge before retrying. Protection applies to
saved content; save editor and drawing changes before refinement or capture.

## Development

```sh
npm ci --ignore-scripts
npm test
claude plugin validate .
```

The shared runtime uses only Node built-ins. Only the OpenCode adapter imports its
pinned SDK. Tests exercise project lifecycle, saved-edit conflicts, path boundaries,
source-independent plugin execution, handoff snapshots, adapter registration, and
argument/attachment forwarding. See [verification](docs/verification.md) for native
host proof and explicit limits.

Host plugin managers own installation, updates, and removal. Updating the plugin
never updates or deletes vault notes. This package is not published to npm or a
public plugin directory; native installation uses the private Git repository.

## Migration from the initial Python version

Install the native plugin first. Old manually installed `tkflow*` skills and prompt
files can shadow the plugin or cause duplicates. Remove only links recorded in
`~/.local/share/tkflow/install.json` that still point at its recorded tkflow release;
leave unrelated commands, modified files, and the vault intact. The old runtime
snapshots can remain as inactive rollback copies. New plugin commands use the
bundled Node helper, not the old `~/.local/bin/tkflow` link.

Sources: [Codex packaging](https://developers.openai.com/plugins/build/plugins),
[Claude plugin reference](https://code.claude.com/docs/en/plugins-reference),
[OpenCode plugins](https://opencode.ai/docs/plugins/),
[OpenCode server commands](https://opencode.ai/docs/build/plugins/server/),
[Pi packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md),
[Obsidian CLI](https://obsidian.md/help/cli), and
[safe note updates](https://docs.obsidian.md/Plugins/Vault).
