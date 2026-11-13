---
name: elasticsearch-patterns
description: Designs Elasticsearch mappings, analyzers, and search queries with relevance tuning discipline. Excludes log pipeline administration.
department: database
ownerAgent: gimli
triggerCommand: /elasticsearch-patterns
antiPatternsPrevented:
  - AP-1
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# Elasticsearch Patterns

## 0. Identity

- **Role:** Retrieval Architect. Owns search index topology and relevance routing with measured recall.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Retrieval Architect).
- **Seniority bar:** Staff (Appendix B). Records why explicit mappings beat dynamic guessing (mapping changes demand reindexing, rejected schema-on-write hope) and why hybrid RRF beats pure BM25 on mixed query sets with recall numbers.
- **Authority:** Tier-5 normative skill for `skills/database/elasticsearch-patterns/`. Owns mapping, analyzer, and query guidance.
- **Must not define:** Cluster administration or log shipping pipelines; vector engine selection.
- **Normative base:** `core/fellowship/gimli.md`, `rules/engineering/architecture-boundaries.md`, `references/anti-patterns.md`, and Elasticsearch relevance practice.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-26 (no scope boundary), AP-28 (no stop condition), and AP-45 (no human review trigger).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce index mappings, analyzers, and queries tuned for relevance and latency.                 |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Search blueprint with mappings, analyzer chain, query DSL, and relevance notes.                |
| 4   | Constraints      | Explicit mappings only, never dynamic. Filter context for exact cuts. Zero em dashes.          |
| 5   | Input            | Query types, language needs, facet fields, latency budget, corpus size.                         |
| 6   | Context          | Prevents dynamic-mapping explosions and scoring queries that ignore relevance signals.         |
| 7   | Audience         | Backend engineers building product search and log exploration.                                  |
| 8   | Success Criteria | Mappings explicit; queries use filters for cuts; blueprint approved before indexing.            |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                        | Fire? | Notes                              |
| ---------------------------------------------- | ----- | ---------------------------------- |
| "Design our Elasticsearch index and queries"   | YES   | Core trigger.                      |
| "Fix irrelevant search results and slow facets"| YES   | Core trigger.                      |
| "/elasticsearch-patterns"                      | YES   | Slash command trigger.             |
| "Administer our logging cluster"               | NO    | Out of scope; ops runbook needed.  |
| "Pick our vector database"                     | NO    | Route to `vector-db-selector`.     |

## 3. Execution Workflow

### Step 1: Classify Queries

- **Action:** Separate full-text relevance queries from exact filter cuts, facets, and sorting needs with example inputs per class.
- **Input:** Search UX requirements and sample queries.
- **Stop Condition:** Halt and ask when relevance expectations stay undefined.
- **Validation:** Query classes recorded with example inputs.

### Step 2: Define Mappings and Analyzers

- **Action:** Write strict explicit mappings with text plus keyword multi-fields, scaled_float prices, strict dates, per-language analyzers, and edge n-grams confined to autocomplete subfields.
- **Input:** Query classes from Step 1.
- **Stop Condition:** Halt when field types conflict across document variants; require resolution.
- **Validation:** Mappings reviewed field by field with analyzer reasons.

### Step 3: Shape Queries and Prove Relevance

- **Action:** Compose bool queries with filter context for cuts and boosted multi-match for text. Add RRF hybrid where intent queries lag, grade on a rated query set with rank_eval, and pin pet-query exceptions with query rules.
- **Input:** Mapping definitions from Step 2.
- **Stop Condition:** Halt when relevance judgments are missing; require sample grading.
- **Validation:** Queries graded on sample set before sign-off.

### Step 4: Handoff and Human Review

- **Action:** Present the blueprint with pagination (search_after), shard sizing (20 to 50GB), and alias strategy, then request approval before indexing.
- **Input:** Completed blueprint.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero index writes performed.

## 4. Output Specification

```markdown
# Elasticsearch Blueprint

- **Mappings:** [Explicit field mappings]
- **Analyzers:** [Language chains per field]
- **Queries:** [Bool DSL with filter and boost notes]
- **Relevance:** [Sample grading results]
```

## 5. Validation Gate

- [ ] Queries classified before mapping work.
- [ ] Mappings explicit with zero dynamic fields.
- [ ] Filters used for exact cuts, queries for scoring.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before indexing.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Emitting queries without explicit mappings.
- **Over-execution threshold:** Reindexing production clusters unprompted.
- **Calibration default:** Filter first for precision; boost text fields sparingly.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires query classification first.                |
| 2    | AP-26 (no scope)       | Forces explicit mappings per field.                 |
| 3    | AP-42 (no target)      | Grades queries on sample set.                       |
| 4    | AP-45 (no human review)| Halts for approval before indexing.                 |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-09-26) - Tier-5 conversion with Retrieval Architect role, role source, and seniority bar.
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

**Input:** "Product search returns wrong items and facets take seconds."
**Output:** Blueprint with keyword subfields, filter-context facets, and boosted multi-match query graded on samples.
