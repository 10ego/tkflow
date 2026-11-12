# Native plugin verification — 0.2.0

Verified on 2026-11-11. This release replaces the standalone Python installer and
runtime with native host plugins and a bundled Node.js helper.

- `npm test`: 25 behavior and adapter tests pass. These cover saved-edit conflicts,
  including a racing save at the final callback, path and symlink boundaries,
  project layout/resume, registration, handoff snapshots, relocated plugin execution,
  and command argument/attachment delivery.
- All seven skill files pass the skill validator. Claude's native manifest validator
  passes with optional marketplace/public-directory listing warnings. This private
  package has not been submitted to a public directory.
- Native Codex and Claude marketplace installation succeeds, first in isolated
  profiles, then from the private Git repository in the live user profiles. Both
  report tkflow@tkflow-plugins version 0.2.0 installed and enabled.
- The Node helper inside Codex's actual plugin cache connects to the exact tkflow
  vault. A live capture exports scene, PNG, and SVG without editing the original
  drawing. A live stale-write probe rejects the proposal and preserves the saved edit.
- Pi's native Git package install succeeds. Its RPC registry identifies all seven
  commands as extension commands; legacy prompt links have been removed.
- OpenCode's native Git package install succeeds and plugin.list identifies tkflow
  as an active package plugin. A fresh authenticated local server confirms all seven
  native command descriptions after removing legacy command links. The isolated
  fixture initially hit a port conflict and configuration-loading issues; those
  incomplete results were not counted as plugin proof.
- 31 unchanged, manifest-owned legacy links were retired after native installation.
  Modified/unrelated files and the vault were preserved. Old runtime snapshots are
  inactive rollback copies.
- `npm pack --dry-run` includes the native manifests and Node runner and contains
  zero Python files. No npm publication or public marketplace submission occurred.

Limits: installation and discovery are verified; model-driven execution of every
command in every host and the user's own sketch-to-build trial remain unverified.
Saved-content protection does not cover unsaved editor buffers.

## Historical verification before native plugin migration

### Initial local verification

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

### Claude marketplace source migration

After repository ownership moved from `tkkhq/tkflow` to `10ego/tkflow`, Claude's
existing `tkflow-plugins` user declaration and cached marketplace registration
still pointed to the old owner. Native `marketplace add 10ego/tkflow` therefore
failed with an `extraKnownMarketplaces` source mismatch.

The repair backed up and changed only those tkflow source entries, refreshed the
clean marketplace clone through Claude's native updater, and preserved the installed
plugin. The refreshed cache uses the verified `10egogh` SSH identity for its private
repository. Native add, update, and install then succeeded; tkflow remained enabled
at 0.2.0 and unrelated Claude settings were unchanged.

## 0.3.0 — project initiation and CLI discovery (2026-11-11)

- `begin` (also `start`) connects, creates/resumes the project, and brings Obsidian
  forward at its exact sketch. Explicit workspace bindings select the corresponding
  project independently of the last active project.
- CLI discovery is bounded and filesystem-only. A found binary with a failed app
  connection reports structured recovery actions rather than inferring absence.
- Reproduced sandbox IPC failure with the installed CLI. Retrying the identical
  `node skills/tkflow/scripts/run.mjs begin` through normal host approval returned
  `status: opened`. Independent official CLI eval confirmed the active vault path
  `/Users/ted.kim/Documents/tkflow` and file
  `Projects/first-idea/Sketch.excalidraw.md`. Existing notes/sketch were resumed.
- `npm test`: 47 passed. New-project creation, workspace bindings, stopped/running
  app behavior, failed reveals, and saved-content preservation use isolated fixtures.
  Stopped-app launch and Linux/Windows paths were not tested against live apps.
- `git diff --check` passed. `claude plugin validate .` passed with listing warnings:
  marketplace description, missing directory-submission license, and icon. No public
  directory submission or licensing change was performed.

## 0.4.0 — editable wireframe blueprints (2026-11-11)

- Blueprint invocation now instructs the host model to generate both Markdown rules
  and contracts and project-specific editable Excalidraw screens/states/navigation.
  The helper is a scene writer, not an independent model service.
- Projects gain `Wireframes.excalidraw.md` alongside the preserved source sketch;
  resume adds missing drawings without replacing existing ones. Model-authored scene
  JSON is saved through CLI with revision checks. Refinement retains captured scene
  data, unrelated Markdown and embedded references. Visual/text reconciliation,
  shared B-IDs and reviewed drawing hashes are required by the workflow.
- `npm test`: 52 passed. `git diff --check` passed.
- Live official Obsidian CLI created a synthetic drawing under
  `Examples/wireframe-proof/`, saved five editable elements and recaptured them via
  Excalidraw automation. Exported PNG was visually inspected: screen border, title,
  empty state and action label render without clipping. This validates save/parse/
  rendering, not a full model-driven project blueprint invocation in every host.
- The three-note fresh-context packet remains unchanged; screen/state descriptions
  and drawing references must also be recorded in Markdown for self-contained audits.

## 0.5.0 — semantic composition and component library (2026-11-11)

- The host model authors a validated v1 product model; `compose` renders editable
  Excalidraw screens with reusable components rather than asking for arbitrary
  element coordinates. The board includes intent/visual direction, ordered screens,
  labeled flow routes, domain data, rule rationale/provenance and open decisions.
- Sixteen components support desktop full/half/third layouts and mobile single-column
  reflow. Content wraps and screen height expands rather than silently truncating.
  Packaged `templates/tkflow-components.excalidrawlib` exposes the same vocabulary
  for optional manual reuse; automated composition needs no import or extra plugin.
- Repeated composition preserves manual annotations and canvas state on managed
  boards, and refuses changed/deleted generated elements, missing ownership records,
  stale revisions and unknown legacy ownership. Deliberate merges still use the
  guarded low-level scene writer. A manually authored/older drawing is never silently
  replaced with a regenerated board.
- Live official Obsidian CLI proof in `Examples/component-library-050/`: the synthetic
  Studio Desk model rendered 3 screens and 168 editable elements. A native capture
  followed by unchanged regeneration passed. A manual text edit was then saved;
  regeneration refused it. The test edit was deliberately restored afterward.
- Overview, desktop screen detail, and mobile PNG exports were visually inspected.
  Evidence: `Overview.png`, `Detail.png`, `Mobile.png` in that example folder. These
  verify rendering and saved-edit behavior, not a working product or a full independent
  model-driven invocation on new user input. Native library import was not exercised.
- Live checks found Excalidraw rewrites long IDs and derives text dimensions/fields.
  Stable 8-character IDs and fingerprints that exclude only derived/runtime fields
  now survive the round trip. Text-index serialization was also corrected to avoid
  leading blank lines. Visible text/style/position changes remain protected.
- `npm test`: 65 passed. Skill validators passed for tkflow and tkflow-blueprint.
  `npm pack --dry-run --json` includes renderer, schema guidance, full example and
  native library. `git diff --check` passed. Claude plugin validation passed with
  existing directory-listing warnings (license, icon, marketplace description).
