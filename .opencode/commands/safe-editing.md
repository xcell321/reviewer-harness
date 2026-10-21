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

---

## Companion playbook: no-hallucination (always paired with safe-editing)

## Skill: no-hallucination

When to use: every time you write new code or reach for a library/API.

- Before importing, check `package.json` (or the lockfile) that the package is really there.
- Use only functions and APIs you have seen in the codebase or in the official docs.
- If you are unsure of a name or signature, look it up first — never guess.
- If something does not exist, say so immediately — never invent a substitute.
- After coding, verify: does it actually run, or does it only *look* right?

Apply this playbook to the following: $ARGUMENTS
