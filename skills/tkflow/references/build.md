# Build and continuation

## One slice at a time

For the next ready milestone, derive acceptance checks from the blueprint before
implementation. Exercise the product through its real entry point when possible.
Avoid a phase that leaves every layer half-built with nothing observable.
Tests must assert the person's expected outcome rather than reproduce internal logic.

For debugging: consider 5-7 plausible causes, narrow to the most likely 1-2, and add
targeted logs or other runtime instrumentation to validate them before changing code.
Remove incidental diagnostics unless they remain useful to the product.

Record exact verification commands, revision, environment, result, and limits in
Evidence/. Distinguish code review, isolated tests, local interaction, staging,
deployed behavior, and the user's acceptance. A green test does not prove all of them.

After each milestone update Status with:
- Works now and how to try it.
- What remains and the next action.
- Deviations from B/A/M IDs and why.
- Open provisional D-IDs and revisit conditions.
- Repository/branch, run/test instructions, environment, and evidence links sufficient
  for a fresh agent. Keep credentials out of notes.

Checkpoint changes in the target repository with a single-line Conventional Commit,
including only the task's files. Update the vault record separately; do not add
unrelated notes or user edits to a commit. Use `tkflow checkpoint` for the active
project's record and artifacts after reviewing the diff.

## Fresh-agent audit

Generate a handoff packet using `tkflow handoff`. The packet freezes exactly the
three canonical notes, a generic audit prompt, and revision hashes. It does not
include conversation history, the sketch, implementation, or author explanations.

Ask a new agent with no inherited history to:
1. Explain the purpose, priorities, current observable behavior, and evidence limits.
2. Identify the next slice, acceptance scenarios, and how to exercise them.
3. Resolve a plausible ambiguity using cited intent/decision entries.
4. Report contradictions, missing facts, or questions required before continuation.

The evaluator's report belongs in Evidence/. Compare its questions against the
record, not against what the previous agent remembers. Repair the canonical docs
when the record is missing intent; fix implementation when behavior is wrong.
Repeat with a fresh agent. Never call this a documentation pass merely because the
packet was generated. Re-audit when canonical notes change materially.

After the docs-only stage, grant the continuation agent access to the repository and
environment recorded in Status. Require actual acceptance evidence before claiming
the built product works. Preserve the user's authorization boundaries.
