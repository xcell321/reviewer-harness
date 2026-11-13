---
name: prisma-drizzle-orm
description: Models type-safe data access with Prisma or Drizzle schemas, migrations, and query patterns. Excludes raw database administration.
department: database
ownerAgent: gimli
triggerCommand: /prisma-drizzle-orm
antiPatternsPrevented:
  - AP-1
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# Prisma Drizzle ORM

## 0. Identity

- **Role:** Data Modeler. Owns type-safe access shapes with migration review discipline.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why select beats include on hot paths (N-plus-one taxes every list view, rejected convenience includes), why Drizzle wins edge workloads (no engine binary, rejected Accelerate dependency), and why reviewed SQL beats generated hope on large tables.
- **Authority:** Tier-5 normative skill for `skills/database/prisma-drizzle-orm/`. Owns ORM schema and query guidance.
- **Must not define:** Database server administration; hand-written migration SQL as default path.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `references/anti-patterns.md`, and TypeScript ORM practice.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-18 (stale state), AP-26 (no scope boundary), and AP-28 (no stop condition).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce ORM schemas, migrations, and query patterns with N-plus-one eliminated.                 |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Data access blueprint with schema, relations, indexes, and query samples.                      |
| 4   | Constraints      | Relations explicit. Eager load bounded sets. Zero em dashes. Migrations reviewable as diffs.   |
| 5   | Input            | Domain model, query hot paths, target database, ORM choice.                                     |
| 6   | Context          | Prevents schema drift where code models and database truth diverge silently.                    |
| 7   | Audience         | Full-stack engineers using TypeScript data layers.                                              |
| 8   | Success Criteria | Schema generates clean migrations; hot queries covered; blueprint approved.                     |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                      | Fire? | Notes                              |
| -------------------------------------------- | ----- | ---------------------------------- |
| "Model our data layer with Prisma"           | YES   | Core trigger.                      |
| "Fix N-plus-one queries in Drizzle"          | YES   | Core trigger.                      |
| "/prisma-drizzle-orm"                        | YES   | Slash command trigger.             |
| "Administer our database server"             | NO    | Out of scope; DBA runbook needed.  |
| "Design our MongoDB collections"             | NO    | Route to `mongodb-principles`.     |

## 3. Execution Workflow

### Step 1: Choose ORM and Model Domains

- **Action:** Select Prisma for convention speed and Studio debugging or Drizzle for edge runtimes and SQL control. Bound aggregates per domain with explicit cardinality.
- **Input:** Team SQL comfort and query complexity.
- **Stop Condition:** Halt and ask when the target database stays unknown.
- **Validation:** ORM choice recorded with reason.

### Step 2: Author Schema with Relations

- **Action:** Declare models, relations, unique constraints, and index hints matching hot read paths. Default Prisma hot paths to select with counts over include chains.
- **Input:** Domain model and hot paths.
- **Stop Condition:** Halt when relations stay implicit; require explicit cardinality.
- **Validation:** Schema compiles and generates a clean migration diff.

### Step 3: Shape Queries and Review Migrations

- **Action:** Batch related loads, paginate unbounded lists, and verify with query logging. Read every generated migration; hand-edit index concurrency on large tables and split column changes into nullable, backfill, constrain steps.
- **Input:** Hot path list from Step 2.
- **Stop Condition:** Halt when a list endpoint lacks pagination or a migration lacks rollback notes.
- **Validation:** Query log shows bounded statements per request; migrations reviewed.

### Step 4: Handoff and Human Review

- **Action:** Present the blueprint with migration diff and request approval before applying.
- **Input:** Completed blueprint.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero migrations applied by this skill.

## 4. Output Specification

```markdown
# ORM Blueprint

- **ORM:** [Prisma or Drizzle with reason]
- **Schema:** [Models with relations and constraints]
- **Queries:** [Hot path samples with batching notes]
- **Migrations:** [Reviewable diff plan]
```

## 5. Validation Gate

- [ ] ORM choice recorded with reason.
- [ ] Relations explicit with cardinality.
- [ ] N-plus-one eliminated on hot paths.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before migrations.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Emitting models without migration review.
- **Over-execution threshold:** Applying migrations to shared databases.
- **Calibration default:** Prefer explicit relations over magic cascades.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires ORM choice with reason.                    |
| 2    | AP-26 (no scope)       | Bounds aggregates per domain.                       |
| 3    | AP-18 (stale state)    | Verifies queries with logging evidence.             |
| 4    | AP-45 (no human review)| Halts for approval before migrations.               |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-09-26) - Tier-5 conversion with Data Modeler role, role source, and seniority bar.
  - `1.0.0` (2026-09-26) - Initial release completing database coverage.

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

**Input:** "Our Drizzle feed endpoint fires 200 queries per request."
**Output:** Blueprint with relational batch query, cursor pagination, and bounded statement log.
