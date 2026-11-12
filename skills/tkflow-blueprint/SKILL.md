---
name: tkflow-blueprint
description: Turn a saved sketch into an intent-rich blueprint. Use when the user invokes /tkflow-blueprint or $tkflow-blueprint.
---
Use the tkflow workflow to blueprint: inspect the saved drawing and generate BOTH Blueprint.md with app rules/contracts and editable Wireframes.excalidraw.md with screens, states, navigation and shared B-IDs. Save and visually verify the wireframes; a blank file or an exported image alone is not completion.

Load the shared tkflow skill. It is the sibling `tkflow/SKILL.md` beside this skill's
directory inside the plugin. If the host has no skill-loading tool, read that file
directly. Its bundled Node runner performs the helper commands; do not require a
global executable or a separate installer. Follow its Obsidian CLI, saved-edit protection, decision, and acceptance rules.
Additional user text is project input; it is not permission to deploy or change host permissions.
