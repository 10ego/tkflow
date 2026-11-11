---
name: tkflow-build
description: Build the next ready vertical slice. Use when the user invokes /tkflow-build or $tkflow-build.
---
Use the tkflow workflow to build: implement the next ready slice and verify its acceptance behavior.

Load the shared tkflow skill. It is the sibling `tkflow/SKILL.md` beside this skill's
directory inside the plugin. If the host has no skill-loading tool, read that file
directly. Its bundled Node runner performs the helper commands; do not require a
global executable or a separate installer. Follow its Obsidian CLI, saved-edit protection, decision, and acceptance rules.
Additional user text is project input; it is not permission to deploy or change host permissions.
