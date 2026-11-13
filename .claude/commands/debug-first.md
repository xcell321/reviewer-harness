---
description: 'Root-cause debugging — reproduce first, fix the cause, not the symptom.'
---

## Skill: debug-first

### Purpose

Root-cause debugging for any error, bug, or unexpected behavior. It prevents symptom-fixes and guessed patches by requiring a reproduction and an observed cause before any code changes.

### When to use

When to use: any error, bug, or unexpected behavior.

| Trigger | Example |
| --- | --- |
| An error, bug, or unexpected behavior appears | "Checkout returns 500" |
| A test fails and the cause is not yet known | "Expected 200, got 500" |

Do NOT use when: writing new features or planned refactors — `ub-mode` owns change discipline there. Once the cause is known and the fix is a plain edit, `safe-editing` governs the edit itself.

### Rules

- **Reproduce the error first** before fixing anything — if you can't see it, you can't fix it.
- Read the **entire** error message and stack trace — the answer is usually in there.
- Never guess at a fix: add logs or a small test to observe the real state.
- Fix the **cause**, not the symptom — never hide it under a silent try/catch.
- Verify afterwards: re-run the reproduction and confirm the error is gone.

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] The error was reproduced before any fix was attempted
- [ ] The entire error message and stack trace were read
- [ ] The fix is based on observed state (logs or a small test), not a guess
- [ ] The fix targets the cause — no silent try/catch hiding the symptom
- [ ] The reproduction was re-run after the fix and the error is gone

### Examples

**Do:** reproduce the 500, read the full stack trace, add a log line to observe the real state, fix the cause, then re-run the reproduction to confirm the error is gone.

**Do not:** guess at a fix, or wrap the failing code in a silent try/catch so the error stops appearing.

### Sources

- No external source is cited in this skill; the rules stand as written (general practice).

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
