# Blueprint authoring

Use the existing Blueprint template. Fill it with concrete project-specific intent,
not generic best practices or a list of code components. Keep deeper technical
constraints when they affect behavior, delivery, or future decisions.

## Read the sketch

Capture the saved drawing; inspect layout, grouping, arrows, labels, images, and
freehand marks as well as text. Separate stated claims from inferred interpretations.
For each behavior, record its source element IDs or exact user statement, why it
exists, its observable result, and relevant failure/recovery cases. Unknown visual
meaning stays unresolved. Never modify the original drawing during interpretation.
Capture again when the drawing changes; explain the resulting spec changes.

## Make intent actionable

- Purpose: person, situation, pain, desired outcome, and why the outcome matters.
- Success: observations that would demonstrate success; no invented numerical targets.
- Boundaries: in/out of scope, existing promises to preserve, external constraints.
- Tiebreakers: ordered, product-specific preferences with rationale and concrete examples.
- Behaviors: stable B-IDs, actor/trigger/result, provenance, why, boundary cases.
- Acceptance: stable A-IDs linked to B-IDs, Given/When/Then, concrete expected results,
  manual exercise steps and meaningful automation where available.
- Slices: M-IDs, each ending in an end-to-end behavior a user can exercise; dependencies,
  acceptance IDs, environment, proof required, blockers, and draft/ready/complete state.
- Unknowns: affected milestone, decision cost, reversibility, and blocking status.

Refinement can use a throwaway interactive prototype when experiencing an option
answers a question more effectively than prose. Label it as a prototype.
Only mark a slice ready when its purpose and acceptance behavior are concrete,
blocking questions are answered, and any remaining assumptions are reversible and logged.

## Ask in behavior language

Example: "When someone reconnects after editing an item another person deleted,
what should they see? A) Their edit restores the item. B) The item stays deleted,
with a notice and a way to recover their edit. C) A conflict prompt. I recommend B
because it preserves the deletion while making their work recoverable."

Do not cite a tiebreaker the project has not actually adopted. If the choice is
reversible and supported, state the provisional default and log it; if costly,
wait for an answer and continue independent work.

When intent changes, revise the behavior and affected acceptance scenarios together,
record the reason and affected slices, and explicitly identify built behavior needing rework.
Generated HTML is derived output; edit Markdown in Obsidian.
