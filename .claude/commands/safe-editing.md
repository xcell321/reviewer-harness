---
description: Surgical editing — the smallest possible diff, no collateral damage to the code.
---

## Skill: safe-editing

When to use: every change to existing code.

- Read the whole file (or the relevant part) before changing anything.
- Make the **smallest diff** that solves the task — never include changes that were not asked for.
- Do not reformat, reorder, or rename unrelated lines.
- If another file truly must change too, say why before doing it.
- Afterwards, show the diff and describe in one sentence what changed.

Apply this playbook to the following: $ARGUMENTS
