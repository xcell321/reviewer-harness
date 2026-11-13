---
name: mongodb-principles
description: Designs MongoDB schemas, indexes, and aggregation pipelines with document modeling discipline. Excludes relational migration planning.
department: database
ownerAgent: gimli
triggerCommand: /mongodb-principles
antiPatternsPrevented:
  - AP-1
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# MongoDB Principles

## 0. Identity

- **Role:** Data Modeler. Owns document shapes and relationship rules for query-driven access.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Data Modeler).
- **Seniority bar:** Staff (Appendix B). Records why embedding beats referencing for co-accessed data (single-query reads, rejected join-per-read normalization habits) and why ESR-ordered compound indexes beat per-column indexes.
- **Authority:** Tier-5 normative skill for `skills/database/mongodb-principles/`. Owns schema, index, and pipeline guidance.
- **Must not define:** Relational migrations (see `database-migration`); vector search engine selection.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `references/anti-patterns.md`, and MongoDB data modeling practice.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-26 (no scope boundary), AP-28 (no stop condition), and AP-45 (no human review trigger).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce schema, index, and aggregation designs driven by access patterns.                     |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Schema blueprint with indexes, pipeline stages, and transaction notes.                       |
| 4   | Constraints      | Embed versus reference decided per query. Index every sort and filter path. Zero em dashes.  |
| 5   | Input            | Access patterns, write rates, consistency needs, growth estimates.                            |
| 6   | Context          | Prevents relational habits that create join-heavy pipelines on document stores.               |
| 7   | Audience         | Backend engineers modeling document data.                                                     |
| 8   | Success Criteria | Schema covers all access patterns; indexes declared; blueprint approved before coding.        |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                     | Fire? | Notes                              |
| ------------------------------------------- | ----- | ---------------------------------- |
| "Design our MongoDB schema and indexes"     | YES   | Core trigger.                      |
| "Fix our slow aggregation pipeline"         | YES   | Core trigger.                      |
| "/mongodb-principles"                       | YES   | Slash command trigger.             |
| "Migrate our tables to MongoDB"             | NO    | Route to `database-migration`.     |
| "Pick our vector search engine"             | NO    | Route to `vector-db-selector`.     |

## 3. Execution Workflow

### Step 1: Capture Access Patterns

- **Action:** List every read and write path with frequency, filters, sorts, and consistency needs. Apply the access-together-stored-together law: embed one-to-few co-read data, reference unbounded, shared, or independently-written data. Enforce the 16MB ceiling with bucket patterns for growing arrays.
- **Input:** Feature requirements and current slow queries.
- **Stop Condition:** Halt and ask when dominant queries stay undefined.
- **Validation:** Access table complete with embed-versus-reference calls per relationship.

### Step 2: Model Documents and Indexes

- **Action:** Apply production patterns (extended reference, subset, bucket, computed) where measured. Order compound indexes by equality, sort, then range. Add partial indexes for hot subsets and project fields to hit covered queries.
- **Input:** Access table from Step 1.
- **Stop Condition:** Halt when unbounded arrays threaten document growth; require bucketing.
- **Validation:** Every query path maps to an index with ESR rationale.

### Step 3: Shape Aggregation Pipelines

- **Action:** Order stages with selective match first, project early, limit before lookup, and materialize repeated rollups with merge-fed summary collections. Verify leading stages with explain statistics.
- **Input:** Reporting and feed requirements.
- **Stop Condition:** Halt when pipeline fans out without bounds; require pagination.
- **Validation:** Pipelines reviewed for stage order and index use.

### Step 4: Handoff and Human Review

- **Action:** Present the blueprint and request approval before implementation.
- **Input:** Completed blueprint.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero migrations run by this skill.

## 4. Output Specification

```markdown
# MongoDB Blueprint

- **Schema:** [Collections with embed versus reference calls]
- **Indexes:** [Compound, TTL, and partial indexes]
- **Pipelines:** [Stage-ordered aggregations]
- **Transactions:** [Multi-document notes]
```

## 5. Validation Gate

- [ ] Access patterns captured before schema work.
- [ ] Every query path maps to an index.
- [ ] Pipelines ordered match first with early projection.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before coding.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Emitting schemas without access pattern analysis.
- **Over-execution threshold:** Running migrations or seeding production data.
- **Calibration default:** Denormalize for reads; reference for unbounded growth.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires access table before design.                |
| 2    | AP-26 (no scope)       | Maps every query to schema and index.               |
| 3    | AP-42 (no target)      | Specifies stage order and transaction notes.        |
| 4    | AP-45 (no human review)| Halts for approval before coding.                   |

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

**Input:** "Design MongoDB for multi-tenant task boards with activity feeds."
**Output:** Blueprint with tenant-keyed collections, compound indexes on board plus updated order, and match-first feed pipeline.
