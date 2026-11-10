---
name: writing-plans
description: Turn an approved spec or design doc into an implementation plan for an engineer who hasn't seen the codebase — bite-sized TDD tasks, each ending in a testable deliverable and a commit.
---

## Skill: writing-plans

When to use: when you have a spec or requirements (usually an approved design doc from brainstorming) for a multi-step task, before touching code. Announce at the start: "I'm using the writing-plans skill to create the implementation plan."

Every rule below is distilled from obra/superpowers — `skills/writing-plans/SKILL.md` (cited per rule). Nothing here is invented — anything the source doesn't cover is labeled "general practice". Rules marked [Edsiel] are adaptations from his standing preferences, not from the source.

### Scope check

1. **If the spec covers multiple independent subsystems, suggest breaking it into separate plans — one per subsystem.** Each plan should produce working, testable software on its own. If brainstorming didn't split them, say so now.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Scope Check"*

### File structure first

2. **Before defining tasks, map out which files will be created or modified and what each one is responsible for.** This is where decomposition decisions get locked in.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "File Structure"*

3. **Design units with clear boundaries and well-defined interfaces. Each file has one clear responsibility.** Prefer smaller, focused files over large ones that do too much — you reason best about code you can hold in context at once, and edits are more reliable when files are focused. [Edsiel] This is his standing code-style rule: readable at a glance, no spaghetti, separated into files with clear organization.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "File Structure"; [Edsiel] note: general practice — his standing code-style preference*

4. **Files that change together should live together. Split by responsibility, not by technical layer.** In existing codebases, follow established patterns. Don't unilaterally restructure a codebase that uses large files — but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "File Structure"*

### Task right-sizing

5. **A task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate.** Fold setup, configuration, scaffolding, and documentation steps into the task whose deliverable needs them; split only where a reviewer could meaningfully reject one task while approving its neighbor. Each task ends with an independently testable deliverable.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Task Right-Sizing"*

6. **Each task ends with a commit.** [Edsiel] Done isn't done without a commit SHA — the plan's task list doubles as the commit list, and a task isn't "done" until its commit exists.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Step Granularity"; [Edsiel] note: general practice — his standing rule*

### Step granularity

7. **Each step is one action with a checkable result:** write the failing test → run it to make sure it fails → implement the minimal code to make the test pass → run the tests and make sure they pass → commit.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Step Granularity"*

### Plan document header

8. **Every plan starts with this header:**

````markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about the approach]
**Tech Stack:** [Key technologies/libraries]
**Spec:** [path to the spec/design doc this plan implements — the plan argues from the spec, so the spec travels with it; executors read both]
**Rollback anchor:** [last-known-good commit SHA — the commit to return to if the work goes wrong; if the work has no repo yet, say so instead of inventing a SHA]

## Global Constraints

[The spec's project-wide requirements — version floors, dependency limits, naming and copy rules, platform requirements — one line each, with exact values copied verbatim from the spec. Every task's requirements implicitly include this section.]

## Review Focus

[The five input classes or failure modes the spec implies but no task's tests exercise that are most likely to bite a person using this software — one line each, naming the input or condition and the behavior a reasonable person would expect, most likely first.]
````

*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Plan Document Header"; Rollback anchor: general practice — Edsiel's standing rule (a rollback target per project)*

9. **Global Constraints carry the spec's exact values, copied verbatim.** Every task's requirements implicitly include this section — don't repeat them per task, but don't drop them either.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Plan Document Header"*

10. **Review Focus names what the spec is silent about.** The spec is a vision document: it says what the software must do, not everything it will meet, and its silence on an input is not permission for that input to break the program. For each Review Focus line, add the test that pins it to the task that owns the code, in that task's own step style.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Plan Document Header"*

11. **Save plans to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`.** His preferences for plan location override this default.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Overview"*

### Task structure

12. **Each task names its files exactly:** Create `exact/path/to/file` — Modify `exact/path/to/existing:line-range` — Test `tests/exact/path/to/test`.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Task Structure"*

13. **Each task declares its interfaces:** Consumes — what this task uses from earlier tasks, with exact signatures; Produces — what later tasks rely on, with exact function names, parameter and return types. A task's implementer sees only their own task; this block is how they learn the names and types neighboring tasks use.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Task Structure"*

14. **Steps use checkbox (`- [ ]`) syntax for tracking.** Each step carries what makes it unambiguous and nothing more: a test step gives the test's name and its assertions, as code, with the spec's exact values in them; a code step gives the exact signature (name, parameters, return type), the file it lives in, and the specific values the spec pins — the implementer writes the body, and a body appears only for an algorithm the signature and tests do not determine, or for exact copy the spec fixes; a verification step gives the command to run and the output that means it passed; a reference to another task points at that task's Interfaces block instead of repeating its code.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Task Structure" and "What a Step Contains"*

15. **A plan is the set of decisions the implementer cannot make alone.** A plan longer than the code it describes has written the code instead. Lines that decide nothing ("TBD", "handle edge cases", "add appropriate validation", "write tests for the above", a type or function no task defines) are the opposite failure — the self-review catches both.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "What a Step Contains"*

### Self-review

16. **After writing the complete plan, self-review it against the spec with fresh eyes** — a checklist you run yourself, not a subagent dispatch:
    1. **Spec coverage:** skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.
    2. **Step scan:** every step must let the implementer write exactly one reasonable thing, and no step may carry more than that — a line that decides nothing is a gap; a function body the signature and tests already determine is a transcript. Fix both.
    3. **Type consistency:** do the types, method signatures, and property names in later tasks match what earlier tasks defined? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.
    4. **Review Focus:** for each input class or failure mode the spec implies, is there a task whose tests exercise it? The five uncovered ones most likely to bite go in the Review Focus section, each with its test added to the owning task. An empty section means you checked and found none, not that you skipped the check.
    5. **Proportion:** compare the plan's length to the spec's. A plan several times longer than the spec it implements is a transcript of the program, not a plan. If code blocks are most of the document, replace bodies with signatures, test names and assertions, and check that each step is still unambiguous.
    If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Self-Review"*

### Execution handoff

17. **After saving and self-reviewing the plan, link it for Edsiel to read.** Ask him to review the plan and choose an execution method before implementation — do not start implementing until he picks. If he already explicitly supplied an execution method, wait for his review, then use the preserved method.
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Execution Handoff"*

18. **Offer the two execution methods and recommend one:** **Subagent-driven** — a fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review. **Native** — the agent implements every task directly in this session, then one fresh review of the whole branch at the end. Cheapest and fastest; no independent review until the end. Recommend one with one sentence from the plan: how much the tasks depend on each other's interfaces, how many there are, what a shipped mistake would cost. Then ask: does the plan capture what he wants, and which approach should we use?
*Source: obra/superpowers — `skills/writing-plans/SKILL.md`, "Execution Handoff" (adapted: the source names superpowers:subagent-driven-development and superpowers:executing-plans; the harness has no such sub-skills, so the methods are described in generic terms)*

19. **[Edsiel] The plan is written in English; the conversation around it is in Bisaya.** Keep the chat short and simple.
*Source: general practice — Edsiel's standing preference (chat in Bisaya, technical content in English)*

Apply this playbook to the following: $ARGUMENTS
