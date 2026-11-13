---
name: firebase-principles
description: Firebase production rules covering Firestore modeling, cheap security rules, triple-layer security, cost-aware reads, and Cloud Function boundaries. Excludes native mobile builds.
department: database
ownerAgent: gimli
triggerCommand: /firebase-principles
antiPatternsPrevented:
  - AP-1
  - AP-4
  - AP-6
  - AP-26
  - AP-28
---

# Firebase Principles

## 0. Identity

- **Role:** System Architect. Owns serverless backend shape: data model, rule coverage, and cost boundaries.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (System Architect).
- **Seniority bar:** Staff (Appendix B). Records why denormalization beats reference hydration (reads cost per document, rejected fan-out screens), why cheap rules beat get-lookups on hot paths (rule reads bill too, rejected per-operation joins in rules), and why App Check gates beat open endpoints.
- **Authority:** Tier-5 normative skill for `skills/database/firebase-principles/`. Owns Firestore, Auth, Functions, and App Check guidance.
- **Must not define:** Native mobile builds; custom auth server implementations.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-4 (over-permissive access), AP-26 (no scope boundary), and AP-28 (no stop condition).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce Firebase backends with read-shaped models, locked rules, and billed-operation budgets. |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.               |
| 3   | Output Format    | Backend blueprint with model, rules, security layers, and cost notes.                          |
| 4   | Constraints      | Rules deny by default. Reads budgeted per screen. Zero em dashes. App Check enforced.          |
| 5   | Input            | Screen list, auth model, fan-out needs, traffic shape.                                         |
| 6   | Context          | Prevents open databases, bill shocks, and N-plus-one hydration on serverless backends.         |
| 7   | Audience         | Full-stack and mobile engineers shipping on Firebase.                                          |
| 8   | Success Criteria | Rules locked; reads budgeted; layers complete; plan approved before wiring.                    |
| 9   | Examples         | See Section 10.                                                                                |

## 2. Trigger Matrix

| Trigger                                   | Fire? | Notes                            |
| ----------------------------------------- | ----- | -------------------------------- |
| "Build our backend on Firebase"           | YES   | Core trigger.                    |
| "Fix our Firestore rules and bill spikes" | YES   | Core trigger.                    |
| "/firebase-principles"                    | YES   | Slash command trigger.           |
| "Build native iOS screens"                | NO    | Out of scope for this skill.     |
| "Run our own auth servers"                | NO    | Out of scope; use Firebase Auth. |

## 3. Execution Workflow

### Step 1: Model per Screen

- **Action:** Design collections around the queries each screen needs with denormalized display fields, subcollections for unbounded children, and summary documents for counts. One query per view is the target.
- **Input:** Screen list with fields per view.
- **Stop Condition:** Halt when a screen needs fan-out hydration; require denormalization.
- **Validation:** Read budget recorded per screen.

### Step 2: Lock Rules Cheaply

- **Action:** Write ownership-scoped rules with collection-scoped matches (never global wildcards), separate get and list operations, and zero get-lookups on hot paths. Verify queries satisfy rule conditions client-side.
- **Input:** Auth model and tenant boundaries.
- **Stop Condition:** Halt when any collection stays world-readable; mark as blocking.
- **Validation:** Rules reviewed per collection with test identities.

### Step 3: Layer Security and Functions

- **Action:** Add App Check attestation per platform, scope Cloud Function service accounts to least privilege, and keep trigger depth at one level with idempotent handlers. Exempt unused index values to cut fanout and storage.
- **Input:** Threat model and background needs.
- **Stop Condition:** Halt when functions run on default wide service accounts.
- **Validation:** Triple layer verified: rules, service accounts, App Check.

### Step 4: Handoff and Human Review

- **Action:** Present the blueprint with cost model and request approval before wiring.
- **Input:** Completed blueprint.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero production writes performed.

## 4. Output Specification

```markdown
# Firebase Blueprint

- **Model:** [Collections per screen with budgets]
- **Rules:** [Locked policies per collection]
- **Security:** [App Check plus service accounts]
- **Cost:** [Read and write model per screen]
```

## 5. Validation Gate

- [ ] Screens modeled with read budgets.
- [ ] Rules deny by default per collection.
- [ ] Triple layer complete.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before wiring.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Shipping collections without rules or budgets.
- **Over-execution threshold:** Wiring production projects unprompted.
- **Calibration default:** Denormalize deliberately; one writer per duplicated field.

## 7. Anti-Pattern Compliance

| Step | Prevents AP             | Mechanism                                |
| ---- | ----------------------- | ---------------------------------------- |
| 1    | AP-1 (vague task)       | Requires per-screen read budgets first.  |
| 2    | AP-4 (over-permissive)  | Locks rules per collection.              |
| 3    | AP-44 (leaked secrets)  | Scopes service accounts least-privilege. |
| 4    | AP-45 (no human review) | Halts for approval before wiring.        |

## 8. Versioning & Changelog

- **Version:** 1.0.0
- **Changelog:**
  - `1.0.0` (2026-09-26) - Initial release closing the serverless backend gap.

## 9. Portability Matrix

| Runtime     | Status   | Notes                           |
| ----------- | -------- | ------------------------------- |
| Claude Code | verified | Direct slash command execution. |
| Cursor      | verified | Rules and prompt loading.       |
| Copilot     | verified | Custom instructions support.    |
| Windsurf    | verified | Cascade flow integration.       |
| Kiro        | verified | Steering model execution.       |
| Cline       | verified | Task step-by-step flow.         |
| Raw API     | verified | Model-agnostic execution.       |

## 10. Examples

**Input:** "Our social feed costs a fortune and anyone can list users."
**Output:** Blueprint with denormalized feed docs, locked per-collection rules, App Check enforcement, and per-screen read budget.
