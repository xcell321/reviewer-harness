---
name: sqlite-principles
description: SQLite production rules covering WAL pragmas, single-writer discipline, Litestream backup, Turso edge replicas, and Postgres graduation criteria. Excludes multi-writer cluster design.
department: database
ownerAgent: gimli
triggerCommand: /sqlite-principles
antiPatternsPrevented:
  - AP-1
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# SQLite Principles

## 0. Identity

- **Role:** Data Modeler. Owns embedded data shapes with single-file discipline and explicit scale exits.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why WAL plus busy timeout beats default journaling (readers never block writers, rejected out-of-box settings), why local disk beats network mounts (locking guarantees depend on it, rejected NFS placements), and why Postgres graduation waits for measured multi-writer need.
- **Authority:** Tier-5 normative skill for `skills/database/sqlite-principles/`. Owns pragma, backup, and replication guidance.
- **Must not define:** Multi-writer cluster design; client-server administration.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-18 (stale state), AP-26 (no scope boundary), and AP-28 (no stop condition).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                            |
| --- | ---------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Task             | Produce SQLite deployments with tuned pragmas, safe backups, and honest scale limits.            |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                 |
| 3   | Output Format    | Deployment plan with pragmas, backup, replica, and graduation notes.                             |
| 4   | Constraints      | WAL mode mandatory. Local disk only. Zero em dashes. Single writer acknowledged.                 |
| 5   | Input            | Workload shape, write concurrency, durability needs, deploy targets.                             |
| 6   | Context          | Prevents locked-database errors, silent corruption on network mounts, and unbacked single files. |
| 7   | Audience         | Backend, mobile, and edge engineers shipping embedded data.                                      |
| 8   | Success Criteria | Pragmas set; backups stream; limits documented; plan approved before deploy.                     |
| 9   | Examples         | See Section 10.                                                                                  |

## 2. Trigger Matrix

| Trigger                         | Fire? | Notes                         |
| ------------------------------- | ----- | ----------------------------- |
| "Run this service on SQLite"    | YES   | Core trigger.                 |
| "Fix database-is-locked errors" | YES   | Core trigger.                 |
| "/sqlite-principles"            | YES   | Slash command trigger.        |
| "Cluster writes across regions" | NO    | Out of scope; needs Postgres. |
| "Administer our Postgres fleet" | NO    | Route to postgres skill.      |

## 3. Execution Workflow

### Step 1: Tune Pragmas for the Workload

- **Action:** Set WAL journal mode, NORMAL synchronous, foreign keys per connection, 5-second busy timeout, and sized cache with memory temp store. Batch writes in single transactions for 10x to 100x throughput.
- **Input:** Workload shape and durability needs.
- **Stop Condition:** Halt when the file sits on network storage; require local disk.
- **Validation:** Pragma set recorded with rationale per item.

### Step 2: Stream Backups Continuously

- **Action:** Ship WAL frames to object storage with Litestream for near-zero recovery points. Schedule vacuum-into rebuilds on write-heavy files.
- **Input:** Durability needs from user.
- **Stop Condition:** Halt when no backup path exists; mark as blocking.
- **Validation:** Restore rehearsed with measured recovery point.

### Step 3: Replicate Honestly and Exit Cleanly

- **Action:** Serve edge reads with embedded replicas syncing to a primary, funnel writers through one connection, and document Postgres graduation triggers (multi-writer pressure, 100GB analytics, row-level security needs).
- **Input:** Deploy targets and growth projections.
- **Stop Condition:** Halt when multi-writer needs meet single-file deployment; require Postgres plan.
- **Validation:** Replica map plus graduation criteria recorded.

### Step 4: Handoff and Human Review

- **Action:** Present the plan and request approval before deploy.
- **Input:** Completed plan.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero production writes performed.

## 4. Output Specification

```markdown
# SQLite Plan

- **Pragmas:** [Tuned set with rationale]
- **Backup:** [Streaming path with recovery point]
- **Replicas:** [Topology with writer funnel]
- **Exit:** [Postgres graduation triggers]
```

## 5. Validation Gate

- [ ] WAL plus timeout pragmas set.
- [ ] Backups stream with rehearsed restore.
- [ ] File lives on local disk.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before deploy.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Shipping default pragmas without backup paths.
- **Over-execution threshold:** Clustering writes unprompted.
- **Calibration default:** Single file first; graduate on measured pressure.

## 7. Anti-Pattern Compliance

| Step | Prevents AP             | Mechanism                         |
| ---- | ----------------------- | --------------------------------- |
| 1    | AP-1 (vague task)       | Requires workload shape first.    |
| 2    | AP-26 (no scope)        | Bounds writers to one funnel.     |
| 3    | AP-28 (no stop)         | Documents graduation triggers.    |
| 4    | AP-45 (no human review) | Halts for approval before deploy. |

## 8. Versioning & Changelog

- **Version:** 1.0.0
- **Changelog:**
  - `1.0.0` (2026-09-26) - Initial release closing the embedded data gap.

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

**Input:** "Our edge API hammers Postgres for cacheable reads."
**Output:** Plan with WAL-tuned SQLite, Litestream backups, embedded read replicas, and Postgres graduation triggers.
