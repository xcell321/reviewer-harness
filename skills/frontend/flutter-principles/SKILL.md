---
name: flutter-principles
description: Builds Flutter apps with widget composition, Riverpod or Bloc state, and platform channel discipline. Excludes backend API design.
version: 1.0.0
department: frontend
ownerAgent: legolas
triggerCommand: /flutter-principles
antiPatternsPrevented:
  - AP-1
  - AP-6
  - AP-18
  - AP-26
  - AP-28
---

# Flutter Principles

## Purpose

Builds Flutter apps with widget composition, Riverpod or Bloc state, and platform channel discipline: features with composed widgets, bounded state, and tested platform bridges. It prevents rebuild storms and untyped channel calls in cross-platform apps.

## When to use

| Trigger | Example |
| --- | --- |
| "Build this screen in Flutter" | Core trigger. |
| "Fix rebuild jank and channel crashes" | Core trigger. |
| "/flutter-principles" | Slash command trigger. |

Do NOT use when: the work is backend API design — out of scope for this skill (its own trigger matrix); publishing to both app stores — the release flow owns it; Next.js web work belongs to `nextjs-principles`.

## Rules

## 0. Identity

- **Role:** Interface Builder. Owns cross-platform screen composition with rebuild discipline.
- **Role source:** Appendix A of `skills/_template/skill-name/SKILL.md` (Interface Builder).
- **Seniority bar:** Staff (Appendix B). Records why Riverpod beats Provider for new apps (compile-time safety with testable containers, rejected context-coupled trees), why leaf watching beats screen watching (rebuild scope decides frame rates, rejected whole-tree rebuilds), and why immutable reassignment beats in-place mutation.
- **Authority:** Tier-5 normative skill for `skills/frontend/flutter-principles/`. Owns widget and state guidance.
- **Must not define:** Backend APIs; app store release administration as default path.
- **Normative base:** `core/fellowship/legolas.md`, `rules/engineering/architecture-boundaries.md`, `references/anti-patterns.md`, and Flutter Riverpod 3 practice.
- **Anti-pattern gate:** Blocks AP-1 (vague task), AP-18 (stale state), AP-26 (no scope boundary), and AP-28 (no stop condition).

## 1. Intent (9 Dimensions)

| #   | Dimension        | Value                                                                                          |
| --- | ---------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Task             | Produce Flutter features with composed widgets, bounded state, and tested platform bridges.     |
| 2   | Target Tool      | Any agent runtime: Claude Code, Cursor, Copilot, Windsurf, Kiro, Cline, raw API.                |
| 3   | Output Format    | Feature plan with widget tree, state map, and channel contracts.                               |
| 4   | Constraints      | Const widgets where static. State scoped per feature. Zero em dashes. Channels typed.          |
| 5   | Input            | Screen specs, shared state list, native capability needs, API contracts.                        |
| 6   | Context          | Prevents rebuild storms and untyped channel calls in cross-platform apps.                       |
| 7   | Audience         | Mobile engineers shipping Flutter products.                                                     |
| 8   | Success Criteria | Widgets const-correct; state bounded; plan approved before coding.                              |
| 9   | Examples         | See Section 10.                                                                                 |

## 2. Trigger Matrix

| Trigger                                      | Fire? | Notes                              |
| -------------------------------------------- | ----- | ---------------------------------- |
| "Build this screen in Flutter"               | YES   | Core trigger.                      |
| "Fix rebuild jank and channel crashes"       | YES   | Core trigger.                      |
| "/flutter-principles"                        | YES   | Slash command trigger.             |
| "Design our backend API"                     | NO    | Out of scope for this skill.       |
| "Publish to both app stores now"             | NO    | Release flow owns it.              |

## 3. Execution Workflow

### Step 1: Compose Widget Tree

- **Action:** Break screens into small const widgets with keys only where identity matters. Choose Riverpod for new apps with Notifier and AsyncNotifier patterns.
- **Input:** Screen specs.
- **Stop Condition:** Halt and ask when a mega-widget carries unrelated duties.
- **Validation:** Tree reviewed with const notes per widget.

### Step 2: Bound State per Feature

- **Action:** Scope providers per feature with selectors limiting rebuilds to leaf widgets. Separate server state in async notifiers from UI state in lightweight notifiers. Respect auto-dispose lifetimes.
- **Input:** Shared state list from user.
- **Stop Condition:** Halt when global state holds screen-local data; require scoping.
- **Validation:** State map reviewed with rebuild notes.

### Step 3: Contract Platform Channels

- **Action:** Type method and event channels with error mapping and capability-absent fallbacks. Test business logic in containers without widget trees.
- **Input:** Native capability needs.
- **Stop Condition:** Halt when a channel call lacks error mapping; require it.
- **Validation:** Channel contracts reviewed with fallbacks.

### Step 4: Handoff and Human Review

- **Action:** Present the plan and request approval before coding.
- **Input:** Completed plan.
- **Stop Condition:** Await user approval.
- **Validation:** Approval recorded; zero code written by this skill.

## 4. Output Specification

```markdown
# Flutter Plan

- **Widgets:** [Tree with const notes]
- **State:** [Scoped map with rebuild notes]
- **Channels:** [Typed contracts with fallbacks]
```

## 5. Validation Gate

- [ ] Widgets small with const notes.
- [ ] State scoped per feature.
- [ ] Channels typed with error mapping.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before coding.

## 6. Anti-Triggers and Calibration

- **Under-execution threshold:** Building screens without state scoping.
- **Over-execution threshold:** Publishing store releases unprompted.
- **Calibration default:** Const everywhere static; state as local as possible.

## 7. Anti-Pattern Compliance

| Step | Prevents AP            | Mechanism                                           |
| ---- | ---------------------- | --------------------------------------------------- |
| 1    | AP-1 (vague task)      | Requires widget tree first.                         |
| 2    | AP-26 (no scope)       | Scopes state per feature.                           |
| 3    | AP-18 (stale state)    | Types channels with fallbacks.                      |
| 4    | AP-45 (no human review)| Halts for approval before coding.                   |

## 8. Versioning & Changelog

- **Version:** 2.0.0
- **Changelog:**
  - `2.0.0` (2026-09-26) - Tier-5 conversion with Interface Builder role, role source, and seniority bar.
  - `1.0.0` (2026-09-26) - Initial release covering Flutter mobile gap.

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

**Input:** "Build an offline-first inventory screen in Flutter."
**Output:** Plan with const widget tree, scoped stock state, and typed sync channel with fallback.

## Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Widgets small with const notes.
- [ ] State scoped per feature.
- [ ] Channels typed with error mapping.
- [ ] Zero em dashes in deliverable.
- [ ] Human approval recorded before coding.

## Examples

**Do:** "Build an offline-first inventory screen in Flutter." — produce a plan with const widget tree, scoped stock state, and typed sync channel with fallback (the skill's own Section 10 example, kept verbatim in Rules).

**Do not:** build screens without state scoping, or publish store releases unprompted (the under- and over-execution thresholds in Section 6 of Rules).

## Sources

- Cloned verbatim from iging/sauron (MIT) — the entire Rules body above is the sauron skill text, unchanged, including its section headings, trigger matrices, validation gates, portability matrices, and anti-pattern ids.
- The skill itself names Flutter Riverpod 3 practice in its normative base (see Section 0 in Rules); no separate distillation from Flutter documentation is claimed here.

## Changelog

- 1.0.0 — 2026-11-23 — Template retrofit; rules unchanged.
