---
name: refactor
description: 'Dedicated reorganization pass over an existing project — split oversized files, separate mixed concerns (UI / logic / data), and arrange files into a clear folder structure WITHOUT changing behavior. Use when the user runs /refactor or asks to reorganize, restructure, or clean up a project''s files and folders.'
---

## Skill: refactor

### Purpose

Give a codebase a dedicated, safe reorganization pass: files split by responsibility, concerns separated, folders arranged by feature — with behavior provably unchanged. It exists because the harness's other quality skills deliberately do not do this job: ub-mode refactors small and in place, safe-editing limits refactoring to the part a change touches, and nodejs-quality states structure rules for Node backends but runs no pass.

### When to use

When to use: `/refactor`, or any request to reorganize an existing codebase's structure — splitting files, moving code to where it belongs, separating frontend/backend concerns, fixing folder layout. Announce at the start: "I'm using the refactor skill to reorganize this project."

| Trigger | Example |
| --- | --- |
| `/refactor` is invoked | "/refactor" |
| A reorganization request | "Organize this project's files — everything is in one folder" |
| A split request | "This file does everything — split it up" |
| A structure cleanup | "Separate the frontend and backend code properly" |

Pairings:

- Small in-place refactors while coding (owned by ub-mode — do not escalate them into a full pass)
- Edits inside existing files (paired with safe-editing)
- Node backend structure decisions (follow nodejs-quality rules 11, 12, 22 — referenced, never duplicated here)

Do NOT use when: the request changes behavior (that is a feature or fix task, before or after the refactor — never mixed into it), or the project is new (writing-plans front-loads structure on new builds).

### Rules

**The one definition everything hangs on**

1. **Refactoring changes structure, never behavior.** If behavior changed, it was not a refactor — it was a rewrite. Never restructure and change behavior in the same pass.
*Source: Martin Fowler, "Refactoring" (2nd ed.) — definition; refactoring.com*

2. **Small steps, green between every step.** A refactoring is a series of small behavior-preserving transformations, each less likely to go wrong than one big move. A branch that reorganizes everything at once cannot be reviewed and is how restructures fail.
*Source: Fowler, "Refactoring" (2nd ed.); AnastasiyaW, "refactoring-safely" skill — workflow*

3. **Rollback anchor first.** Before the first move, make sure the current state is committed (or otherwise restorable) and note the anchor. Any step that cannot be undone cleanly does not start.
*Source: general practice (safe-editing discipline)*

**Workflow — five steps, in order**

4. **Step 1 — Baseline.** Run the test suite and the build. Record the exact pass/fail counts. If the baseline is not green, STOP and report: a refactor never starts on red. If the area being moved has no tests, write characterization tests first — tests that pin what the code currently does, not what it should do.
*Source: Michael Feathers, "Working Effectively with Legacy Code" — characterization tests; Fowler — tests as the safety net for refactoring*

5. **Step 2 — Map.** Inventory the files and folders in scope. Flag the smells (table in rule 9): oversized files, mixed concerns in one file, role-based spaghetti folders, duplicated blocks. Report the map; move nothing yet.
*Source: Fowler — code smells as the trigger vocabulary*

6. **Step 3 — Propose, then wait for approval.** Present the target structure and the ordered list of moves in the report format (rule 12): the proposed folder tree and the moves table. Do not move a single file until the user approves the proposal.
*Source: project rule — the user's approval-gate requirement for this skill*

7. **Step 4 — Execute, one move at a time.** Apply the approved moves in order. After EACH move: update imports/references, run the tests. Red tests → stop, fix the move or roll it back; never stack the next move on top of a red step.
*Source: Fowler — small steps; refactoring-safely — "green between every step"*

8. **Step 5 — Verify and report.** Run the full suite and build again. Pass counts must match the baseline exactly (same tests, same count — a suite that silently runs fewer tests is a failure, not a pass). Then deliver the final report in the format of rule 12.
*Source: verify_before_done — defined-and-called plus count comparison*

**Smell → move**

9. **Name the smell, then apply its paired refactoring:**

| Smell | Refactoring |
|---|---|
| Long Function | Extract Function; Decompose Conditional |
| Large Class / oversized module or file | Extract Class (Extract Module in JS/TS); Split Phase |
| Duplicated Code | Extract Function, then call it from both places |
| Divergent Change (one file changes for many unrelated reasons) | Split Phase; Extract Function/Class — split by responsibility |
| Shotgun Surgery (one change forces edits in many files) | Move Function / Move Field — gather what changes together |
| Feature Envy (code uses another module's data more than its own) | Move Function to where the data lives |
| Long Parameter List | Introduce Parameter Object |
| Mysterious Name | Rename Variable / Function / Field (Change Function Declaration) |
| Dead Code | Remove Dead Code |
| Speculative Generality (abstractions nothing uses) | Inline Function / Inline Class; Remove Dead Code |

*Source: Fowler, "Refactoring" (2nd ed.), ch. 3 (smells) + refactoring.com/catalog — each smell is paired there with these named refactorings*

**Structure rules — where things end up**

10. **Files that change together live together; split by responsibility or feature, not by technical layer.** A folder per feature/domain, self-contained; shared code moves to a clearly shared place only when two or more features genuinely use it.
*Source: obra/superpowers, writing-plans — "File Structure"; goldbergyoni/nodebestpractices §1.1 (structure by component)*

11. **Stack targets.** Node backend: follow nodejs-quality rules 11, 12, and 22 (structure by business component, 3-tier layering inside each component, explicit entry point per module) — this skill references them and does not restate or override them. Frontend (React): `src/features/<feature>/` holds that feature's components, hooks, and API calls together; `src/components/` is for UI shared by multiple features only; `src/lib/` for pure helpers; `src/services/` for external/API clients; a component file that also fetches data and computes business rules carries Divergent Change — split it. PHP: one folder per module/feature; entry points (pages/controllers) separated from business logic and from data access.
*Source: nodejs-quality rules 11, 12, 22 (Node); general practice — rule 10 applied per stack (React, PHP); no single canonical source prescribes these exact folders*

**The report — required format**

12. **Every proposal (Step 3) and every final report (Step 5) MUST contain all three parts:**
    1. **Folder structure tree** — for a proposal: the current tree and the proposed tree (before → after). For a final report: the resulting tree.
    2. **Moves table** — one row per file or unit moved/split/renamed: | File | From | To | Change | Reason (smell) |, where Change is moved / split / renamed / extracted and Reason names a smell from rule 9's table.
    3. **Verification line** — tests before → after (counts), build result. On a proposal, state the baseline counts the moves will be checked against.

    A report without the tree and the table is incomplete — the user reads the structure, not prose about the structure.
*Source: project rule — the user's explicit requirement for this skill*

### Validation gate

Before reporting a refactor done, confirm each item:

- [ ] Baseline was green and recorded before the first move
- [ ] Proposal (tree + moves table) was approved before any file moved
- [ ] Tests ran after every move; no move was stacked on a red step
- [ ] Final suite count == baseline count, all passing; build passes
- [ ] No behavior change snuck in (no logic edits beyond moves, splits, renames, and import updates)
- [ ] Final report contains the folder tree, the moves table, and the verification line

### Examples

**Example — one file doing everything:**

```
BEFORE                          AFTER
src/                            src/
└── app.js  (data + pricing     ├── app.js  (entry point: re-exports)
            + formatting        ├── data/products.js
            + rendering)        ├── pricing.js
                                ├── format.js
                                └── receipt.js
```

| File | From | To | Change | Reason (smell) |
|---|---|---|---|---|
| product data + access | src/app.js | src/data/products.js | extracted | Large Class / oversized module; Divergent Change |
| pricing functions | src/app.js | src/pricing.js | extracted | Divergent Change |
| formatPeso | src/app.js | src/format.js | extracted | Divergent Change |
| renderReceipt | src/app.js | src/receipt.js | extracted | Divergent Change |

Verification: tests 6/6 → 6/6, assertions untouched.

### Sources

- Martin Fowler, *Refactoring: Improving the Design of Existing Code* (2nd ed.) — definition of refactoring, the smell vocabulary (ch. 3), and the named refactorings; online catalog at refactoring.com/catalog.
- Michael Feathers, *Working Effectively with Legacy Code* — characterization tests.
- goldbergyoni/nodebestpractices §1.1–1.2 — structure by component, layering (via nodejs-quality rules 11, 12, 22).
- obra/superpowers, writing-plans — "File Structure" (files that change together live together; split by responsibility).
- AnastasiyaW, `refactoring-safely` skill (codex-claude-code-config) — safe-workflow model: smells as triggers, one transformation at a time, green between steps.
- Rules 3, 11 (React/PHP parts) are labeled general practice where they appear; rules 6 and 12 are project rules set by the user.

### Changelog

- 1.0.0 (2026-11-17) — Initial release: five-step gated workflow (baseline → map → propose → execute → verify), Fowler smell → move table, per-stack structure targets, and the mandatory report format (folder tree + moves table + verification line). Effect-tested on a seeded mixed-concern sample: baseline 6/6 tests, reorganized into data/pricing/format/receipt modules, 6/6 after, test file byte-identical.

Apply this playbook to the following: $ARGUMENTS
