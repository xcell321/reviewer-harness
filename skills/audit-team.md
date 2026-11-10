---
name: audit-team
description: Run a 3-agent parallel audit (backend, frontend, DevOps) over a target repo — each agent applies the relevant reviewer-harness skills, report-only, no edits. Merged triage with severities; the user picks what to fix.
---

## Skill: audit-team

When to use: the user asks for a team audit, a full review, or "/audit-team" on a repo — or after a big fix round, to verify the fixes held and catch regressions. Always report-only: auditors read, never edit.

Every rule below is built from the harness's own skills (cited per agent) and from the audit pattern proven on the Community Pantry repo (audit rounds 1–3, round 3: 5 auditors, 65 findings, merged at `799b3b6`). If a rule doesn't apply, say why.

### The team — three agents, in parallel

Spawn all three at once. Each agent first reads its assigned skill files in full, then audits only its area. No agent edits code, runs migrations, or pushes — report-only.

| Agent | Harness skills it applies | What it checks |
|---|---|---|
| **Backend** | safe-editing, debug-first, api-security, owasp-top10, backend-performance, system-design, nodejs-quality, rea | API security (auth, RLS, RPCs, Edge Functions), data integrity (status transitions, race conditions, idempotency), query cost (N+1, missing indexes), error handling, code quality (readability, dead code, hardcoded values) |
| **Frontend** | ux-edge-states, motion-design, frontend-performance | Loading / empty / error / offline states, keyboard + screen-reader access, dark mode, real animations (not static visuals), render performance, contrast |
| **DevOps** | devops-basics | CI (green on the target commit), tests (real pass count + exit code, not just the summary line), build, lint, migrations (idempotent + re-runnable), deploy config, secrets handling |

**Every agent also applies no-hallucination** — every finding cites a real file and line, and every claim about what runs or passes is backed by evidence the agent actually saw.

**The report is written with explain-bisaya** — findings in plain Bisaya, technical detail (file paths, code, SQL) in English.

**Not applied, on purpose: clone.** Clone is a build skill (reproduce a design from a URL) — there is nothing for it to audit. Listing it as "applied" would be a label, not a real check. If the target itself is a clone task, run `clone` separately, not inside an audit.

### Rules

1. **Verify the target before auditing.** Confirm the exact commit under audit (remote HEAD, not a stale local clone) and that the tree the agents read is byte-identical to it. Auditing the wrong commit produces findings about code that no longer exists.
   *Source: Pantry audit round 3 — the local clone was stale at `8c73c5f` while remote had moved; the audit ran on a fresh snapshot of remote HEAD instead.*

2. **Spawn the three agents in parallel, each with its brief.** Give each agent its area, its skill list, the target commit, and the report-only rule in its brief. The agent reads its skills first — a skill that was never read cannot take effect.
   *Source: the harness skills themselves (`skills/<name>.md`); Pantry audit round 3 ran 5 parallel auditors this way.*

3. **Report-only, always.** Auditors never edit, fix, migrate, or push. A finding that was "fixed" by an auditor without the user picking it is not a finding — it is an unapproved change.
   *Source: harness rule #1 (edit surgically, only what the task requires) + the user's standing rule that he picks what to fix.*

4. **Every finding needs evidence.** File path + line number + what happens (or the exact error/output). A finding without a location is an opinion, not a finding — drop it or mark it unverified.
   *Source: no-hallucination (`skills/no-hallucination.md`).*

5. **Grade every finding: Blocker / Warning / Suggestion.** Blocker = broken, insecure, or data-losing in real use. Warning = works today, breaks or leaks under real conditions. Suggestion = polish for later. Never inflate a Suggestion into a Blocker to make the report look serious.
   *Source: Pantry audit round 3 triage (8 Blockers, 29 Warnings, 28 Suggestions).*

6. **Check regressions against the previous round.** When a prior fix round exists, each agent re-checks the findings that round claimed to fix. A fix that did not hold is a Blocker, even if it looks small — a regression means the verification step failed, not just the code.
   *Source: Pantry audit round 3 found 1 regression (donor exact addresses readable via API again) among otherwise-holding round-2 fixes.*

7. **The coordinator merges, dedupes, and triages — then stops.** One merged report: counts by severity, findings grouped by agent, regressions called out first. No maximal fix plan: the user picks what to fix ("ayaw ayoha ang dili guba" — don't fix what isn't broken). Never start fixing in the same run as the audit.
   *Source: the user's standing triage rule; Pantry audit rounds 1–3 were all report-only, fix was a separate decision.*

8. **Verify the verification.** The coordinator spot-checks each agent's headline claims (re-read the cited file, re-run the cited command) before the report goes to the user. A pass count is not proof — check the exit code and the "Errors" line too.
   *Source: Pantry round 2 — "70/70 tests pass" hid 1 unhandled error; the suite's exit code was the real signal.*

### Agent briefs (copy into each agent's brief)

**Backend agent brief:** "Audit the backend of <repo> at <commit>. Read these skills first and apply them genuinely, not as labels: safe-editing, debug-first, api-security, owasp-top10, backend-performance, system-design, nodejs-quality, rea. Check: auth + RLS + RPCs + Edge Functions (who can read/write what, via the app AND via direct API calls); status transitions (can a client force an illegal state?); race conditions and idempotency (double-submit, re-invocation); query cost (N+1, missing indexes on hot filters); error handling (silent failures, swallowed errors); code quality (readability, dead code, hardcoded values, separation of concerns). Report-only — do not edit anything. Every finding: severity (Blocker/Warning/Suggestion), file:line, evidence, and what breaks in real use."

**Frontend agent brief:** "Audit the frontend of <repo> at <commit>. Read these skills first and apply them genuinely, not as labels: ux-edge-states, motion-design, frontend-performance. Check: every screen's loading / empty / error / offline states (no blank screens, no whole-page error cards where an inline banner fits); keyboard operability and screen-reader labels on every interactive element; dark mode (no unreadable text, no invisible controls); animations are real motion, not static visuals; render performance (no infinite fetch loops, no effect deps on object identity); contrast (WCAG AA on text over gradients). Report-only — do not edit anything. Every finding: severity (Blocker/Warning/Suggestion), file:line, evidence, and what breaks in real use."

**DevOps agent brief:** "Audit the shipping path of <repo> at <commit>. Read this skill first and apply it genuinely, not as a label: devops-basics. Check: CI is green on this exact commit (read the Actions/runs page, not the workflow file — a workflow file is not proof); tests really pass (pass count AND exit code AND the 'Errors' line); build, lint, and typecheck clean; migrations are idempotent and re-runnable (every CREATE has DROP IF EXISTS / IF NOT EXISTS / CREATE OR REPLACE); deploy config matches the live target; no secrets in the repo. Report-only — do not edit anything. Every finding: severity (Blocker/Warning/Suggestion), file:line or run URL, evidence, and what breaks in real use."

### Quick check before reporting
- [ ] Target commit verified against the remote (agents read the right code)
- [ ] All three agents ran in parallel, each read its skills first
- [ ] Every finding has file:line (or run URL) + evidence + severity
- [ ] Regressions from the previous round re-checked and called out first
- [ ] Merged report triaged (Blockers / Warnings / Suggestions), no fix started
- [ ] Report in Bisaya, technical detail in English

### Learn more (sources for the skills this team applies)
- OWASP Top 10 (owasp-top10, api-security): https://owasp.org/www-project-top-ten/
- Node.js best practices (backend-performance, devops-basics, nodejs-quality): https://github.com/goldbergyoni/nodebestpractices
- System Design Primer (system-design): https://github.com/donnemartin/system-design-primer
- Front-End Checklist (frontend-performance): https://github.com/thedaviddias/Front-End-Checklist
- GSAP / GreenSock (motion-design): https://gsap.com/
- 12 API security rules reel (api-security): Code Crack — "12 API Security Rules"
- 10 UX states reel (ux-edge-states): Strategy Fox — "10 UX States"
- Clean Code (safe-editing, ub-mode): Robert Martin — *Clean Code*
