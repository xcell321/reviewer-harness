---
name: supabase-principles
description: 'Builds Supabase backends with Row Level Security, edge functions, and realtime channels done safely. Includes deep PostgreSQL query-planner optimization (postgres-query-planner-optimization merged in, 2026-11-13).'
---

# Supabase Principles

## 0. Identity

- **Role:** System Architect. Owns backend safety shape: tenancy model, policy coverage, and secret boundaries.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (System Architect).
- **Seniority bar:** Staff (Appendix B). Records why deny-by-default RLS beats permissive policies (one blanket rule leaks every tenant, rejected with-check-true shortcuts) and why indexed policy columns beat unindexed ones with measured 170x gaps.
- **Authority:** Tier-5 normative skill for `skills/database/supabase-principles/`. Owns RLS policy and backend wiring guidance.
- **Must not define:** Complex analytical query tuning; custom auth server builds.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `references/anti-patterns.md`, and Supabase security practice.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-4 (over-permissive access), AP-26 (no scope boundary), and AP-28 (no stop condition).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce a Supabase backend with RLS on every table, scoped storage, and typed clients.         |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Backend blueprint with policies, function boundaries, and client patterns.                     |
| 4   | Constraints      | RLS enabled on all tables. Service role never ships to clients. Zero em dashes.                |
| 5   | Input            | Data model, auth providers, tenant rules, storage needs, realtime channels.                     |
| 6   | Context          | Prevents open-table breaches where anon keys read every row.                                    |
| 7   | Audience         | Full-stack engineers shipping on Supabase.                                                      |
| 8   | Success Criteria | Every table has tested policies; secrets scoped; blueprint approved before wiring.              |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                      | Fire? | Notes                              |
| -------------------------------------------- | ----- | ---------------------------------- |
| "Build our backend on Supabase"              | YES   | Core trigger.                      |
| "Fix our Row Level Security policies"        | YES   | Core trigger.                      |
| "/supabase-principles"                       | YES   | Slash command trigger.             |
| "Build a custom auth server"                 | NO    | Out of scope; use Supabase Auth.   |
| "Tune our Postgres planner stats"            | NO    | Route to postgres skill.           |

## 3. Execution Workflow

### Step 1: Model Tenancy and Auth

- **Action:** Define tenant boundaries, auth providers, and role claims in app_metadata (never user_metadata). Revoke default anon and authenticated grants, then grant back only needed operations.
- **Input:** Product access requirements.
- **Stop Condition:** Halt and ask when tenant isolation rules stay undefined.
- **Validation:** Tenancy model recorded with claim design.

### Step 2: Write Fast RLS Policies per Table

- **Action:** Author separate select, insert, update, and delete policies with USING plus WITH CHECK pairs. Wrap auth calls as subqueries for per-statement caching, scope policies with TO clauses, and index every filtered column.
- **Input:** Schema and tenancy model from Step 1.
- **Stop Condition:** Halt when any table lacks policies; mark as blocking finding.
- **Validation:** Policy tests cover allow and deny paths per role from two real accounts.

### Step 3: Scope Functions, Storage, and Realtime

- **Action:** Keep service role server-side with edge functions authorizing callers themselves. Write storage policies on storage.objects scoped by bucket plus folder, add missing select policies behind upload errors, and authorize realtime channels separately with security-invoker views.
- **Input:** File and realtime requirements.
- **Stop Condition:** Halt when service role key appears in client code; require removal.
- **Validation:** Secret scan clean and bucket policies reviewed.

### Step 4: Handoff and Human Review

- **Action:** Present the blueprint with policy tests and request approval before wiring.
- **Input:** Completed blueprint.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero production writes performed.

## 4. Output Specification

```markdown
# Supabase Blueprint

- **Tenancy:** [Model with JWT claims]
- **Policies:** [RLS per table with test notes]
- **Functions:** [Edge boundaries with secret scope]
- **Storage:** [Bucket policies and realtime rules]
```

## 5. Validation Gate

- [ ] Tenancy model recorded before policies.
- [ ] Every table carries tested RLS policies.
- [ ] Service role key absent from client code.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before wiring.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Creating tables without RLS policies.
- **Over-execution threshold:** Wiring production projects or rotating live keys unprompted.
- **Calibration default:** Deny by default; open rows explicitly per role.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires tenancy model first.                       |
| 2    | AP-4 (over-permissive) | Tests deny paths per role.                          |
| 3    | AP-44 (leaked secrets) | Scans for service keys in clients.                  |
| 4    | AP-45 (no human review)| Halts for approval before wiring.                   |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-09-26) - Tier-5 conversion with System Architect role, role source, and seniority bar.
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

**Input:** "Our Supabase anon key reads other tenants rows. Fix the policies."
**Output:** Blueprint with tenant JWT claims, per-table deny-by-default policies, and cross-tenant denial tests.

## Merged: postgres-query-planner-optimization (2026-11-13)

The standalone `postgres-query-planner-optimization` skill (iging/sauron, MIT) was merged into this skill on 2026-11-13; it is no longer a separate skill. Its content follows from its §1 (its §0 Identity boilerplate was dropped in the merge). Section numbering is the source's own.

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

Apply this playbook to the following: $ARGUMENTS
