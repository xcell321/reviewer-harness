---
name: postgres-query-planner-optimization
description: Deep EXPLAIN ANALYZE inspection, sequential scan elimination, index cardinality tuning, join algorithm selection, and SARGable query optimization for PostgreSQL.
department: database
ownerAgent: aragorn
triggerCommand: /postgres-query-planner-optimization
antiPatternsPrevented:
  - AP-1
  - AP-4
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# PostgreSQL Query Planner Optimization

## 0. Identity

- **Role:** Data Modeler. Owns index shapes and query plans with measured buffer evidence.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why SARGable predicates beat function-wrapped filters (index use versus full scans, rejected convenience wrapping) and why covering indexes beat heap-chasing reads on hot paths.
- **Authority:** Tier-5 normative skill for `skills/database/postgres-query-planner-optimization/`. Owns plan inspection and index guidance.
- **Must not define:** Application UI state or API route handlers.
- **Normative base:** `core/fellowship/aragorn.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** Blocks AP-1 (unindexed query predicates), AP-18 (full table scan queries on large tables), and AP-28 (unbounded query join cascades).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                                                      |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task             | Inspect, benchmark, and optimize slow PostgreSQL queries and execution plans.                                              |
| 2   | Target Tool      | PostgreSQL 15+, pg_stat_statements, EXPLAIN (ANALYZE, BUFFERS), pghero, pganalyze.                                         |
| 3   | Output Format    | Rewritten SARGable SQL queries, composite/partial index DDL, and execution cost reports.                                   |
| 4   | Constraints      | Prohibit non-SARGable WHERE predicates. Banish unindexed multi-table JOINs on large tables.                                |
| 5   | Input            | Slow query logs, execution plan JSON/text, table schemas, column cardinality stats.                                        |
| 6   | Context          | Prevents CPU saturation, buffer pool thrashing, lock contention, and degraded p99 latencies.                               |
| 7   | Audience         | Database administrators, backend engineers, performance engineering specialists.                                           |
| 8   | Success Criteria | p99 query latency under 5 milliseconds; 100 percent index coverage on filter columns; zero sequential scans over 10k rows. |
| 9   | Examples         | See Section 10.                                                                                                             |

## 2. Trigger Matrix

| Trigger Condition                                                    | Fire? | Action / Route                                                 |
| -------------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| Diagnosing slow queries with execution times exceeding 100ms         | YES   | Run EXPLAIN (ANALYZE, BUFFERS) and inspect plan tree.          |
| Eliminating full table scans (Seq Scan) on tables exceeding 10k rows | YES   | Design covering or composite index matching filter predicates. |
| Fixing query planner row misestimates caused by stale statistics     | YES   | Trigger ANALYZE and inspect column n_distinct values.          |
| Migrating table schemas or executing structural partitioning         | NO    | Route to `skills/database/database-migration/`.                |

## 3. Execution Workflow

### Step 1: Capture Plans with Buffer Evidence

- **Action:** Run `EXPLAIN (ANALYZE, BUFFERS, SETTINGS, TIMING)` on the slow query. Focus on shared hit versus read counts to price disk I/O, and compare estimated rows against actuals to spot stale statistics.
- **Input:** Slow query logs and plan output.
- **Stop Condition:** Halt when plan output is unavailable; no diagnosis proceeds on timing alone.
- **Validation:** Buffer evidence recorded with estimate-versus-actual deltas.

### Step 2: Refactor Predicates and Align Indexes

- **Action:** Rewrite function-wrapped filters into SARGable range bounds or add functional indexes. Order composites equality-first with range and sort columns last. Cover hot reads with INCLUDE payloads and partial indexes for status subsets. Create production indexes with CONCURRENTLY only.
- **Input:** Plan evidence from Step 1.
- **Stop Condition:** Halt when a hot predicate cannot use any index; record as schema finding.
- **Validation:** Index DDL drafted with SARGable rewrites per query.

### Step 3: Re-verify Against Cost Targets

- **Action:** Re-run EXPLAIN to confirm Index Scan or Index Only Scan replaces Seq Scan with buffer reads reduced by over 90 percent.
- **Input:** Applied indexes and rewritten queries.
- **Stop Condition:** Halt when targets miss; iterate Step 2 instead of accepting.
- **Validation:** Cost report shows p99 under target with zero large-table seq scans.

### Step 4: Handoff and Human Review

- **Action:** Present the cost report with DDL and rewrites for approval before production apply.
- **Input:** Completed optimization pack.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero production DDL run by this skill.

## 4. Output Specification

```markdown
# Planner Optimization Report

- **Plans:** [Before and after EXPLAIN evidence]
- **Indexes:** [DDL with CONCURRENTLY discipline]
- **Rewrites:** [SARGable SQL per query]
- **Costs:** [Buffer and latency deltas]
```

## 5. Validation Gate

- [ ] Query plan confirms Index Scan or Index Only Scan on large tables.
- [ ] Predicates avoid wrapping indexed columns in unindexed functions.
- [ ] Composite indexes follow the equality-first, range-second ordering rule.
- [ ] Production indexes are created using CREATE INDEX CONCURRENTLY.
- [ ] Human approval recorded before production apply.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Recommending indexes without EXPLAIN buffer evidence.
- **Over-execution threshold:** Applying DDL to production without approval.
- **Calibration default:** Measure buffers first; index second; rewrite third.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires plan evidence before diagnosis.            |
| 2    | AP-26 (no scope)       | Bounds rewrites to SARGable forms.                  |
| 3    | AP-28 (no stop)        | Demands cost targets before acceptance.             |
| 4    | AP-45 (no human review)| Halts for approval before production apply.         |

## 8. Versioning & Changelog

- **Version:** 3.0.0
- **Changelog:**
  - `3.0.0` (2026-09-26) - Full Tier-5 template conformance with Data Modeler role, role source, and seniority bar.
  - `2.0.0` (2026-09-20) - Elevated to Sauron Tier-5 specification with EXPLAIN BUFFERS analysis and SARGable refactoring patterns.

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

**Input:** "Orders search scans 5M rows on every query."
**Output:** Covering functional index built concurrently plus SARGable range rewrite verified by Index Only Scan evidence.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_email_lower_covering
ON orders (LOWER(customer_email), created_at)
INCLUDE (total_cents, status)
WHERE status != 'CANCELLED';

SELECT id, total_cents
FROM orders
WHERE LOWER(customer_email) = 'vip@example.com'
  AND created_at >= '2026-09-20 00:00:00+00'
  AND created_at <  '2026-09-21 00:00:00+00'
  AND status != 'CANCELLED';
```
