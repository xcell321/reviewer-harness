---
name: fix-team
description: 'Run an 11-agent fix — 8 domain fixers (audit-team''s eight areas; the backend fixer also applies ub-mode, and the frontend fixer also applies design-taste-frontend, ui-ux-pro-max, and vengeance-ui) plus ub-mode, superpowers, and a verification agent — over an audit report''s findings, each applying the relevant skills, fix-only, no new features. The fix plan is written first and approved by the user; the verification agent runs last. Merged verification with the coordinator; the user picks what to fix.'
---

## Skill: Fix Team (fix-team)

### Purpose

Fix an audit report's findings with eleven agents in a fixed order: a superpowers agent writes the fix plan first and holds the gate until the user approves it, nine domain and area fixers then fix in parallel, and a verification agent runs last and fixes what verification catches. It prevents feature creep and unverified fixes — fix-only, every fix backed by the finding's file:line and test or build evidence.

### When to use

When to use: the user asks for a fix team, a fix run, or "/fix-team" on an audit report — or after an audit-team run, to fix what it found. Always fix-only: fixers fix the audit's findings, never add features, never redesign.

| Trigger | Example |
| --- | --- |
| The user asks for a fix team or a fix run on an audit report | "Run /fix-team on this audit report" |
| An audit-team run has finished and the user picked findings to fix | "Fix the Blockers and Warnings I picked" |
| A previous fix round needs its fixes re-verified | "Verify the fixes from the last round" |

Do NOT use when: no audit report exists yet or the findings still need to be found — `audit-team` owns the report-only audit. Planning a new feature belongs to `brainstorming` and `writing-plans`, not to a fix run.

### Rules

Every rule below is built from the harness's own skills (cited per agent) and from the fix pattern proven on the Community Pantry repo (fix rounds 4, 5, 5.1, 6, 7 — each fixed what the audit found, with central re-verification). If a rule doesn't apply, say why.

### The team — eleven agents

The superpowers agent runs FIRST (it writes the fix plan). The nine fixers run in parallel after the plan is approved. The verification agent runs LAST (it verifies every fix and fixes what verification catches). The coordinator is not one of the eleven — it merges, verifies centrally, and prepares the push.

| # | Agent | Harness skills it applies | What it fixes |
|---|---|---|---|
| 1 | **api-security** | api-security | Auth, RLS, RPCs, Edge Functions — fix per the 14 rules |
| 2 | **devops** | nodejs-quality (DevOps Basics section) | Docker images, graceful shutdown, health checks, logging, memory guards |
| 3 | **ux-edge-states** | ux-edge-states | Loading / empty / error / offline states, keyboard + screen-reader access, dark mode |
| 4 | **backend-performance** | nodejs-quality (Backend Performance section) | Queries, N+1, missing indexes, re-renders, Edge Function cost |
| 5 | **system-design** | system-design | Status transitions, trust boundaries, races, idempotency |
| 6 | **backend** (area) | safe-editing, debug-first, owasp-top10, nodejs-quality, rea, ub-mode | Code correctness and quality across the whole backend |
| 7 | **frontend** (area) | motion-design, frontend-performance, design-taste-frontend, ui-ux-pro-max, vengeance-ui | Real animations, render performance, visual quality, anti-slop |
| 8 | **devops** (area) | nodejs-quality (the CI guidance in its DevOps Basics section) | The live shipping path: tests, build, lint, typecheck, migrations, deploy config |
| 9 | **ub-mode** | ub-mode | Clean Code organization across the whole fix: TDD first, smallest edit, CRAP < 10, duplication ≥ 0.8 out, small ordered commits + log |
| 10 | **superpowers** | writing-plans, brainstorming | The fix plan first (file map, rollback anchor, bite-sized TDD tasks, each ending in a commit) + the hard gate (no fix until the user approves the plan) |
| 11 | **verification** | verify_before_done (incl. its merged provider-claims and publish-surface sections), instruction_registers, playwright-cli | The fixer at the last: re-checks every fix (defined AND called, remote evidence, publish/install surfaces) and fixes what verification catches. For fixes touching a runnable web UI, it also drives the real app with playwright-cli — a UI fix is not verified by reading code alone |

**Every agent also applies safe-editing, debug-first, no-hallucination, instruction_registers** — surgical edits only; root-cause first; every fix cites the finding's file:line + evidence; the target and action registers are named before building, and exactly one clarifying question is asked when they are ambiguous.

**The report is written with explain-bisaya** — fixes in plain Bisaya, technical detail (file paths, code, SQL, test output) in English.

**Not applied, on purpose: clone.** Clone is a build skill (reproduce a design from a URL) — there is nothing for it to fix. Listing it as "applied" would be a label, not a real fix. If the target itself is a clone task, run `clone` separately, not inside a fix.

1. **Verify the target and the audit report before fixing.** Confirm the exact commit under fix (remote HEAD, not a stale local clone), that the tree the agents read is byte-identical to it, and that every finding being fixed has file:line + evidence. A finding without a location is not fixed — it is sent back.
   *Source: Pantry fix rounds — the local clone was stale at `8c73c5f` while remote had moved; fixes ran on a fresh snapshot of remote HEAD instead.*

2. **Superpowers first: write the fix plan, then get approval, then fix.** The superpowers agent writes the fix plan (writing-plans): file map first, rollback anchor (last-known-good SHA), bite-sized TDD tasks, each ending in a commit. Nothing is fixed until Edsiel approves the plan (brainstorming hard gate — "plan ra" means plan and WAIT). Approval covers exactly what was shown — approval of the audit report is not approval of the fix plan.
   *Source: obra/superpowers — brainstorming (HARD-GATE) + writing-plans (plan header, task structure); Pantry fix rounds 4–7 all ran audit-then-fix with his pick in between.*

3. **Spawn the nine fixers in parallel, each with its brief and its files.** Give each agent its findings, its skill list, the target commit, and the fix-only rule. No two agents edit the same file — the plan's file map assigns ownership, and the coordinator resolves any overlap before the run. The agent reads its skills first — a skill that was never read cannot take effect.
   *Source: the harness skills themselves (`skills/<category>/<name>.md`); Pantry fix rounds ran parallel fixers this way.*

4. **Fix-only, always.** Fixers fix what the audit found — nothing more. Never add a feature, never redesign, never "improve" beyond the finding ("ayaw ayoha ang dili guba" — don't fix what isn't broken). A finding the user did not pick is left alone, not fixed.
   *Source: the user's standing triage rule; Pantry rounds 4–7 fixed only what he picked.*

5. **TDD first, smallest edit, root cause.** Write the failing test before changing code; see it fail for the reason you expect; make the smallest change that makes it pass. Fix the cause, not the symptom — a guard that only hides the crash is not a fix. Reproduce the finding before fixing it.
   *Source: ub-mode (TDD, Laziness Protocol, Fix Root Causes) + debug-first.*

6. **Every fix needs evidence.** The finding's file:line + the test/build output that proves the fix. A fix without a passing test (or a stated reason an honest test is impractical) is not a fix — it is a claim. A definition with no call site is an untested change, not a fix. A pass on mocked data proves the code logic only, never the live behavior.
   *Source: no-hallucination + verify_before_done (defined AND called, re-run every affected suite, mock passes are logic-only).*

7. **Verification runs last and fixes what it catches.** The verification agent re-checks every fix against the finding, names the target and action registers before touching anything, checks provider claims and publish/install surfaces where the fix touches them, and fixes whatever the verification catches — then re-verifies its own fix. A fix that does not survive verification is not reported as done. Never present a guess as done — label untested work as untested and name what remains. Where a fix touches a web UI and the app can be run (dev server or deployed URL), verification must exercise the changed flow in a real browser via playwright-cli and attach the evidence (screenshot, snapshot, or a generated Playwright spec that passes) — code-reading alone does not verify a UI fix; if the app cannot be run, say so and label the UI fix unverified-at-runtime.
   *Source: verify_before_done (remote evidence, never present a guess as done), its merged provider-claims section (check the live source first) and publish-surface section (check each surface in order; never say live from a push alone), instruction_registers (name the registers; ask once when unsure); playwright-cli runtime evidence — adoption test 2026-11-12 (TodoMVC: CLI session → generated spec → `npx playwright test` 1 passed).*

8. **The coordinator merges, dedupes, and verifies centrally — then stops.** One merged report: counts by severity, fixes grouped by agent, regressions called out first. The coordinator re-runs the gates itself (tests, build, lint, typecheck, PGlite/Deno where they apply) — a pass count is not proof, check the exit code and the "Errors" line too. Then it prepares the push manifest (NUL-delimited, trailing NUL, count verified). It never pushes — the push is a separate decision by the user.
   *Source: Pantry fix rounds — central re-verification caught the capitalised-tag mismatch in round 6; push approvals are one-time per file.*

9. **Check regressions against the previous round.** When a prior fix round exists, re-check the findings that round claimed to fix. A fix that did not hold is a Blocker, even if it looks small.
   *Source: Pantry audit round 3 found 1 regression among otherwise-holding round-2 fixes.*

10. **Keep a log; commit small and often.** Every agent keeps a log of every action and the reason, and reports that log on completion. Each task ends in a small ordered commit that says why, what changed, and how it was proved. Work the code does in CRAP ≥ 10 or with duplication ≥ 0.8 is split, tested, or de-duplicated before the commit — where the crapper/dryer/mutator tools are not installed, the same thresholds are applied by manual review, and the agent says so.
    *Source: ub-mode (Keep a Log, Commit and Push, Crapper, Dryer, Mutator) + writing-plans (each task ends with a commit).*

### Agent briefs (copy into each agent's brief)

**1 — api-security fixer brief:** "Fix the api-security findings in <audit report> on <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: api-security. Fix: auth, RLS policies, RPCs and Edge Functions, rate limits — per the skill's 14 rules. Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**2 — devops fixer brief:** "Fix the devops findings in <audit report> on <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: nodejs-quality — its DevOps Basics section. Fix: Docker images, graceful shutdown, health checks, logging, memory guards — per the skill's 12 rules. Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**3 — ux-edge-states fixer brief:** "Fix the ux-edge-states findings in <audit report> on <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: ux-edge-states. Fix: loading / empty / error / offline states, keyboard operability, screen-reader labels, dark mode. Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**4 — backend-performance fixer brief:** "Fix the backend-performance findings in <audit report> on <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: nodejs-quality — its Backend Performance section. Fix: queries (N+1, missing indexes, unbounded selects), re-renders and fetch loops, Edge Function cost, caching. Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**5 — system-design fixer brief:** "Fix the system-design findings in <audit report> on <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: system-design. Fix: status transitions, trust boundaries, races and idempotency, scale. Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**6 — backend area fixer brief:** "Fix the backend findings in <audit report> on <repo> at <commit> as a whole. Read these skills first and apply them genuinely, not as labels: safe-editing, debug-first, owasp-top10, nodejs-quality, rea, ub-mode. Fix: code correctness and quality (surgical edits, readable at a glance, separated files, no spaghetti, no hardcoded values, nothing unnecessary); error handling (no swallowed errors, no silent failures); OWASP Top 10 coverage; Node quality rules; trace unfamiliar flows end-to-end before fixing them. Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**7 — frontend area fixer brief:** "Fix the frontend findings in <audit report> on <repo> at <commit> as a whole. Read these skills first and apply them genuinely, not as labels: motion-design, frontend-performance, design-taste-frontend, ui-ux-pro-max, vengeance-ui. Fix: animations are real motion, not static visuals; render performance; visual quality (no generic purple-blue gradients, no floating orbs, no identical glass cards); contrast (WCAG AA on text over gradients). Fix-only — fix what the audit found, nothing more. TDD first: failing test, smallest fix, tests pass. Every fix: finding file:line, what you changed, and the test/build output proving it."

**8 — devops area fixer brief:** "Fix the shipping-path findings in <audit report> on <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: nodejs-quality — in particular the CI guidance in the 'Also apply' part of its DevOps Basics section. Fix: CI green on this exact commit, tests really passing (pass count AND exit code AND the 'Errors' line), build, lint, and typecheck clean, migrations idempotent and re-runnable, deploy config matching the live target, no secrets in the repo. Fix-only — fix what the audit found, nothing more. Every fix: finding file:line or run URL, what you changed, and the command output proving it."

**9 — ub-mode fixer brief:** "Make the fixes in <fix run> on <repo> at <commit> clean and organized. Read this skill first and apply it genuinely, not as a label: ub-mode. Enforce across the whole fix: TDD first (failing test before the change); smallest edit that solves the problem (one decision lives in one place); sequence the work into verifiable units (finish one small unit and check it, then start the next); fix root causes, not symptoms; every function under CRAP 10; duplication ≥ 0.8 eliminated; small ordered commits, each saying why, what changed, and how it was proved; a log of every action and the reason. Where the crapper/dryer/mutator tools are not installed, apply the same thresholds by manual review and say so. Fix-only — organize what the audit found, nothing more. Every fix: finding file:line, what you changed, and the test/build output proving it."

**10 — superpowers fixer brief:** "Write the fix plan for <audit report> on <repo> at <commit>, and hold the gate. Read these skills first and apply them genuinely, not as labels: writing-plans, brainstorming. Map the files first (which files are created or modified, what each is responsible for); write the plan with the header (Goal, Architecture, Tech Stack, Spec, Rollback anchor: last-known-good SHA), Global Constraints, and Review Focus; bite-sized TDD tasks, each ending in a testable deliverable and a commit, steps in checkbox syntax. Nothing is fixed until the user approves this plan — the hard gate. If the spec covers multiple independent subsystems, split them into separate plans. Self-review the plan against the audit report (spec coverage, step scan, type consistency, Review Focus, proportion) and fix it inline."

**11 — verification fixer brief:** "Verify the fixes in <fix run> on <repo> at <commit>, and fix what verification catches. Read these skills first and apply them genuinely, not as labels: verify_before_done (including its merged provider-claims and publish-surface sections), instruction_registers, playwright-cli. Re-check every fix: is the changed code defined AND called (or imported and used)? Re-run every affected suite after every change — do not reuse a passing result from before the change. Treat a mock pass as logic-only evidence. Get remote evidence (a pushed SHA exists on origin) before calling anything pushed. Name the target register (the agent's own workspace vs the reviewer-harness repo) and the action register (plan vs build) before touching anything; ask exactly one clarifying question when they are ambiguous. Where a fix touches a provider claim, check the live source first and quote it; where it touches a published version, check each surface in order (commit/tag, registry, installed file) and name the version on each. Where a fix touches a web UI and the app can be run (dev server or deployed URL), drive the changed flow with playwright-cli: snapshot, perform the flow, screenshot the result, and where practical leave a passing Playwright spec as the evidence; if the app cannot be run, state that and label the UI fix unverified-at-runtime. Fix what verification catches, then re-verify your own fix. Never present a guess as done — label untested work as untested and name what remains. Every result: fix file:line, what you checked, the evidence, and what you fixed if anything."

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Target commit + audit report verified (agents fixed the right code, from real findings)
- [ ] Fix plan written (writing-plans) and approved by the user before any fix
- [ ] All eleven agents ran in their order (superpowers first, nine fixers parallel, verification last), each read its skills first
- [ ] Every fix has finding file:line + test/build evidence; no feature added, nothing fixed that the user did not pick
- [ ] Coordinator re-ran the gates centrally (tests, build, lint, typecheck, PGlite/Deno where they apply) — exit codes checked, not just pass counts
- [ ] Regressions from the previous round re-checked and called out first
- [ ] Push manifest prepared (NUL-delimited, trailing NUL, count verified); nothing pushed
- [ ] Report in Bisaya, technical detail in English

### Examples

**Do:** for one picked finding, write the failing test first, watch it fail for the expected reason, make the smallest fix that turns it green, and report the finding's file:line with the test output.

**Do not:** add a feature, redesign, or fix a finding the user did not pick while fixing the ones they did.

### Sources

- OWASP Top 10 (owasp-top10, api-security): https://owasp.org/www-project-top-ten/
- Node.js best practices (nodejs-quality, incl. its merged backend-performance and devops-basics sections): https://github.com/goldbergyoni/nodebestpractices
- System Design Primer (system-design): https://github.com/donnemartin/system-design-primer
- Front-End Checklist (frontend-performance): https://github.com/thedaviddias/Front-End-Checklist
- GSAP / GreenSock (motion-design): https://gsap.com/
- 12 API security rules reel (api-security): Code Crack — "12 API Security Rules"
- 10 UX states reel (ux-edge-states): Strategy Fox — "10 UX States"
- Clean Code (safe-editing, ub-mode): Robert Martin — *Clean Code*
- ub-mode skill (source): https://github.com/unclebob/ub-mode
- Vengeance UI (vengeance-ui): https://github.com/Ashutoshx7/vengeance-ui
- Superpowers (brainstorming, writing-plans): https://github.com/obra/superpowers
- verify_before_done (incl. its merged verify_provider_claims and verify_publish_install_surface sections), instruction_registers: reviewer-harness skills, distilled from the user's recurring work (daily skill-review loop) — no external source

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

Apply this playbook to the following: $ARGUMENTS
