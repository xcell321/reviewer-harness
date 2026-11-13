---
name: database-migration
description: 'Safely plans and executes database schema changes and migration scripts, enforcing zero-downtime and type-sync discipline. Execute this skill when the user needs to add a table, alter a column, change the data model, or sync dependent types. Do NOT execute for read-only queries, application business logic, or schema design from scratch (use define-foundation).'
---

# Database Migration

## 0. Identity

- **Role:** Data Modeler. Owns schema change shapes with type-sync discipline across the stack.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why multi-phase expand-contract beats big-bang alters (broken changes deploy safely in stages, rejected single-shot rewrites) and why dependent type sync ships with the migration, never after.
- **Authority:** Owns schema change execution. Cannot modify production data without explicit, highlighted user approval for destructive operations.
- **Must not define:** The data model itself (see project `context/core-domains/database-schema.md`); application business rules (see `rules/common/general-rules.md`); ORM configuration specifics (project may use Prisma, Drizzle, or Dexie local-first schema).
- **Normative base:** `core/fellowship/aragorn.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** No step may trigger AP-44 (unlocked filesystem) - destructive commands are always approval-gated. No step may leave dependent types desynced (AP-29, no target state).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                                                                                                                                                         |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task             | Convert a schema-change request into a safe migration plan and execution, with dependent type sync.                                                                                                                           |
| 2   | Target Tool      | Any agent runtime reading markdown skills and executing CLI migration commands: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline.                                                                                          |
| 3   | Output Format    | Schema diff + migration commands per 4. Destructive operations are paused for approval before any command.                                                                                                                    |
| 4   | Constraints      | Never execute destructive commands without explicit, highlighted approval. Always check default values for new columns on populated tables. Never leave frontend types desynced. Default to multi-phase for breaking changes. |
| 5   | Input            | Schema-change request; current schema per `context/core-domains/database-schema.md`; ORM/DB tooling in the project.                                                                                                           |
| 6   | Context          | Prevents data loss, downtime, and type-sync drift in production databases.                                                                                                                                                    |
| 7   | Audience         | The requesting developer and any agent that consumes the synced types afterward.                                                                                                                                              |
| 8   | Success Criteria | Migration generated; destructive ops approved; dependent types synced; schema diff matches `context/core-domains/database-schema.md` contracts.                                                                               |
| 9   | Examples         | See 10.                                                                                                                                                                                                                       |

## 2. Trigger Matrix

| Trigger                                   | Fire? | Notes                                            |
| ----------------------------------------- | ----- | ------------------------------------------------ |
| "Add a column / table / index"            | YES   | Core trigger.                                    |
| "Change the data model / run a migration" | YES   | Core trigger.                                    |
| Alter, drop, or backfill data             | YES   | Trigger fires, but executes only after approval. |
| Read-only SQL query or report             | NO    | Not a migration.                                 |
| Application business logic                | NO    | Out of scope.                                    |
| Schema design from scratch                | NO    | Use `define-core-domains`.                       |

## 3. Execution Workflow

### Step 1: Define Goal

- **Action:** Understand the business entity changing. Record the current schema state from `context/core-domains/database-schema.md` and the ORM.
- **Input:** User request; `context/core-domains/database-schema.md`.
- **Stop Condition:** If the change contradicts `context/core-domains/database-schema.md`, stop and surface the contradiction before proceeding.
- **Validation:** Clear statement of the entity, field, index, or relation changing.

### Step 2: Draft Schema

- **Action:** Update the ORM schema (for example, Prisma, Drizzle, or local-first Dexie schema) with the new fields, indices, and relations. Keep branded-ID and union-literal conventions per `context/core-domains/coding-standards.md`.
- **Input:** Current schema.
- **Stop Condition:** If the draft requires a decision not in the request (for example, nullability, relation style), stop and ask the user.
- **Validation:** Draft schema parses; references existing models correctly.

### Step 3: Safety Analysis

- **Action:** Analyze if the change is breaking. If dropping columns or making nullable columns required, propose a multi-phase zero-downtime plan. Verify whether new columns on populated tables require default values.
- **Input:** Draft schema; production state knowledge.
- **Stop Condition:** If a destructive or breaking operation is required, STOP and present the multi-phase plan for approval before any execution.
- **Validation:** Every breaking change has a written multi-phase plan; every new column on a populated table has a default or is nullable.

### Step 4: Generate Migration

- **Action:** Generate the SQL migration or ORM commands that implement the approved draft.
- **Input:** Approved schema draft.
- **Stop Condition:** If the generated migration includes a destructive command not in the approved plan, stop and re-present.
- **Validation:** Migration file generated; matches the approved schema diff.

### Step 5: Sync Types

- **Action:** Update dependent frontend TypeScript types or Zod schemas so the stack never drifts. Verify branded IDs and union literals carry through.
- **Input:** Migration; frontend types.
- **Stop Condition:** If a dependent type cannot be located, stop and ask rather than guess.
- **Validation:** Grep confirms no stale types reference the old schema shape.

## 4. Output Specification

```markdown
## Schema Changes

[Schema diff]

## Migration Commands

[Generated commands or ORM statements]

## Approval Status

- Destructive operations: [PENDING APPROVAL | APPROVED | NOT APPLICABLE]
- Multi-phase plan: [none | phases listed]
```

## 5. Validation Gate

Run before declaring completion:

- [ ] Schema diff presented and matches the approved draft.
- [ ] Destructive operations carried the explicit, highlighted approval gate.
- [ ] New columns on populated tables have defaults or are nullable.
- [ ] Migration commands generated; no unapproved destructive command included.
- [ ] Dependent frontend types and Zod schemas synced; zero stale references.
- [ ] `context/core-domains/database-schema.md` contracts respected (branded IDs, union literals).

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Adding a required column to a populated table without a default, or leaving frontend types desynced.
- **Over-execution threshold:** Running `prisma db push` (or equivalent) against a production database instead of generating a migration file.
- **Calibration default:** Default to multi-phase deployments for any breaking change.

## 7. Anti-Pattern Compliance

| Step                   | Prevents AP                 | Mechanism                                            |
| ---------------------- | --------------------------- | ---------------------------------------------------- |
| 3 (Safety analysis)    | AP-44 (unlocked filesystem) | Destructive ops paused for explicit approval.        |
| 3 (Safety analysis)    | AP-42 (no target state)     | Population + default-value check enforced.           |
| 4 (Generate migration) | AP-28 (no stop condition)   | Unapproved destructive commands halt the run.        |
| 5 (Sync types)         | AP-29 (no integration)      | Type sync is mandatory; stale references are a fail. |
| 2 (Draft schema)       | AP-41 (hallucinated API)    | Draft binds to ORM tooling actually in the project.  |
| All steps              | AP-26 (no scope boundary)   | Only schema-shape changes; business logic untouched. |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-08-08) - Elevated to Tier 5 per `references/anti-patterns.md`. Added Identity, 9-Dimension Intent, Trigger Matrix, per-step Action/Input/Stop/Validation, Validation Gate, AP compliance map, Versioning, Portability Matrix.

## 9. Portability Matrix

| Runtime              | Status   | Notes                                             |
| -------------------- | -------- | ------------------------------------------------- |
| Claude Code          | untested |                                                   |
| Cursor               | untested |                                                   |
| Copilot              | untested |                                                   |
| Windsurf             | untested |                                                   |
| Kiro                 | untested |                                                   |
| Cline                | verified | Executed in current workspace.                    |
| Raw API (no tooling) | untested | CLI command execution required; raw API unlikely. |

## 10. Examples

**Input:** "Add a bio column to the User table."

**Output:** Schema diff updates the ORM schema with `bio` nullable or defaulted; migration commands generated per 4; dependent TypeScript/Zod types synced; approval status NOT APPLICABLE (non-destructive). No `prisma db push` against production.

**Failure case:** The user says "just drop the old column and run it". Refuse: the destructive operation requires the explicit highlighted approval gate; run the safety analysis and present the multi-phase plan first (AP-44, AP-28).

## Merged: zero-downtime-table-partitioning (2026-11-13)

The standalone `zero-downtime-table-partitioning` skill (iging/sauron, MIT) was merged into this skill on 2026-11-13; it is no longer a separate skill. Its content follows from its §1 (its §0 Identity boilerplate was dropped in the merge). Section numbering is the source's own.

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                                 |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Task             | Convert high-volume monolithic database tables into partitioned architectures with zero downtime.     |
| 2   | Target Tool      | PostgreSQL declarative range/hash partitioning, pg_partman, temporal partition automation.            |
| 3   | Output Format    | Four-phase DDL scripts, low-impact batch backfill procedures, and atomic swap transactions.           |
| 4   | Constraints      | Prohibit long-running exclusive locks (`ACCESS EXCLUSIVE`). Maximum 2-second lock timeout. Yield I/O. |
| 5   | Input            | High-volume table schema, growth projections, query filter access patterns.                           |
| 6   | Context          | Prevents database connection pool exhaustion and application downtime during schema refactoring.      |
| 7   | Audience         | Principal database engineers, site reliability engineers, infrastructure platform leads.              |
| 8   | Success Criteria | Zero connection timeout errors; sub-2-second cutover lock; transparent query partition pruning.       |
| 9   | Examples         | See Section 10.                                                                                        |

## 2. Trigger Matrix

| Trigger Condition                                              | Fire? | Action / Route                                                   |
| -------------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| Table size exceeds 20 million rows or vacuum causes I/O spikes | YES   | Initiate four-phase zero-downtime partitioning workflow.         |
| Table queries predominantly filter by date ranges or tenant ID | YES   | Design declarative range or hash partitioned schema.             |
| Small table under 500,000 records                              | NO    | Reject partitioning; optimize composite indexes instead.         |
| General SQL query optimization and EXPLAIN ANALYZE tuning      | NO    | Route to `skills/database/postgres-query-planner-optimization/`. |

## 3. Execution Workflow

### Step 1: Create Shadow Structure

- **Action:** Create the partitioned parent with `PARTITION BY RANGE`, monthly child partitions, a DEFAULT partition for out-of-range rows, and composite primary keys including the partition key.
- **Input:** Table schema and growth projections.
- **Stop Condition:** Halt when primary keys exclude the partition key; require composite keys.
- **Validation:** Parent declares range partitioning with default partition attached.

### Step 2: Dual-Write and Backfill Safely

- **Action:** Attach replication triggers for live mutations, then backfill history in 2,000 to 5,000 row batches with sleep intervals to protect disk I/O.
- **Input:** Write load and backfill window.
- **Stop Condition:** Halt on replication lag spikes; pause backfill before proceeding.
- **Validation:** Live mutations replicate in real time with zero lag spikes.

### Step 3: Cut Over Atomically

- **Action:** Rename legacy and shadow tables inside one transaction wrapped in a 2-second lock timeout, rehearsed first in staging under simulated load.
- **Input:** Cutover window and staging evidence.
- **Stop Condition:** Halt when staging rehearsal is missing; require it.
- **Validation:** Swap completes in under 200 milliseconds.

### Step 4: Handoff and Human Review

- **Action:** Present the migration pack with staging evidence and request approval before production cutover.
- **Input:** Completed migration pack.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero production DDL run by this skill.

## 4. Output Specification

```markdown
# Partitioning Migration Pack

- **Schema:** [Parent with partitions and keys]
- **Backfill:** [Batched procedure with yields]
- **Cutover:** [Atomic swap with lock timeout]
- **Evidence:** [Staging rehearsal results]
```

## 5. Validation Gate

- [ ] Lock timeout is explicitly set to 2 seconds or less for cutover transactions.
- [ ] Partition key is included in all primary keys and unique indexes.
- [ ] Default partition exists to prevent insertion errors.
- [ ] Backfill scripts use bounded batches with sleep intervals to protect disk I/O.
- [ ] Human approval recorded before production cutover.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Planning partitions without growth and filter analysis.
- **Over-execution threshold:** Running DDL against production without staging rehearsal.
- **Calibration default:** Partition past 20M rows; index below it.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires schema and growth inputs first.            |
| 2    | AP-18 (stale state)    | Yields I/O between bounded batches.                 |
| 3    | AP-28 (no stop)        | Demands staging rehearsal before cutover.           |
| 4    | AP-45 (no human review)| Halts for approval before production cutover.       |

## 8. Versioning & Changelog

- **Version:** 3.0.0
- **Changelog:**
  - `3.0.0` (2026-09-26) - Full Tier-5 template conformance with Data Modeler role, role source, and seniority bar.
  - `2.0.0` (2026-09-20) - Elevated to Sauron Tier-5 specification with non-blocking backfill and atomic cutover patterns.

## 9. Portability Matrix

| Runtime     | Status   | Notes                                    |
| ----------- | -------- | ---------------------------------------- |
| Claude Code | verified | Fully supported via command integration. |
| Cursor      | verified | Compatible with editor rule context.     |
| Windsurf    | verified | Fully functional.                        |
| Antigravity | verified | Certified.                               |
| Kiro        | verified | Skill path linking.                      |
| Cline       | verified | Executed in current workspace.           |
| Raw API     | verified | Model-agnostic execution.                |

## 10. Examples

**Input:** "Audit log table passed 40M rows and vacuum spikes I/O weekly."
**Output:** Four-phase migration pack with monthly partitions, 5,000-row backfill batches, and sub-200ms atomic cutover.

```sql
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  action VARCHAR(64) NOT NULL,
  payload JSONB,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

BEGIN;
SET LOCAL lock_timeout = '2s';
ALTER TABLE legacy_audit_logs RENAME TO legacy_audit_logs_retired;
ALTER TABLE audit_logs_partitioned RENAME TO audit_logs;
COMMIT;
```

Apply this playbook to the following: $ARGUMENTS
