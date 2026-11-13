---
name: brainstorming
description: 'Find out what Edsiel actually wants — and why — before anything gets built. Ask before you build, lay out the approaches, write a design doc, and get his approval first. Nothing is built until he approves it.'
---

## Skill: brainstorming

### Purpose

Find out what Edsiel actually wants — and why — before anything gets built: read the project first, ask one question at a time, lay out the approaches, and write a design doc he approves. It prevents building the wrong thing well — nothing is built, scaffolded, or installed until the design doc is approved.

### When to use

When to use: before any creative work — a new feature, a new component, a new project, a behavior change, or anything where the shape of the work is not already fully decided. Do NOT use for a quick, clear task where everything that matters is already in the request ("make the icon cornflower blue") — just do it and say what you did.

| Trigger | Example |
| --- | --- |
| A new feature, component, or project is requested and its shape is not fully decided | "Build me a dashboard for the pantry" |
| A behavior change is requested | "Change how claiming works" |
| Edsiel says plan ra / plan mode / plan sa | "Plan ra ni" |

Do NOT use when: the task is a quick, clear change where everything that matters is already in the request — just do it and say what you did. Once a design is approved, `writing-plans` owns the implementation plan; fixing audit findings belongs to `fix-team`.

### Rules

Every rule below is distilled from obra/superpowers — `skills/brainstorming/SKILL.md` (cited per rule). Nothing here is invented — anything the source doesn't cover is labeled "general practice". Rules marked [Edsiel] are adaptations from his standing preferences, not from the source.

### The hard gate — nothing gets built until he approves the design doc

1. **Nothing is built until Edsiel approves the design doc** — the short design for a small change, the full design doc for a project. Building includes writing product code, scaffolding, installing dependencies, creating projects, and invoking an implementation skill. Reading and exploring the codebase are fine.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "HARD-GATE"*

2. **"Plan ra" means plan and WAIT.** Never start building while a design is still being discussed. Approval covers exactly what was shown — "sounds good" to an idea is not approval of a design doc that hasn't been written yet.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "HARD-GATE" and "Red Flags"*

3. **Two exceptions only.** If Edsiel opts out of the questions ("just dive in"), the skill is done and the gate goes with it — state any significant how-it-gets-made choice in one plain line, then do what he asked. A spike he said yes to may be built, but it stays labeled throwaway; keeping what it produced is a new request that comes back through the gate.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "HARD-GATE" and "Your First Message"*

4. **After approval, go straight to writing-plans — automatically, in the same session, and to no other skill.** The moment the design is approved and the design doc is written, invoke the writing-plans skill yourself, with the approved doc as its spec. Do NOT stop to summarize-and-wait, and do NOT make him type `/writing-plans` — the handoff is part of this skill, not a new request. The approved design doc becomes the spec the plan implements.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "HARD-GATE" (writing-plans is the next and only step). The automatic same-session handoff is [Edsiel] — general practice, Edsiel's standing preference (2026-11-13): after brainstorming, writing-plans runs on its own.*

### Look before you ask

5. **Read the project before your first message.** In an existing project, or when he gave context (a spec, a plan, files he pointed at, earlier conversation), read what he referred to and the code it connects to, until you can explain how the relevant parts work today and what the change would touch.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Look Before You Ask"*

6. **Never ask what the project already answers, and never reopen what he already decided.**
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Look Before You Ask"*

### Your first message

7. **Move the work forward in the first message, in about 200 words.** Echo his request back in your own words — what he wants, who it's for, why — so he can see whether you got its shape. Add what you found: how the relevant parts work today, what the change would touch, and anything he may not have considered (a constraint, a conflict, a cheaper path), said plainly. End with one line inviting corrections.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Your First Message"*

8. **If he hasn't told you why, ask about that** — one open question in his own terms, with nothing to pick from. If he has told you why, and the request leaves open something whose answer would change what gets built, ask about the one that would change it most; when its choices can be named, sketch each concretely with what it trades off and which you'd pick.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Your First Message"*

9. **If nothing is open, end with the short design itself** — the approach, a line on why the others don't fit, and the design in a few lines — and ask him to approve it. His approval covers the approach and the design: write the short design doc as approved and go on to the plan.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Your First Message"*

10. **If he didn't ask for a brainstorming conversation, end with a light one-line offer to just get going** ("Or if you'd rather I just dive in, say so."). If he takes you up on it, this skill is done.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Your First Message"*

### The conversation

11. **Ask a question only when the answer would change what gets built** and neither the request nor the project answers it. Otherwise state your call and your reason as a proposal he can correct, and move forward. Process steps are always your calls: writing things up, where files go, looking further, how to show something — do them and say so.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

12. **Ask one at a time.** Use plain language, pitched just a little above where he is. Match his vocabulary; never use process jargon. Never quote this skill to him.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

13. **[Edsiel] Ask in Bisaya, one question at a time — especially when he is tired or overwhelmed.** Keep it short and simple; no lectures, no overload.
*Source: general practice — Edsiel's standing preference (chat in Bisaya; keep explanations short when he is tired)*

14. **Get him describing.** Until you know why he wants it, ask open questions with no example answers attached — his own words carry intent your options can't. Once you know why, and a decision has choices you can name, sketch each concretely with what it trades off and which you'd pick. When he says "just guess" or "what do you think?", propose something concrete.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

15. **How it gets made.** Read from how he talks which how-choices he wants to make. Someone who raises the how or asks about trade-offs wants the options with your pick. Someone who talks about outcomes is handing you the how: make those calls and state each in a line. When there's existing work, build on what it already uses. Any choice you make goes in the design as your call, never as something he agreed to.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

16. **Cover this ground — territory, not a script; never read these out as questions:** what kind of thing this is and what makes it special; why now and what success looks like to him; goals, non-goals, and anti-goals (what would make this a failure even if it technically works); prior art — what he's seen elsewhere, loved or hated; current state — what exists now, what he's tried; the details he cares about.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

17. **Make every question specific** to his project and what he's told you. Build each question on his last answer or on something you found, so it helps him think through a consequence or a case he may have missed. When the reason isn't already plain, say what you're hoping to learn or what the answer would change. A proposal he can correct, plus your reason, often beats a question.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

18. **Do recon.** Once you have a bit of grounding and looking further would help, go look — deeper into his codebase or project, his own files and data, or the web. Say what you looked for and what you found.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation"*

### Lay out the approaches

19. **Once you understand what he wants, before you write anything up, put the ways of building it in a message of its own.** Come up with several real alternatives and drop the weak ones — including any that work against why he wants it and any the existing work rules out. Sketch the two or three that remain concretely enough to picture, grounded in what the project actually does, with what each trades off. Recommend one and say why, then ask which way he wants to go; if he's handed you the how, say you'll go with your pick instead. When there's genuinely one sensible way, say so and explain why the others don't fit — the design comes in the next message.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation" (Lay out the approaches)*

### Show, don't tell

20. **Whenever seeing would help more than reading, sketch it in text** — a few lines of what he'd see. Offer the visual companion when the look itself is his to decide: something he'll look at (a screen, a page), a layout, a flow, options that would look different from each other, a structure easier to see than read (diagram, timeline, map).
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation" (Show, don't tell)*

21. **[Edsiel] Picture-first for UI decisions.** Before asking him to approve anything visual, show him a picture — a generated image or a mockup — and let him react to it. Never ask him to approve a look he hasn't seen.
*Source: general practice — Edsiel's standing preference (picture-first for UI/design decisions)*

22. **Offer the visual companion just-in-time, never upfront.** Offer it the first time a visual moment comes up, as its own message with nothing else in it: "This might be easier if I show you. Want me to open a browser tab with some mockups?" If he declines, stay in text and don't offer again unless he raises it.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Visual Companion"*

23. **Per question, ask: would he understand this better by seeing it?** Mockups, layouts, diagrams, and side-by-side designs go in the visual. Requirements, scope, tradeoffs, and conceptual choices stay in text. A question about a UI topic isn't automatically a visual question.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Visual Companion"*

### Play it back

24. **Play back as you go.** As soon as you understand one part well enough to describe it, describe that part back in about 200–300 words, then return to questions about the next part. Playback and questions alternate through the whole conversation; the last chunk covers whatever is left.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Play It Back"*

25. **Only what he said goes in as his.** Anything you filled in goes in as your proposal, with your reason. End each chunk by asking what's wrong or missing.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Play It Back"*

26. **Before you send a chunk, check it:** does it describe something he'll look at — a page, a screen, a schedule, a printout? If so, put a text sketch next to the description. If the look itself is his to decide and he hasn't seen the visual companion offer yet, send the offer instead and hold the chunk for the next message. Once he's accepted, put a mockup next to the description.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Play It Back"*

### Size the work

27. **Once he understands what he wants and has picked an approach, say how big the work is in plain words.** A small change gets a short design: what you already covered together, written down. A project gets the full written design below. He can override the size.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Size the Work"*

28. **If it grows mid-task, stop, say so, and step up a size.** If this is really several independent projects, say so, agree on an order, and brainstorm them one at a time.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Size the Work"*

### The written design

29. **Write a plain document a talented builder could plan from without going back to him.** Cover: intent and the why; goals, non-goals, anti-goals; constraints; approaches (the two or three considered, what each trades off, which one he picked, and why); the parts of the how he decided, as he decided them; what's left to the builder. A small change covers the same points in a line or two each and goes straight to him, without the builder check.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Written Design"*

30. **Where it goes:** in a software repo, `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, committed. Otherwise, pick a sensible place and say where. His preferences override both.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Written Design"*

31. **Builder check (for a project).** Before handing the doc over, have a fresh reviewer read it as the builder would — dispatch a fresh subagent, or if no subagent is available, read the document yourself as that builder. Sort what the builder asks into three piles: answered already by the conversation or the project (put the answer in the doc); minor — a sensible builder could settle it without changing what gets built (settle it yourself, mark it in the doc as your call); theirs — only he can answer it, and the answer changes what gets built. Bring the "theirs" pile in one message, most important first. Update the doc with his answers, then hand it over with a short list of the calls you made so he can check those while reading. That's the only round of questions the check produces.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Written Design"*

32. **[Edsiel] The design doc is written in English; the conversation around it is in Bisaya.** Keep the chat short and simple — no lectures.
*Source: general practice — Edsiel's standing preference (chat in Bisaya, technical content in English)*

### Spikes

33. **Offer a spike when a quick throwaway build is the cheapest way to learn what he wants or whether something works.** Spikes get no tests or minimal ones, aren't bulletproof, and skip the plan, implementation, and review process. Bring what the spike taught you back into the conversation. When he just wants to spike, get out of the way.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "The Conversation" (Spike to feel things out)*

### Red flags

34. **"I'll offer a menu of what he might want"** — options steer. Ask him to describe it first.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Red Flags"*

35. **"I'll fill in sensible defaults"** — good, but say them out loud. A default he never heard is one he couldn't reject.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Red Flags"*

36. **"I've answered his questions, so I'll write the doc"** — lay out the approaches first, in a message of their own (or, when nothing was open from the start, in your first message's short design).
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Red Flags"*

37. **"I should explain the process first"** — ask your question. The process shows itself.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Red Flags"*

38. **"The spike works, I'll keep building on it"** — keeping it is a new request. Back through the gate.
*Source: obra/superpowers — `skills/brainstorming/SKILL.md`, "Red Flags"*

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Nothing was built, scaffolded, or installed before Edsiel approved the design doc (rule 1)
- [ ] The project was read before the first message, and no already-decided question was reopened (rules 5–6)
- [ ] Questions were asked one at a time, in Bisaya, and only when the answer would change what gets built (rules 11–13)
- [ ] The approaches were laid out in a message of their own, with a recommendation, before anything was written up (rule 19)
- [ ] The written design covers intent, goals and non-goals, constraints, approaches, and the parts of the how he decided (rule 29)
- [ ] The builder check was run for a project-sized design and its open questions were brought in one message (rule 31)

### Examples

**Do:** echo the request back in your own words in about 200 words, add what you found in the project and what the change would touch, and end with one line inviting corrections.

**Do not:** offer a menu of what he might want, or fill in sensible defaults without saying them out loud — a default he never heard is one he could not reject.

### Sources

- Distilled from obra/superpowers — `skills/brainstorming/SKILL.md` (cited per rule in the Rules section). Rules marked [Edsiel] are adaptations from his standing preferences, not from the source.

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
