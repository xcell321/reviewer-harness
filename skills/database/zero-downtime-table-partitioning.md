---
name: zero-downtime-table-partitioning
description: PostgreSQL declarative range and hash partitioning migrations without exclusive table locks, application disruption, or blocking connection pools.
department: database
ownerAgent: aragorn
triggerCommand: /zero-downtime-table-partitioning
antiPatternsPrevented:
  - AP-1
  - AP-4
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# Zero-Downtime Table Partitioning

## 0. Identity

- **Role:** Data Modeler. Owns partition shapes and cutover plans with lock-bounded guarantees.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why four-phase shadow migration beats in-place repartitioning (traffic never blocks, rejected ACCESS EXCLUSIVE windows) and why partition keys join primary keys (constraint validity demands it, rejected keyless partitions).
- **Authority:** Tier-5 normative skill for `skills/database/zero-downtime-table-partitioning/`. Owns partitioning plans and cutover guidance.
- **Must not define:** Application UI presentation or client-side routing logic.
- **Normative base:** `core/fellowship/aragorn.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** Blocks AP-1 (unbounded exclusive table locks), AP-18 (I/O starvation during backfills), and AP-28 (unbounded migration loops).

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
