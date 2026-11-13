---
name: skill-id
description: One sentence: what this skill makes the agent do, and when it applies. This text is how an agent decides to load the skill, so name the job and the trigger, not the marketing.
version: 1.0.0
---

## Skill: Skill Name (skill-id)

<!--
  HOW TO USE THIS TEMPLATE — delete every HTML comment in the real skill.
  Copy this file to skills/<category>/<skill-id>/SKILL.md and fill every section.

  House rules (reviewer-harness):
  - Every rule cites its source. A concept the sources do not cover is labeled
    "general practice". Never invent a rule.
  - Rules are checkable: a reviewer must be able to verify each rule in the work.
  - Versioning is per skill, SemVer:
      patch — wording, typos, examples; the rules do not change
      minor — a rule is added or its meaning changes
      major — the skill's purpose or scope changes
  - Every change adds a Changelog entry and bumps the version in the same commit.
-->

### Purpose

Two or three lines: the job this skill does and the failure it prevents.

### When to use

| Trigger | Example |
| --- | --- |
| The user asks for the job this skill owns | "…" |
| The task involves this skill's domain | … |
| Another skill points here | … |

Do NOT use when: name the neighboring skill that owns that case instead.

### Rules

1. **Rule name** — the rule, stated so a reviewer can check it in the work. Source: where this rule comes from.
2. **Rule name** — the rule. Source: …

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] …
- [ ] …

### Examples

**Do:** the smallest concrete example of the rules applied.

**Do not:** the failure the rules exist to prevent.

### Sources

- Distilled from <source name> (<url>): rules <n–m>.
- Merged <YYYY-MM-DD> from <skill-id> (<provenance>) — only where applicable.

### Changelog

- 1.0.0 — <YYYY-MM-DD> — Initial version under the house template.
