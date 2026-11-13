---
name: mysql-principles
description: Designs MySQL schemas, indexes, and transactions with InnoDB discipline for read-heavy workloads. Excludes PostgreSQL-specific tuning.
department: database
ownerAgent: gimli
triggerCommand: /mysql-principles
antiPatternsPrevented:
  - AP-1
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# MySQL Principles

## 0. Identity

- **Role:** Data Modeler. Owns relational shapes and index strategy with InnoDB discipline.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why few composites beat many singles (one index serves per query, rejected per-column hopefuls) and why covering indexes beat row-chasing reads on hot paths.
- **Authority:** Tier-5 normative skill for `skills/database/mysql-principles/`. Owns schema, index, and transaction guidance.
- **Must not define:** PostgreSQL planner tuning (see existing postgres skill); document store modeling.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `references/anti-patterns.md`, and MySQL 8.4 practice.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-26 (no scope boundary), AP-28 (no stop condition), and AP-45 (no human review trigger).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce schema, index, and transaction designs that survive growth without locking pain.        |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Schema blueprint with indexes, isolation notes, and online migration plan.                     |
| 4   | Constraints      | InnoDB only. Covering indexes for hot reads. Zero em dashes. No table locks on large alters.   |
| 5   | Input            | Query patterns, write load, isolation needs, table growth rates.                                |
| 6   | Context          | Prevents missing-index full scans and migration locks that take products offline.              |
| 7   | Audience         | Backend engineers running MySQL or MariaDB fleets.                                              |
| 8   | Success Criteria | Schema normalized where it pays; hot paths covered; migration plan approved.                    |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                  | Fire? | Notes                              |
| ---------------------------------------- | ----- | ---------------------------------- |
| "Design our MySQL schema and indexes"    | YES   | Core trigger.                      |
| "Fix slow queries and locking on MySQL"  | YES   | Core trigger.                      |
| "/mysql-principles"                      | YES   | Slash command trigger.             |
| "Tune our PostgreSQL query planner"      | NO    | Route to postgres skill.           |
| "Model our MongoDB collections"          | NO    | Route to `mongodb-principles`.     |

## 3. Execution Workflow

### Step 1: Capture Query and Write Load

- **Action:** Record hot reads with filters and sorts, write rates, and isolation requirements per transaction from slow-query evidence.
- **Input:** Slow query log and feature requirements.
- **Stop Condition:** Halt and ask when hot paths stay unidentified.
- **Validation:** Load table complete before schema decisions.

### Step 2: Model Tables and Indexes

- **Action:** Declare narrow primary keys, normalize by default, and design composite indexes in leftmost-prefix order with covering indexes for top reads. Align join charsets and declare true NOT NULL columns.
- **Input:** Load table from Step 1.
- **Stop Condition:** Halt when a hot read lacks index coverage; require an index.
- **Validation:** Every hot path maps to an index with EXPLAIN rationale.

### Step 3: Harden Transactions and Migrations

- **Action:** Group DML into sized transactions, replace LOCK TABLES with row-level SELECT FOR UPDATE, and plan copy-based online alters with lock-impact notes for large tables.
- **Input:** Consistency needs and table sizes.
- **Stop Condition:** Halt when a migration locks a large table; require online strategy.
- **Validation:** Migration plan lists lock impact per alter.

### Step 4: Handoff and Human Review

- **Action:** Present the blueprint and request approval before implementation.
- **Input:** Completed blueprint.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero DDL run by this skill.

## 4. Output Specification

```markdown
# MySQL Blueprint

- **Schema:** [Tables with normalization calls]
- **Indexes:** [Composite and covering indexes per hot path]
- **Transactions:** [Isolation levels with reasons]
- **Migrations:** [Online alter plan with lock impact]
```

## 5. Validation Gate

- [ ] Hot paths captured before schema work.
- [ ] Every hot read maps to index coverage.
- [ ] Migrations avoid table locks on large tables.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before DDL.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Emitting schemas without slow query evidence.
- **Over-execution threshold:** Running DDL against shared databases.
- **Calibration default:** Index for reads first; denormalize only with measurements.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires load table before design.                  |
| 2    | AP-26 (no scope)       | Maps every hot path to coverage.                    |
| 3    | AP-28 (no stop)        | Demands online strategy for large alters.           |
| 4    | AP-45 (no human review)| Halts for approval before DDL.                      |

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

**Input:** "Our orders table locks during deploys and search is slow."
**Output:** Blueprint with composite index on status plus created order, covering index for search reads, and online alter plan.
