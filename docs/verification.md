# Initial local verification

Verified on 2026-11-11 with Obsidian 1.15.0, Excalidraw 2.29.2, and Python 3.13.

- Isolated behavior suite: 14 tests passed. Covers resume preservation, stale-write
  rejection, vault/path guards, escaping, handoff snapshots, registration, installation, and direct project placement/navigation.
- Skill validator: passed using the isolated `.venv` with PyYAML 6.0.3.
- Official CLI: dedicated vault connected; start/resume and drawing view type verified.
- Drawing capture: blank and labeled examples exported as scene JSON, SVG, and PNG.
  The final capture's source SHA-256 matched the saved drawing. The labeled example
  was visually inspected and interpreted into a blueprint with provenance and unknowns.
- Live concurrency probes: both a stale token and a save between read and final
  `Vault.process()` rejected the proposal, preserving the intervening saved content.
- Native blueprint view: inspected from an official CLI screenshot beside Excalidraw.
- HTML view: inspected from Chrome's headless CLI screenshot in an isolated profile.
- Fresh continuation: an independent agent with no inherited conversation read only
  the frozen Blueprint, Decisions, and Status notes plus a generic prompt. It passed
  documentation continuity, resolved Markdown/HTML authority from D-002, and correctly
  identified that the next real project and its acceptance scenarios were not supplied.

Detailed source records and the cold audit are in the dedicated vault under
`System/Evidence/`. Actual projects live directly in `Projects/<project>/`; toolkit
records are in `System/`, and the agent-authored demonstration is in `Examples/`.
No real user
sketch/product acceptance session or new-session slash-menu interaction has been
verified. Saved-content guarantees do not extend to unsaved editor buffers.

One-time setup required explicit approval for an Obsidian restart and for enabling
community plugins in this vault. Future projects do not inherit permission to restart
the app or change another vault's plugin settings. Integration after the user's
CLI-only correction used terminal commands and official CLI evaluation exclusively.

## Multi-host command package

The 2026-11-11 packaging milestone adds seven entry points for Codex, Claude Code,
OpenCode, and Pi, sharing the same workflow and Obsidian helper.

- `python3 -m unittest discover -s tests -v`: 23 tests passed, including all four host
  layouts, selected-host installs, conflict preflight, reruns, config directory
  overrides, legacy-link migration, native Pi resources, and executable use after
  removing the source checkout.
- All seven skill files passed the skill-creator validator.
- `python3 tkflow.py install --host all`: installed on the local machine. The legacy
  checkout links migrated to a self-contained content-addressed runtime.
- Pi 1.5.0: a no-model RPC `get_commands` request returned all seven tkflow commands.
  The check disabled extensions, MCP, context files, and startup network operations.
- OpenCode 2.0.17: `opencode api command.list` returned all seven commands using its
  normal local service. The one-shot standalone service initially returned an empty
  registry, so that result was not counted as discovery proof.
- `tkflow --help` and the bundled `skills/tkflow/scripts/run.py --help` work from the
  copied runtime without the checkout.

Limits: Codex/Claude installation layout and skill format are verified, but their
interactive command menus and model-driven execution have not been exercised in new
sessions. Pi/OpenCode command discovery is not an end-to-end model execution test.
The native Pi manifest is checked; a remote `pi install` clone has not been tested.
