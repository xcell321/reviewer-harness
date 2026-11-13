---
name: supabase-principles
description: Builds Supabase backends with Row Level Security, edge functions, and realtime channels done safely. Excludes raw SQL analytics tuning.
department: database
ownerAgent: gimli
triggerCommand: /supabase-principles
antiPatternsPrevented:
  - AP-1
  - AP-4
  - AP-6
  - AP-26
  - AP-28
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
