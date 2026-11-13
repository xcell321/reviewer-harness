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

## Phase 2 — Validation gate — DONE 2026-11-13

`validateSkillTemplate` + `validateBundledSkills` in lib/validate.js, wired
into the existing `validate` command; 9 new tests (suite 76). Red-proof: temp
fixture failed with exactly its 6 defects; mid-flight the gate reported 230
errors across exactly the 29 unretrofitted skills; final state 0 errors.
Cross-reference checks are scoped to the When to use section by design
(calibration showed hundreds of id-shaped non-references in Rules bodies).

## Phase 3 — Full retrofit — DONE 2026-11-13

All 34 skills template-compliant at version 1.0.0. Preservation: 2,271 lines
checked this phase (2,726 total with Phase 1), 0 misses. Effect tests: 8/8
sampled categories PASS (13/13 with Phase 1). Pushed in 3 size-split batches,
remote tree verified identical (7316b45).

## Phase 4 — Release — CODE SIDE DONE 2026-11-13

v1.18.0 bumped (package.json + harness.config.json aligned — the old config
drift warning is gone; `validate` fully clean), README changelog entry 14
added, suite 76/76 re-verified AFTER the bump, pushed (090d67f). REMAINING
(Edsiel's steps): GitHub Release via the web UI, and the npm publish (his
token, one-time use via the publish helper). The release counts as complete
only after both surfaces verify live. **COMPLETE 2026-11-13: GitHub Release
v1.18.0 published (tag = main 090d67f, Latest) and npm registry verified
(latest flipped to 1.18.0). Phases 0–4 are all complete; only Phase 5 (the
history squash from Edsiel's PC) remains.**

## Phase 5 — Closing step: squash the commit history — CANCELLED 2026-11-13

Edsiel dropped the squash ("nvm na ang phase 5") after Phases 0–4 completed.
The hourly watcher (`rh-roadmap-squash-watch`) was removed the same evening.
Main's history stays as it is. The original plan, kept for the record:

Decided 2026-11-13 (via the Water Refilling side chat): after Phases 0–4 are
complete, squash main's history (160 commits at decision time) down to a clean
starting point.

- The GitHub connector can only append commits, so the squash itself runs from
  real git on Edsiel's PC: fresh clone → orphan branch carrying the full
  current tree as ONE commit → force-push main.
- Tags, releases, and npm are unaffected. Other clones re-clone afterward.
- Nothing here starts until the roadmap is otherwise complete.

## Phase 6 — `graph` command (codebase knowledge graph) — PLANNED 2026-11-13, awaiting go

Edsiel asked (2026-11-13): sauron has a graph, his harness does not — add it
to the roadmap with a plan. Grounded in sauron's own README: `sauron graph .`
emits three artifacts into `.sauron/graph/` — `graph.json` (nodes,
dependencies, cycle metrics for agent queries), `graph-report.md` (god
modules, circular dependencies), `graph.html` (interactive force-directed
visualizer) — from a zero-dependency AST engine covering 11 languages. Its
stated purpose: agents burn thousands of tokens dumping raw files to learn a
project's topology; the graph hands them the map.

His version, adapted to his stack and the harness's zero-dependency rule:
- CLI: `reviewer-harness graph [dir]` (default: the current project).
  Artifacts in `.reviewer-harness/graph/`: `graph.json`, `graph-report.md`,
  `graph.html` (single self-contained file, force-directed canvas, search +
  click-to-inspect, works offline).
- Engine v1 scope: the JS/TS family only (harness = JS, Pantry = TS/React,
  DevPilot = TS) — import/export/require extraction plus module resolution
  (relative paths, index files, .js/.ts/.jsx/.tsx/.mjs/.cjs). Node = file,
  edge = dependency. PHP and Python are a later stretch (6.5), not v1.
- Analysis: DFS circular-dependency detection; god modules (highest fan-in /
  fan-out); orphan files; per-file metrics in `graph.json` so agents query
  the map instead of dumping source files.
- Steps: 6.1 scanner + resolver with fixture tests → 6.2 graph build, cycle
  detection, `graph.json` → 6.3 health report → 6.4 HTML visualizer → 6.5
  dogfood on the harness repo itself and on Pantry (report the real
  findings), README + landing docs → release as v1.19.0 by the Phase 4
  pattern (bump, post-bump suite, GitHub Release, npm publish).
- Test discipline: fixture projects with a known cycle, a known god module,
  and a known orphan; the suite stays green and grows.
- Non-goals for v1: no full AST (the contract is an import-level graph;
  symbol-level detail is out), no new dependencies, no 11 languages.
- Ordering: Phase 5 (the history squash) stays pending Edsiel's paste and is
  independent of this phase — Phase 6 can land before or after it; the squash
  carries whatever the final tree is.

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
