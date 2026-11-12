# Generate a designed, editable blueprint

On `/tkflow-blueprint`, the host model produces BOTH Markdown rules/contracts and
an editable Excalidraw blueprint board. The default path is semantic composition:
the model designs the experience; the component renderer handles geometry. Do not
settle for a blank drawing, a screenshot, or a few arbitrary labeled rectangles.

## Read the evidence first

Inspect the original sketch's scene AND exported PNG. Read Blueprint, Decisions,
and Status. Inspect reference images individually when the board overview is too
small to understand them; use saved source attachments rather than guessing from
thumbnails. If an attachment is unavailable, name that gap. Distinguish product
requirements from visual inspiration. Never adopt UI or text in an inspiration
image as an approved feature without evidence.

Write a short interpretation: person/job/outcome, source observations, platform,
visual character, constraints, and provisional choices. No product input means
report the missing input rather than fabricate an app. Do not force every app into
a fixed number of screens. Include the screens/states the supported journey needs.

## Author the semantic model

Read `templates/blueprint-model.example.json` at the plugin root for a complete
synthetic example, and [model format](blueprint-model.md) for the contract. Replace
its content with the user's product; never reuse the example as their requirements.

Use stable screen/component/flow/entity/decision IDs and shared B-NNN rule IDs.
Provide realistic sample labels and rows, source observations and provenance,
reasons for rules, named transitions, visual tokens, and unresolved behavior choices.
Do not silently promote an inferred visual choice into a non-negotiable requirement.
Define the supported rules/contracts and acceptance criteria in Blueprint.md first,
then author model JSON consistent with them. The model is rendering input, not a
second independent authority. Keep exact `### B-NNN` headings in Markdown so drawing
links resolve; put the behavior's human-readable title beneath its heading.

Use the component vocabulary to design screens with deliberate hierarchy:
- Header/navigation/sidebar establish where the user is and their main action.
- Forms, tables, lists, cards, stats and controls contain product-specific content.
- Empty/loading/error/dialog components describe relevant states. Label alternate
  states as alternatives; they are explanatory panels, not all simultaneous UI.
- For desktop, pair half-width sections and group thirds where it aids comparison.
  For mobile, the renderer reflows content to a single column. Choose platform from
  intent; do not inherit a desktop-only assumption from a reference.
- Navigation is consistent across screens; flow labels name user actions and their
  B-IDs. Scope fields, rule reasons and entity descriptions should explain why.
- Palette primary/accent/surface and density/tone reflect the supplied design evidence.
  The wireframe uses a consistent monospace type style; final app typography belongs
  in Markdown visual guidance. Color does not substitute for labels or state meaning.

## Compose and preserve saved edits

1. `begin` creates missing project drawings while preserving saved content.
2. Read `read --note Wireframes.excalidraw` for its SHA256 token. On refinement,
   capture the drawing with `capture --note Wireframes.excalidraw` and inspect its
   PNG and scene, including user annotations, before proposing changes.
3. Save model JSON to a temporary file. Run:

   `compose --from /absolute/model.json --expect SHA256 --open`

   The helper validates the model, captures the saved drawing, renders editable
   elements, and uses guarded live CLI replacement. Its output gives screen/component
   bounds and the saved model evidence path. It retains unowned annotations on a
   managed drawing, and refuses regeneration if managed elements were moved, changed,
   deleted or removed. Stale revisions are refused. The original Sketch is never
   a generated output. Saved editor/drawing changes are required before capture.
4. A conflict is a merge task. Inspect the captured scene and the user's edits;
   reconcile intent/rules and record why. Use `wireframe --from /absolute/scene.json
   --expect SHA256 --open` for a deliberate merged scene, preserving existing IDs,
   files, metadata and unrelated notes. Do not remove ownership metadata or refresh
   the revision token merely to bypass protection. Boards made before semantic
   composition have no ownership baseline and require this same deliberate merge.
5. If using the low-level wireframe helper to add a component outside the current
   vocabulary, keep it editable and maintain the same visual conventions. Report
   the unsupported component rather than silently substituting an unrelated one.

The native `templates/tkflow-components.excalidrawlib` can optionally be imported
into Excalidraw for manual reuse. It requires no extra Obsidian plugin. Automated
composition uses the same renderer and needs no manual library import.

## Required quality pass

Capture the saved result again. Inspect the overview AND each screen at a useful
zoom or resolution. Large boards cannot be reviewed from a tiny overview alone;
use the SVG with browser zoom or render focused screen views as temporary evidence.
Report visual review pending if the host cannot inspect images; never claim success
based only on the element JSON.

Before presenting the blueprint, check and repair:
- The journey, screen order and primary actions are clear at overview scale.
- Close-up labels, tables and forms are legible, with no overlap or clipped content.
- Navigation and terminology agree across screens. Data/examples fit the product.
- Important actions have destinations or defined observable results.
- Relevant empty/loading/error/permission/recovery cases are represented or explicitly
  deferred. Alternate states are identified; a wireframe does not prove interactions.
- Screen/component B-IDs, Markdown contracts and acceptance scenarios agree.
- Source observations, visual assumptions and costly open decisions are distinguished.

Record screen/state descriptions and the screen/component-to-B/A-ID map in Markdown,
plus the final capture's source SHA256 and model evidence path. This keeps the
three-note fresh-agent audit self-contained. Describe what the user can inspect,
what is provisional, and any unreviewed gaps in a short status update.

On refinement compare drawing hashes and reconcile changes across Markdown and
wireframes. Record disagreements and block only the affected slices. The two saves
are not transactional: if one fails, record the partial state and reconcile before
building. Never silently discard a visual edit because Markdown governs precise rules.
