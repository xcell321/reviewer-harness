---
name: debug-first
description: Root-cause debugging — reproduce first, fix the cause, not the symptom.
---

## Skill: debug-first

When to use: any error, bug, or unexpected behavior.

- **Reproduce the error first** before fixing anything — if you can't see it, you can't fix it.
- Read the **entire** error message and stack trace — the answer is usually in there.
- Never guess at a fix: add logs or a small test to observe the real state.
- Fix the **cause**, not the symptom — never hide it under a silent try/catch.
- Verify afterwards: re-run the reproduction and confirm the error is gone.
