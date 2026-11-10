---
description: Name the user's target and action registers before building, pushing, or planning, and ask one clarifying question when they are ambiguous.
---

## Skill: instruction_registers

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

Apply this playbook to the following: $ARGUMENTS
