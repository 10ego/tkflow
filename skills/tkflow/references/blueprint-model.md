# Blueprint composition model v1

The model is JSON rendering input produced by the host model from the project
record, not a replacement for Markdown rules/contracts. See the full synthetic
`templates/blueprint-model.example.json` at the plugin root. The renderer validates
before saving; it rejects unsupported component types and broken references.

Required root fields:

| Field | Meaning |
| --- | --- |
| `version` | `1` |
| `title`, `intent` | Product name and person/job/outcome/why |
| `platform` | `desktop` or `mobile` |
| `screens` | Nonempty array, at most 12 screens per board |
| `flows` | Array of named transitions between different screens |
| `entities` | Array of domain concepts and their fields |
| `rules` | Array of rules with shared B-NNN IDs |
| `decisions` | Array of unresolved behavior choices |

Optional root fields: `observations` and `assumptions` (text arrays), and `theme`:
`primary`, `accent`, `surface` as #RRGGBB, `density` as compact/comfortable/airy,
and `tone` as plain language. Defaults are neutral wireframe styling, not inferred
product requirements. Platform is required rather than silently assumed.

Screen: `{id, name, purpose, components}`. IDs must start with a letter and contain
only letters, digits, hyphens and underscores (up to 80 characters). IDs must be
unique in their category; component IDs are unique across the whole board.

Component: `{id, type, label, width?, items?, rows?, behaviors?}`.
`width` is full/half/third; default full, and mobile reflows all to full.
`items` is an array of literal strings. `behaviors` references B-IDs defined in rules.
Every type has editable Excalidraw primitives:

| Type | Content |
| --- | --- |
| `header` | Page title; items are action labels |
| `nav`, `sidebar` | Navigation labels in items; at most one each per screen |
| `text` | Heading and explanatory items |
| `button` | Action label |
| `input` | Field label and empty input |
| `form` | Group label; items are field labels |
| `cards`, `list`, `stats` | Product-specific items; stats include their sample values in text |
| `table` | Items are columns; rows are arrays of matching cell strings |
| `dialog` | Heading; items describe message and action options |
| `empty`, `loading`, `error` | Explicit state label; items describe messages/recovery |
| `toggle` | Setting labels in items; shown as neutral state illustrations |

Tables require enough width (at least 64px per column); use full width or fewer
columns if validation rejects the layout. Mobile has no desktop sidebar. There
are no silent truncations or unknown-component fallbacks. Split very large designs
into supported slices, keeping omitted scope visible in Markdown.

Flow: `{id, from, to, trigger}`. Endpoints reference screen IDs; trigger names what
the user does and can include B-IDs. Same-screen changes belong in state descriptions.

Entity: `{id, name, fields, why?}`. Fields are plain strings; express relationships
with references such as "Request reference". Detailed cardinality, lifecycle and
invariants belong in Markdown contracts.

Rule: `{id, category, strength, text, why, provenance, source}`. ID uses B-NNN form.
Category is access/data/behavior/feel; strength must/should; provenance
stated/inferred/provisional. Source cites a user statement or source element IDs.
A must rule can still be provisional: strength expresses intended behavior;
provenance expresses confidence/approval. Preserve this distinction in Markdown.

Decision: `{id, question, options, recommendation}`. At least two plain-language
options. Explain observable consequences and why the recommendation follows intent.
A recommendation is not approval of a costly commitment.
