# Roadmap: reviewer-harness to Sauron-Grade Engineering

Goal: give reviewer-harness the engineering ceremony that makes iging/sauron feel
"100% engineering" — uniform skill structure, per-skill versioning, validation
gates — without changing what makes the harness his: skills distilled from real
sources with per-rule citations, tested until they provably take effect, and
releases verified on every surface.

Principle: **format and metadata only.** Rule text is already source-grounded;
no phase rewrites skill content. Every conversion is diff-reviewed so the rules
that ship are the rules that were tested.

---

## Phase 0 — The house template (foundation) — DONE 2026-11-13

Template at `templates/skill-template.md`, approved by Edsiel 2026-11-13.
Verified inert: skills list stays 34, suite 67/67 with the template in the tree.

## Phase 1 — Pilot retrofit — DONE 2026-11-13

ub-mode, safe-editing, debug-first, nodejs-quality, design-taste-frontend
converted. Rule preservation proven mechanically: 455 original content lines
checked against the converted files, 0 misses (only five section headings were
restructured; their content moved verbatim). Effect tests 5/5 PASS. Suite
67/67 re-verified after sync. Push pending Edsiel's tap.

## Phase 0 (original text) — The house template (foundation)

- Design `skills/_template/SKILL.md`, adapted from sauron's skeleton (§0–§10)
  to harness conventions:
  - Frontmatter: `name`, `description`, `version` (new), optional `triggers`.
  - Sections: Purpose · When to use (trigger matrix) · Rules (the existing
    distilled body, unchanged) · Validation gate · Examples · Sources ·
    Changelog.
- Decide the metadata set with Edsiel: `version` + changelog are mandatory;
  sauron's `ownerAgent` maps to his own teams (audit-team / fix-team agent
  names), never Fellowship names.
- Exit criteria: template approved by Edsiel; nothing else starts before this.

## Phase 1 — Pilot retrofit (5 skills)

- Convert the five most-used skills to the template: `ub-mode`, `safe-editing`,
  `debug-first`, `nodejs-quality`, `design-taste-frontend`.
- Each gets `version: 1.0.0` and a changelog stub ("1.0.0 — template retrofit;
  rules unchanged").
- Effect-test each pilot the harness way (fresh agent, skill only, check the
  work cites and follows the rules) — the WORKS standard.
- Exit criteria: 5 pilots converted, effect tests pass, suite 67+ green.

## Phase 2 — The validation gate (CLI + CI)

- Add a `validate` check to the harness (extend the existing validator):
  frontmatter completeness (name, description, version), required sections
  present, cross-references point at skills that exist, description sane.
- Wire it into the test suite and CI: a non-compliant bundled skill fails the
  gate, the same way a wrong skill count does today.
- Exit criteria: `validate` runs in CI; deliberately breaking a pilot skill
  makes CI red (proven once, then reverted).

## Phase 3 — Full retrofit (remaining skills)

- Batch-convert by category. The 10 sauron clones are already closest to the
  template (they carry its skeleton); the distilled skills get the full
  treatment; the workflow/team skills adapt the skeleton (agent tables instead
  of a plain rule list).
- Format-only diffs, reviewed per category; one effect test sampled per
  category.
- The `privacy-policy` skill joins the retrofit when it lands on main.
- Exit criteria: all bundled skills template-compliant; validate gate green;
  suite green.

## Phase 4 — Release discipline

- Ship it as a release (version call is Edsiel's: v1.18.0, or v2.0.0 for the
  "engineering grade" story) — GitHub Release via web UI, npm publish, landing
  page updated, each surface verified before claiming live.
- Standing rule from this release on: new skills are born from the template
  (born compliant), and every skill change carries a changelog entry and a
  version bump for that skill.

---

## Phase 5 — Closing step: squash the commit history

Decided 2026-11-13 (via the Water Refilling side chat): after Phases 0–4 are
complete, squash main's history (160 commits at decision time) down to a clean
starting point.

- The GitHub connector can only append commits, so the squash itself runs from
  real git on Edsiel's PC: fresh clone → orphan branch carrying the full
  current tree as ONE commit → force-push main.
- Tags, releases, and npm are unaffected. Other clones re-clone afterward.
- Nothing here starts until the roadmap is otherwise complete.

## Non-goals

- No Fellowship cosplay: his agent names and teams (audit-team, fix-team,
  Bantay/Tigplano/Tig-ayo where they live) stay his.
- No content rewrites and no invented rules — the skill-grounding rule binds
  every phase.
- No new runtimes (AdaL, CodeBuddy, and friends stay out of scope).
- No deletions: conversions are in-place edits, so pushes stay at one batch
  tap each — no repeat of the 65-tap layout migration.

## Shape of the work

- Phase 0: one session (design + his approval).
- Phase 1: one session (5 skills + effect tests).
- Phase 2: one session (CLI check + tests + CI proof).
- Phase 3: two to three sessions (batchable by category).
- Phase 4: one release session.

Coordination note: the main chat's privacy-policy work is uncommitted in the
other clone; Phase 3 assumes it lands on main first, or the retrofit rebases
on top of it when it does.
