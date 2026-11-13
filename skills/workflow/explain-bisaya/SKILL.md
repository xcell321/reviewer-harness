---
name: explain-bisaya
description: After each task, explain the changes in simple Bisaya (Cebuano).
version: 1.0.0
---

## Skill: explain-bisaya

### Purpose

Explain, after every task and before declaring it done, what changed, in which files, and why — in simple Bisaya (Cebuano) the user can follow at a glance. It prevents finished work from being a black box: jargon is defined, changed files are listed, and anything unfinished or uncertain is said plainly.

### When to use

When to use: after every task, before declaring it done.

| Trigger | Example |
| --- | --- |
| A task has just been completed and is about to be declared done | "Human na — explain what changed" |
| A bug was fixed and the fix needs reporting | "What was the bug and how did you fix it?" |
| Work is partly unfinished or uncertain and that must be surfaced | "Which part is not verified yet?" |

Do NOT use when: no task has been done yet, so there is nothing to explain — or the deliverable itself is a written document or plan, which `brainstorming` and `writing-plans` keep in English while the conversation around them stays in Bisaya.

### Rules

- Explain in **simple Bisaya (Cebuano)** what changed, in which files, and why.
- Avoid heavy jargon; if you use an English technical term, define it in one sentence.
- List the files that changed and, if any, what the user should check themselves.
- If something is unfinished or uncertain, say so plainly — never cover it up.

### Say it like this (examples)
- Done: "Human na, dawg — [what finished]. Ang gi-usab kay [files], kay [why]."
- Fixed: "Ang bug kay [what was wrong]. Gi-ayo nako pinaagi sa [how]. I-test nako: [result]."
- Unsure: "Dili pa ko sure ani nga bahin — [what is unverified]. Akong i-check pa."

### Analogies (when a technical idea needs one)
Use everyday comparisons the user already knows:
- An API key is like a house key — don't share it, and change it if it's lost.
- A database is like a filing cabinet — organized drawers, one place per record.
- A migration is like moving house with a checklist — every item listed, nothing left behind.
- A cache is like a sticky note — fast to read, but it can go stale, so check the source when it matters.
- A session/refresh token is like a spare house key the app keeps for you — it lets you back in without knocking (no password again); if it's stolen, change the locks (revoke it) and get a new one.

### Quick glossary (English term → simple Bisaya)
- bug = sayop sa code; deploy = i-live ang app; database = tipiganan sa data; API = paagi nga mag-storya ang duha ka app; cache = temporary nga kopya para paspas; migration = pagbalhin/pag-update sa database structure; test = pagsulay kung mo-gana ba gyud.

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] The explanation is in simple Bisaya (Cebuano), not English
- [ ] What changed, in which files, and why are all stated
- [ ] Every English technical term used is defined in one sentence
- [ ] The files that changed are listed, plus anything the user should check themselves
- [ ] Anything unfinished or uncertain is said plainly, never covered up

### Examples

- Done: "Human na, dawg — [what finished]. Ang gi-usab kay [files], kay [why]."
- Fixed: "Ang bug kay [what was wrong]. Gi-ayo nako pinaagi sa [how]. I-test nako: [result]."
- Unsure: "Dili pa ko sure ani nga bahin — [what is unverified]. Akong i-check pa."

### Sources

No external source is cited in this skill; the rules stand as written (general practice).

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.
