---
description: 'Name the user''s target and action registers before building, pushing, or planning, and ask one clarifying question when they are ambiguous.'
---

## Skill: instruction_registers

### Purpose

Name the user's target register (whose workspace or repo the work belongs to) and action register (plan-only versus build directly) before building, pushing, or planning. It prevents the two costliest misreads: work landing in the wrong repo, and building when the user only asked for a plan.

### When to use

| Trigger | Example |
| --- | --- |
| Edsiel gives an instruction whose target could be his own workspace or the reviewer-harness repo | "I-apply ni sa imoha" |
| Edsiel sets the action with plan ra, plan mode, buhata, paganaha, or code | "Plan ra ni" / "Buhata ni" |
| A build, skill install, or push is about to start and the register is not yet explicit | "Push this to the harness" |

Do NOT use when: the target and the action are already explicit and unambiguous in the request — state the registers in your working notes and proceed. The design-approval conversation itself belongs to `brainstorming`, and turning an approved spec into tasks belongs to `writing-plans`.

### Rules

### Name the target register

- Treat "sa imoha" or "imoha" as the agent's own workspace (its local skills and memory), never the reviewer-harness repo.

- Treat phrasing like "buhata ug kaugalingon nako nga skills adto sa reviewer harness" as the reviewer-harness repo, the reverse of "sa imoha".

- State the target in your working notes before any build, skill install, or push, so the register is explicit.

### Name the action register

- Treat "plan ra", "plan mode", or "plan sa" as present the plan and wait, and never implement from a plan-mode turn.

- Treat "buhata", "paganaha", or "code" as build directly without a plan round.

- Treat standing "always allow" as skipping agent confirmation rounds on assigned tasks, while a runtime-level approval prompt is outside your control, so explain it as such instead of treating it as you asking.

### Ask once when unsure

- Ask exactly one clarifying question before building or pushing when the target or the action is ambiguous.

- Prefer the question over a guess, since a wrong-repo push cannot be undone and no force-push is available in your tools.

### Available connectors

- Use the runtime's own search and setup to find other connectors and related skills.

- If nothing here fits, look on the web for a maintained API or MCP server and set it up through the runtime's own connector/MCP setup, or build a custom connector.

### Alternatives for better results

- Confirm the corrected register back and update memory when the user corrects a register, so the next turn starts from the right target.

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] The target register is stated in the working notes before any build, skill install, or push
- [ ] The action register is named: plan-and-wait for plan ra / plan mode / plan sa, build directly for buhata / paganaha / code
- [ ] No implementation was started from a plan-mode turn
- [ ] When the target or action was ambiguous, exactly one clarifying question was asked before building or pushing
- [ ] A corrected register was confirmed back and memory updated when the user corrected it

### Examples

**Do:** when Edsiel says "sa imoha", treat it as the agent's own workspace, state that target in your working notes, and build there.

**Do not:** treat "sa imoha" as the reviewer-harness repo, or guess the repo when the phrasing is ambiguous — a wrong-repo push cannot be undone, so ask exactly one clarifying question first.

### Sources

No external source is cited in this skill; the rules stand as written (general practice).

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
