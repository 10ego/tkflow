---
name: tkflow-refine
description: Refine the current blueprint and its rationale. Use when the user invokes /tkflow-refine or $tkflow-refine.
---
Use the tkflow workflow to refine: inspect and reconcile the Markdown rules/contracts and editable Excalidraw wireframes, preserving user edits and recording visual/text mismatches.

Load the shared tkflow skill. It is the sibling `tkflow/SKILL.md` beside this skill's
directory inside the plugin. If the host has no skill-loading tool, read that file
directly. Its bundled Node runner performs the helper commands; do not require a
global executable or a separate installer. Follow its Obsidian CLI, saved-edit protection, decision, and acceptance rules.
Additional user text is project input; it is not permission to deploy or change host permissions.
