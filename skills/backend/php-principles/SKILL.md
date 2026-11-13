---
name: php-principles
description: Modern PHP 8.x engineering rules covering strict typing, PSR architecture, security hardening, error discipline, and static analysis gates. Excludes frontend UI builds.
department: backend
ownerAgent: frodo
triggerCommand: /php-principles
antiPatternsPrevented:
  - AP-1
  - AP-4
  - AP-6
  - AP-26
  - AP-28
---

# PHP Principles

## 0. Identity

- **Role:** Service Builder. Owns type-safe PHP implementation with security hardening inside scoped files.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Service Builder).
- **Seniority bar:** Staff (Appendix B).
- **Authority:** Tier-5 normative skill for `skills/backend/php-principles/`. Owns typing, architecture, and security guidance.
- **Must not define:** Frontend UI layout or client-side hydration routines.
- **Normative base:** `core/fellowship/frodo.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-4 (over-permissive execution), AP-26 (no scope boundary), and AP-28 (no stop condition).
- **Staff judgment:** Records why strict types plus static analysis beat dynamic convenience (entire bug classes die at CI time, rejected untyped velocity), why constructor injection beats facades in domain code (testability over brevity), and why prepared statements plus Argon2id are non-negotiable floors rather than aspirations.

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                 |
| --- | ---------------- | ------------------------------------------------------------------------------------- |
| 1   | Task             | Produce strictly typed, PSR-conformant PHP with security floors and analysis gates.   |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.      |
| 3   | Output Format    | Implementation plan with typing, architecture, security, and gate notes.              |
| 4   | Constraints      | Strict types first line. PHPStan level 8 clean. Zero em dashes. No dynamic execution. |
| 5   | Input            | Feature spec, domain model, threat surface, performance needs.                        |
| 6   | Context          | Prevents untyped legacy sprawl and injection-class vulnerabilities.                   |
| 7   | Audience         | Backend engineers shipping modern PHP 8.x codebases.                                  |
| 8   | Success Criteria | Types complete; security floors met; analysis green; plan approved before coding.     |
| 9   | Examples         | See Section 10.                                                                       |

## 2. Trigger Matrix

| Trigger                     | Fire? | Notes                             |
| --------------------------- | ----- | --------------------------------- |
| "Build this feature in PHP" | YES   | Core trigger.                     |
| "Harden this PHP codebase"  | YES   | Core trigger.                     |
| "/php-principles"           | YES   | Slash command trigger.            |
| "Build a Vue SPA client"    | NO    | Out of scope for this skill.      |
| "Administer our servers"    | NO    | Out of scope; ops runbook needed. |

## 3. Execution Workflow

### Step 1: Enforce Strict Typing

- **Action:** Open every file with strict types, annotate all signatures with union, intersection, and nullable types, model DTOs as readonly classes, prefer backed enums over constants, and use match expressions over switch nests.
- **Input:** Feature spec and domain model.
- **Stop Condition:** Halt when untyped signatures appear; require annotations.
- **Validation:** Typing audit complete with PHPStan level 8 target.

### Step 2: Structure by Domain

- **Action:** Follow PSR-12 and PER formatting with PSR-4 autoloading, inject dependencies through constructors, ban superglobals and extract in application logic, group by feature domains, and default concrete classes to final.
- **Input:** Architecture needs from Step 1.
- **Stop Condition:** Halt when globals or direct instantiations appear in domain code.
- **Validation:** Architecture review complete per boundary.

### Step 3: Harden Security and Errors

- **Action:** Parameterize all SQL, escape all HTML output, hash passwords with Argon2id or Bcrypt, ban eval and shell execution, validate at boundaries with typed DTOs, verify CSRF tokens, and throw domain exceptions with redacted structured logs.
- **Input:** Threat surface from user.
- **Stop Condition:** Halt when any security floor stays unmet; mark as blocking.
- **Validation:** Security checklist reviewed per surface.

### Step 4: Gate Performance and Handoff

- **Action:** Stream large sets with generators, eager-load relations, keep OPcache-compatible constructs, then present the plan for approval.
- **Input:** Performance needs and test strategy.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero code written by this skill.

## 4. Output Specification

```markdown
# PHP Plan

- **Typing:** [Strictness with analysis target]
- **Architecture:** [Domain grouping with DI notes]
- **Security:** [Floors per surface]
- **Performance:** [Streaming and cache notes]
```

## 5. Validation Gate

- [ ] Strict types enforced per file.
- [ ] Domain grouped by feature.
- [ ] Security floors met per surface.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before coding.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Shipping untyped code with dynamic shortcuts.
- **Over-execution threshold:** Rewriting working systems unprompted.
- **Calibration default:** Strictness first; velocity follows.

## 7. Anti-Pattern Compliance

| Step | Prevents AP             | Mechanism                             |
| ---- | ----------------------- | ------------------------------------- |
| 1    | AP-1 (vague task)       | Requires typing audit first.          |
| 2    | AP-26 (no scope)        | Groups code by domain boundary.       |
| 3    | AP-4 (over-permissive)  | Enforces security floors per surface. |
| 4    | AP-45 (no human review) | Halts for approval before coding.     |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-09-26) - Tier-5 conversion with Service Builder role and Staff trade-off records.
  - `1.0.0` - Legacy shared principles baseline.

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

**Input:** "Harden our PHP billing module and add tests."
**Output:** Plan with typed DTO boundaries, parameterized queries, Argon2id hashing, and Pest specs on isolated databases.
