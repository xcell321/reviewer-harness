---
name: ub-mode
description: Uncle Bob mode — Clean Code discipline from Robert C. Martin (author of Clean Code): TDD first, CRAP < 10, duplication ≥ 0.8 eliminated, mutation-tested. Use on backend/logic changes, bug fixes, and refactors.
---

## Skill: ub-mode

Distilled from [unclebob/ub-mode](https://github.com/unclebob/ub-mode) — by Robert C. Martin ("Uncle Bob"), author of Clean Code. The source skill is "loosely based on portions of @poteto's rules, reduced and paired with deterministic quality-gate tools" (README). Every rule below cites its source section. Anything the source does not cover is labeled "general practice".

When to use: `/ub-mode`, or any backend/logic change, bug fix, or refactor where the code must stay clean and provable.

The principle: every change follows **First Make it Work → Then Make it Right → Follow Practice**.

### Phase 1 — First Make it Work

1. **Laziness Protocol — one decision lives in one place; ship the smallest edit that solves the problem.**
*Source: SKILL.md, "Laziness Protocol"*

2. **Foundational Thinking — get the data shape right before writing the logic; do first whatever helps every later phase; if a concurrent writer would matter, do not share state.**
*Source: SKILL.md, "Foundational Thinking"*

3. **TDD — write the failing test before changing code; see it fail for the reason you expect; make the smallest change that makes it pass; if an honest test is impractical, do not write a bad one.**
*Source: SKILL.md, "TDD"*

4. **Redesign From First Principles — do not bolt a new requirement onto the old design; ask what you would have built if it had been there from the start, think it through, deliver it in pieces.**
*Source: SKILL.md, "Redesign From First Principles"*

5. **Attack the Premise — when two fixes sharing one premise fail the same gate, write that premise in one sentence, count which actors hold the imbalance, remove the assignment, and do not start another fix until that is done.**
*Source: SKILL.md, "Attack the Premise"*

6. **Subtract Before You Add — take complexity out before adding anything.**
*Source: SKILL.md, "Subtract Before You Add"*

7. **Outcome-Oriented Execution — aim at an end state you can check; a break in the middle is allowed when planned and undoable.**
*Source: SKILL.md, "Outcome-Oriented Execution"*

8. **Build the Lever — if the work is not obvious at a glance, build the tool that does it; do one unit by hand, then make the tool match that unit.**
*Source: SKILL.md, "Build the Lever"*

9. **Architecture — Model the Domain: put the domain in a structure that makes the illegal states impossible; maintain a glossary of domain terms; if the code is already clear and local, leave it.**
*Source: SKILL.md, "Architecture — Model the Domain"*

10. **Architecture — Boundary Discipline: check the data where it enters; inside, trust it; keep business logic in a pure function.**
*Source: SKILL.md, "Architecture — Boundary Discipline"*

11. **Architecture — Type System Discipline: make the illegal value impossible to write; parse outside data once, where it comes in; do not silence the compiler.**
*Source: SKILL.md, "Architecture — Type System Discipline"*

12. **Architecture — Idempotency: running it twice, or running it after a crash halfway through, ends in the same state.**
*Source: SKILL.md, "Architecture — Idempotency"*

13. **Architecture — Shared State: if two parts do not need the same mutable thing, give each its own; if they do, allow one writer, enforced in the structure.**
*Source: SKILL.md, "Architecture — Shared State"*

### Phase 2 — Then Make it Right

14. **Fix Root Causes — reproduce it; fix the cause; a guard that only hides the crash is not a fix.**
*Source: SKILL.md, "Fix Root Causes"*

15. **Sequence work into verifiable units — finish one small unit and check it, then start the next.**
*Source: SKILL.md, "Sequence work into verifiable units"*

16. **Test Behavior, Not Implementation — the test calls the code the way its user does and checks the result that user would see; if the test would still pass when every function returned nothing, throw it out.**
*Source: SKILL.md, "Test Behavior, Not Implementation"*

17. **Crapper — every function under CRAP 10.** Use the crapper tool (computes cyclomatic complexity + test coverage + CRAP per function); reduce each function under CRAP 10 by splitting it, by testing it, or both; consider whether case statements are worth reducing.
*Source: SKILL.md, "Crapper" + README L24–25 — gate: CRAP < 10*

18. **Dryer — eliminate duplication ranked 0.8 or above.** Use the dryer tool to eliminate duplicate blocks with similarity ≥ 0.8.
*Source: SKILL.md, "Dryer" + README L27 — gate: duplication ≥ 0.8 eliminated*

19. **Mutator — cover the uncovered; kill the survivors; delete dead code.** Use the mutator tool; mutation testing exposes uncovered code and surviving mutants.
*Source: SKILL.md, "Mutator" + README L29*

20. **Refactoring — pin what the code does; change the structure; prove the behavior did not change.**
*Source: SKILL.md, "Refactoring"*

### Phase 3 — Practice

21. **Keep a Log — keep a log of every action and the reason; report that log upon completion.**
*Source: SKILL.md, "Keep a Log"*

22. **Guard the Context Window — keep the main thread small; send the bulk elsewhere and keep the summary.**
*Source: SKILL.md, "Guard the Context Window"*

23. **Worktree Cleanup — find what is safe to remove, confirm nothing still in use needs it, then reclaim the disk; uncommitted work waits for a decision.**
*Source: SKILL.md, "Worktree Cleanup"*

24. **Commit and Push — commit often, in small ordered commits; each commit says why, what changed, and how you proved it; push to the main line at the end.**
*Source: SKILL.md, "Commit and Push"*

### Thresholds — the only numbers the source gives
- **CRAP < 10 per function** (rule 17).
- **Duplication similarity ≥ 0.8 eliminated** (rule 18).
- No other numeric thresholds exist in the source: no function line limit, no branch-count limit, no mutation-score percentage (the mutator's rule is "kill the survivors", with no number). Do not invent numbers and attribute them to the source.

### Tools
The source names three quality-gate tools: **crapper**, **dryer**, **mutator** (see the ub-mode repo README for the tool repos). Use them where they are installed — the gates above are the point, not the tools. *General practice:* where the tools are not installed, apply the same thresholds by manual review (estimate CRAP from complexity + coverage, flag near-duplicate blocks) and say so — a manual estimate is not a gate pass.

## When to apply

- Backend/logic changes (paired with safe-editing)
- Bug fixes (paired with debug-first)
- Refactors (paired with safe-editing + debug-first)

## Edsiel's rule

Backend team = `ub-mode` + `safe-editing` (+ `api-security` for endpoints, `owasp-top10` for audits, `debug-first` for bugs).

## Learn more
- ub-mode skill (source): https://github.com/unclebob/ub-mode
- Clean Code (Robert C. Martin): the book behind the discipline
