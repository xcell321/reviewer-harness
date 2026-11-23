---
description: 'Next.js App Router and React 19 architecture constraints, Server Components default, caching, Server Actions security, and Turbopack optimization.'
---

# Next.js Principles

## Purpose

Next.js App Router and React 19 architecture constraints, Server Components default, caching, Server Actions security, and Turbopack optimization: App Router apps with server-first data, secured actions, and optimized assets. It prevents client bloat, waterfall fetches, and secret leaks into bundles.

## When to use

| Trigger | Example |
| --- | --- |
| "Build this route in Next.js" | Core trigger. |
| "Fix client bloat and waterfalls" | Core trigger. |
| "/nextjs-principles" | Slash command trigger. |

Do NOT use when: the work is a React Native screen — native mobile builds are outside this skill's scope (its own trigger matrix routes them away); tuning Postgres queries — out of scope; backend database internals belong to the `database` category skills.

## Rules

## 0. Identity

- **Role:** Interface Builder. Owns server-first composition with strict client boundaries.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Interface Builder).
- **Seniority bar:** Staff (Appendix B). Records why Server Components default beats client fetching (no waterfalls, rejected useEffect data loads), why explicit cache directives beat implicit caching (predictable freshness, rejected stale surprises), and why server-only guards beat leaked secrets.
- **Authority:** Tier-5 normative skill for `skills/frontend/nextjs-principles/`. Owns App Router and rendering guidance.
- **Must not define:** Backend database internals; native mobile builds.
- **Normative base:** `core/fellowship/legolas.md`, `rules/engineering/architecture-boundaries.md`, `rules/common/code-style-standards.md`, `references/anti-patterns.md`.
- **Anti-pattern gate:** Blocks AP-4 (over-permissive client), AP-9 (unvalidated actions), and AP-26 (leaking secrets).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce App Router apps with server-first data, secured actions, and optimized assets.         |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Route plan with boundaries, cache rules, action contracts, and asset notes.                    |
| 4   | Constraints      | Server Components default. Secrets server-only. Zero em dashes. Awaited async APIs.            |
| 5   | Input            | Route map, data needs, mutation list, SEO needs.                                                |
| 6   | Context          | Prevents client bloat, waterfall fetches, and secret leaks into bundles.                        |
| 7   | Audience         | Frontend engineers shipping Next.js App Router apps.                                            |
| 8   | Success Criteria | Boundaries strict; actions authorized; plan approved before coding.                             |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                      | Fire? | Notes                              |
| -------------------------------------------- | ----- | ---------------------------------- |
| "Build this route in Next.js"                | YES   | Core trigger.                      |
| "Fix client bloat and waterfalls"            | YES   | Core trigger.                      |
| "/nextjs-principles"                         | YES   | Slash command trigger.             |
| "Build a React Native screen"                | NO    | Route to `react-native-principles`.|
| "Tune our Postgres queries"                  | NO    | Out of scope for this skill.       |

## 3. Execution Workflow

### Step 1: Draw Server Client Boundaries

- **Action:** Default every component to server rendering with use-client leaves only for hooks, browser APIs, and listeners. Enforce serializable props and feature-first src layout with App Router only.
- **Input:** Route map from user.
- **Stop Condition:** Halt on root-level use-client or Pages router additions.
- **Validation:** Boundary map reviewed per route.

### Step 2: Fetch and Cache Explicitly

- **Action:** Fetch on servers with async components, never in effects. Declare cache directives with tags and revalidation profiles, await async params and server utilities, and bound Suspense regions granularly.
- **Input:** Data needs per route.
- **Stop Condition:** Halt on effect fetching or implicit cache assumptions.
- **Validation:** Cache rules reviewed per route.

### Step 3: Secure Actions and Assets

- **Action:** Validate and authorize every Server Action with schemas plus session checks, optimize images and fonts through built-ins, lazy-load heavy clients, and guard server modules against client bundling.
- **Input:** Mutation list and asset inventory.
- **Stop Condition:** Halt on unauthorized actions or client-leaked secrets.
- **Validation:** Security audit complete per surface.

### Step 4: Handoff and Human Review

- **Action:** Present the plan and request approval before coding.
- **Input:** Completed plan.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero code written by this skill.

## 4. Output Specification

```markdown
# Next.js Plan

- **Boundaries:** [Server-first map]
- **Cache:** [Explicit rules per route]
- **Actions:** [Authorized contracts]
- **Assets:** [Optimization notes]
```

## 5. Validation Gate

- [ ] Server default with leaf clients.
- [ ] Cache explicit per route.
- [ ] Actions validated and authorized.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before coding.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Rendering client-first without boundary maps.
- **Over-execution threshold:** Building backends unprompted.
- **Calibration default:** Server unless proven interactive.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-4 (over-permissive) | Restricts client boundaries.                        |
| 2    | AP-26 (no scope)       | Declares cache per route.                           |
| 3    | AP-9 (unverified)      | Authorizes every action.                            |
| 4    | AP-45 (no human review)| Halts for approval before coding.                   |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-09-26) - Tier-5 conversion with Interface Builder role, role source, and seniority bar.
  - `1.0.0` - Legacy Next.js baseline.

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

**Input:** "Our Next.js app fetches in effects and leaks secrets."
**Output:** Plan with server-first boundaries, explicit cache rules, and authorized actions with server-only guards.

## Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Server default with leaf clients.
- [ ] Cache explicit per route.
- [ ] Actions validated and authorized.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before coding.

## Examples

**Do:** "Our Next.js app fetches in effects and leaks secrets." — produce a plan with server-first boundaries, explicit cache rules, and authorized actions with server-only guards (the skill's own Section 10 example, kept verbatim in Rules).

**Do not:** render client-first without boundary maps, or build backends unprompted (the under- and over-execution thresholds in Section 6 of Rules).

## Sources

- Cloned verbatim from iging/sauron (MIT) — the entire Rules body above is the sauron skill text, unchanged, including its section headings, trigger matrices, validation gates, portability matrices, and anti-pattern ids.
- The skill's own normative base is sauron-internal (see Section 0 in Rules); no separate distillation from Next.js documentation is claimed here.

## Changelog

- 1.0.0 — 2026-11-23 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
