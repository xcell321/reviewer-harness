# reviewer-harness

```
Eight runtimes in the editor, each with files of its own,
Scattered rules in every corner, never quite in sync,
An AI that means well — but breaks what already works,
And forgets your whole project the moment the session ends:

One config to guard them all,
One harness to remind them,
One sync to bind them all,
and in your codebase, protect them.
```

![version](https://img.shields.io/badge/version-1.18.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellowgreen)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![runtimes](https://img.shields.io/badge/runtimes-8-purple)
![status](https://img.shields.io/badge/status-Free%20%26%20Open%20Source-green)

**reviewer-harness** is a personal AI agent harness: one master config that syncs guardrail rules, reusable skills, and a local project memory to **Claude Code, OpenCode, Gemini CLI, Cline, Freebuff, GitHub Copilot CLI, Antigravity, and Qoder** — so the AI that codes for you stops breaking what already works. No API key. No dependencies. Just Node.js and your rules.

## Introduction

AI coding assistants are powerful, but anyone who vibe-codes with them daily runs into the same four crises:

1. **The "you broke my code" crisis.** You ask the AI to add one feature, and it rewrites a file that was already working — deleting or altering parts you never asked it to touch. The fix becomes the bug.

2. **The hallucination crisis.** The AI confidently imports packages that don't exist, calls functions it invented, and presents output that only *looks* correct — until you run it.

3. **The fragmentation crisis.** Every AI runtime wants its own instruction file (`CLAUDE.md`, `.opencode/instructions.md`, `GEMINI.md`, `.clinerules`, and more). Keeping the same rules in sync across all of them by hand is tedious and error-prone.

4. **The amnesia crisis.** Every new session, the AI forgets your project: the decisions you made, the files that must never be touched, the gotchas you already paid for once.

**reviewer-harness solves all four with One Master Config.** You define your rules, your problem statement, and your skills once — in a single `harness.config.json` — and the harness validates them (including scanning for leaked secrets) and syncs them deterministically to every runtime. A local, graph-style memory gives the AI something to read before it codes, and to write to when it learns.

### What it is — and what it is not

- **It is** the layer that prepares everything the AI reads before it starts coding: your rules, your skills, your project memory.
- **It is not** the AI model. It never calls an API, never sends your code anywhere, and never needs an API key.
- **It is not** a framework or a library you import. It is a small CLI that writes instruction files into your project, then gets out of the way.

### Who it is for

Anyone who codes with an AI assistant and is tired of re-explaining the same rules, re-fixing the same breakage, and re-teaching the same project every session. It was built by a student agentic coder for daily use across eight different AI CLIs — and it works just as well if you only use one.

## Requirements

- **Node.js 18 or newer.** Check yours with `node --version`. No other dependencies — the harness has zero npm dependencies.
- **Any OS:** Windows, macOS, or Linux.
- **No account, no API key, no sign-up.** Everything runs locally on your machine.

## Installation

Pick one method. All six install the same tool; the first three need nothing but Node.js.

### Method A — npx (zero-install, recommended)

No install at all. Run the harness straight from the npm registry, one command at a time:

```bash
npx reviewer-harness status
```

The first run downloads the package (a few seconds); later runs reuse the cache. Use this method if you just want to try it, or if you use the harness occasionally.

### Method B — pnpm dlx (zero-install)

The same idea, for pnpm users:

```bash
pnpm dlx reviewer-harness status
```

### Method C — Install globally (recommended for daily use)

Install once, then run `reviewer-harness` anywhere, in any project:

```bash
npm install -g reviewer-harness
reviewer-harness status
```

To update to the newest version later, run the same install command again:

```bash
npm install -g reviewer-harness@latest
```

> **Seeing an old version after updating?** `npx` can serve a cached copy. Run `npx --yes reviewer-harness@latest status` once to refresh the cache, or use the global install above.

### Method D — Direct git clone (source checkout)

Clone the repo and run the CLI from source — useful if you want to read or hack on the code:

```bash
git clone https://github.com/xcell321/reviewer-harness.git
cd reviewer-harness
node bin/cli.js status
```

From a source checkout, every command in this README works as `node bin/cli.js <command>` instead of `reviewer-harness <command>`.

### Method E — Standalone one-liner installers

A single command that installs the harness for you — no npm needed beyond Node.js:

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/xcell321/reviewer-harness/main/bin/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/xcell321/reviewer-harness/main/bin/install.ps1 | iex
```

### Method F — Docker (zero local Node.js required)

Run the harness without installing Node.js on your machine at all:

```bash
git clone https://github.com/xcell321/reviewer-harness.git
cd reviewer-harness

# Check status / start the harness in the mounted workspace
docker compose run --rm reviewer-harness status
docker compose run --rm reviewer-harness init
docker compose run --rm reviewer-harness sync
```

### Verify your installation

After any method, run this — you should see the harness name, version, and your runtimes:

```bash
reviewer-harness status
```

Expected output (version number varies):

```
Harness : reviewer-harness v1.18.0
Target  : /path/to/your/project
Runtimes:
  - opencode → .opencode/instructions.md
  - claude → CLAUDE.md
  - gemini → GEMINI.md
  - cline → .clinerules
  - freebuff → .agents/skills/<skill>/SKILL.md
  - copilot → .github/skills/<skill>/SKILL.md
  - antigravity → .agents/skills/<skill>/SKILL.md
  - qoder → .qoder/skills/<skill>/SKILL.md
Skills  : safe-editing, no-hallucination, ...
```

If you see `Config file not found`, you are in a folder without a harness config yet — run `init` (next section).

## Quick start — your first project in 5 minutes

This is the full flow, start to finish. Run the commands inside your project folder.

**Step 1 — Set up everything.** One time per project, one command:

```bash
reviewer-harness init
```

Init reads your project first — its manifest (`package.json`, `composer.json`, `go.mod`, …) and its README — then sets up the whole harness, adapted to what it found. Expected output (counts depend on your project):

```
Project: your-app — TypeScript · React
Goal   : (from your package.json description or README)
Config : created → /path/to/your/project/harness.config.json
Skills : 28 installed + enabled ✓
Agents : 3 installed (6 runtime files) ✓
Commands: 2 installed (4 runtime files) ✓
Memory : created (project.md, decisions.md) — 2 notes indexed ✓
Sync   : 144 files written across 9 runtime targets ✓

Done — everything is installed. Open any runtime in this project and the harness is live.
```

The `harness.config.json` it creates is already yours: your project's name and goal, its detected stack, and its real validation commands (e.g. `npm test`) written into the rules — and into the seeded memory note, so the first session already knows the project. Edit the `rules` and `problem` fields to fine-tune. (Running `init` again never overwrites an existing config; it refreshes the installs instead. `init --minimal` creates only the config — the pre-v1.17 behavior — and `init --dry-run` previews the whole setup without writing anything.)

**Step 2 — Open your AI tool.** That is it — the setup is done. Open the project in Claude Code, OpenCode, Gemini CLI, Cline, or any of the other runtimes, and the AI reads your rules, your skills, and your project memory before it writes a single line. (New idea to build? The everyday flow below starts with `/brainstorming`.)

**That's the whole setup.** Everything after this is optional, for later — when you want to change something:

**Fine-tune the config.** Edit the `rules` and `problem` fields in `harness.config.json`, then check it:

```bash
reviewer-harness validate
```

```
✓ Config is clean — no problems, no secrets.
```

`validate` checks for empty or duplicate rules and scans the config for leaked API keys and tokens — secrets must never be synced into instruction files (they would leak into Git).

**Add or remove a skill.** `init` installed all 28; trim or extend the set any time (full list below):

```bash
reviewer-harness skills list             # everything bundled, grouped by category
reviewer-harness skills remove clone     # disable + remove one
reviewer-harness skills add clone        # bring it back
```

**Re-sync after edits.** Preview first if you like — sync writes a `.bak` backup before overwriting any instruction file, and leaves unchanged files untouched:

```bash
reviewer-harness sync --dry-run   # preview: what would change, writes nothing
reviewer-harness sync             # apply it to every runtime
```

One file changes, every runtime follows.

## The everyday flow — from idea to shipped

With the harness live in a project, building something new is one conversation:

1. **`/brainstorming <your idea>`** — the AI asks one question at a time, proposes 2–3 approaches, and writes a design doc. **Nothing is built until you approve the design** — that approval is a hard gate, not a courtesy.
2. **Planning starts itself.** The moment the design is approved, brainstorming hands off to `writing-plans` automatically, in the same session — you never type the next command. You get a bite-sized, TDD-shaped implementation plan.
3. **Build.** You (or the AI, task by task) work the plan under the harness's guardrails — safe editing, no invented APIs, your project's real validation commands.
4. **`/audit-team`** — 8 agents audit the result in parallel, report-only: what is broken, risky, or fake, with evidence.
5. **`/fix-team`** — 11 agents fix the audit's findings, and a verification agent re-checks every fix last.

Design → plan → build → audit → fix, with your approval at the one gate that matters and no command-juggling in between.

## How to use

### Two ways to use it

**Modular Mode — one skill, zero setup.** Copy a single skill straight into any project, no config needed. The skill lands in `./skills/<category>/` as a playbook your AI can follow:

```bash
# Browse the bundled skills first
npx reviewer-harness skills list

# Add individual skills to this project
npx reviewer-harness skills add safe-editing
npx reviewer-harness skills add no-hallucination
```

**Full Harness Mode — one config, every runtime.** `init` sets up everything in one command (config, all skills, agents, commands, memory, and a first sync), `validate` checks the config, and `sync` regenerates the native instruction file for every runtime you enable. This is the mode the Quick start above walks through, and the mode this README documents in detail.

### Skills — reusable playbooks

A skill is a playbook: a short, checkable set of rules for one job (safe editing, API security, UI taste, debugging, and so on), distilled from real, reputable sources — not generic advice. Every rule cites its source.

```bash
reviewer-harness skills list            # see all 34 bundled skills, grouped by category (+ which are enabled)
reviewer-harness skills add <name>      # install into the project and enable it in the config
reviewer-harness skills remove <name>   # disable it in the config and remove it
```

The skills are organized into **8 categories** — in the harness and, mirrored, in your project's `skills/` folder: `workflow` (6), `frontend` (7), `quality` (5), `backend` (2), `security` (2), `ai-engineering` (2), `architecture` (2), `database` (8). Every skill lives in its own folder as `skills/<category>/<name>/SKILL.md`, the layout used by iging/sauron.

All 34 bundled skills:

| Skill | What it does |
|---|---|
| `safe-editing` | Surgical editing — the smallest possible diff, no collateral damage. |
| `no-hallucination` | Make sure every library, function, and API actually exists before using it. |
| `debug-first` | Root-cause debugging — reproduce first, fix the cause, not the symptom. |
| `explain-bisaya` | After each task, explain the changes in simple Bisaya (Cebuano). |
| `clone` | Fully clone a website's design — layout, components, animations, borders — while replacing all text and assets with your own. |
| `rea` | Reverse-engineer a shipped app, binary, or website with REA: inspect it without source code, get evidence for how a feature works, and rebuild it as your own code. |
| `api-security` | 14 API security rules — apply to every backend endpoint you build or review. |
| `ux-edge-states` | 10 UX states beyond the happy path — empty, loading, error, offline, success. |
| `owasp-top10` | OWASP Top 10 web security risks — the industry standard check before shipping. |
| `motion-design` | Animation principles from GSAP (GreenSock) — easing, sequencing, stagger, performance. |
| `frontend-performance` | Frontend performance rules from the Front-End Checklist — animations, resource hints, budgets, lazy loading. |
| `system-design` | 68 system design rules from system-design-primer — CAP tradeoffs, load balancing, scaling. |
| `api-design` | REST API design patterns — resource naming, HTTP method semantics, status codes, cursor pagination, filtering, rate limiting, versioning, deterministic error envelopes. |
| `nodejs-quality` | 93 Node.js backend rules from nodebestpractices — errors, structure, testing, production, security, plus the merged backend-performance (19) and devops-basics (12) rule sets. |
| `php-principles` | Modern PHP 8.x engineering rules — strict typing, PSR architecture, security hardening, error discipline, static analysis gates. |
| `audit-team` | Run an 8-agent parallel audit — 5 skill specialists plus 3 area agents — report-only, no edits. |
| `ub-mode` | Uncle Bob mode — Clean Code discipline from Robert C. Martin: TDD first, CRAP < 10. |
| `design-taste-frontend` | Anti-slop design taste from Leonxlnx/taste-skill — layout, palettes, type, heroes, copy ban lists. Includes a 3-tier design-token architecture (rules 60–65, merged from iging/sauron). |
| `ui-ux-pro-max` | Full UI/UX audit from nextlevelbuilder/ui-ux-pro-max-skill — 222 checkable guidelines across 10 categories. |
| `vengeance-ui` | Modern animated React components from VengeanceUI — 79 copy-paste components across 9 families. |
| `brainstorming` | Find out what you actually want — and why — before anything gets built. Design doc first, approval first — then it hands off to writing-plans automatically, in the same session. |
| `writing-plans` | Turn an approved spec into a bite-sized TDD implementation plan. (Brainstorming invokes it for you after approval.) |
| `fix-team` | Run an 11-agent fix over an audit report's findings — 8 domain fixers plus ub-mode, superpowers, and a verification agent that runs last. Fix plan first, user approves, verification re-checks every fix. |
| `verify_before_done` | Check defined-and-called plus remote evidence before reporting done, pushed, fixed, or working — never present an untested guess as done. Also covers provider claims and publish/install surfaces (merged in). |
| `instruction_registers` | Name the user's target and action registers before building, pushing, or planning, and ask one clarifying question when they are ambiguous. |
| `playwright-cli` | Browser automation and real web-app testing for coding agents, from Microsoft's Playwright CLI — drive the app, turn the session into Playwright tests, attach screenshot evidence. |
| `database-migration` | Plan and execute schema changes and migration scripts safely — zero-downtime and type-sync discipline. Includes zero-downtime table partitioning (merged in). |
| `elasticsearch-patterns` | Elasticsearch mappings, analyzers, and search queries with relevance tuning. |
| `firebase-principles` | Firebase production rules — Firestore modeling, cheap security rules, triple-layer security, cost-aware reads, Cloud Function boundaries. |
| `mongodb-principles` | MongoDB schemas, indexes, and aggregation pipelines with document modeling discipline. |
| `mysql-principles` | MySQL schemas, indexes, and transactions with InnoDB discipline for read-heavy workloads. |
| `prisma-drizzle-orm` | Type-safe data access with Prisma or Drizzle — schemas, migrations, and query patterns. |
| `sqlite-principles` | SQLite production rules — WAL pragmas, single-writer discipline, Litestream backup, Turso edge replicas, Postgres graduation criteria. |
| `supabase-principles` | Supabase backends done safely — Row Level Security on every table, edge functions, realtime channels. Includes deep PostgreSQL query-planner optimization (merged in). |

The `database` skills, `php-principles` (in `backend`), and `api-design` (in `architecture`) come from [iging/sauron](https://github.com/iging/sauron) (MIT-licensed) — the harness reviewer-harness was modeled on. Eight database skills remain verbatim standalone skills with their original frontmatter; on 2026-11-13 `zero-downtime-table-partitioning` and `postgres-query-planner-optimization` were merged into `database-migration` and `supabase-principles`, so those two files now carry clearly marked merged sections.

Enabled skills render below the rules in every instruction file — and sync also generates a **slash command** for each one (`.opencode/commands/<name>.md` and `.claude/commands/<name>.md`), so every enabled skill appears in the `/` menu of OpenCode and Claude, ready to invoke on a specific task: `/safe-editing`, `/no-hallucination`, and so on.

**A built-in pairing:** the `/safe-editing` command always carries the `no-hallucination` playbook inside it as a companion section — one call, both disciplines, so the AI that edits can never invent the code it edits with.

**Every project, instantly:** want the skills in the `/` menu of *every* project, with no per-project setup? Run `reviewer-harness global` once — it installs all bundled skills as slash commands into the global OpenCode (`~/.config/opencode/commands`) and Claude (`~/.claude/commands`) folders, plus skill bundles for Freebuff, Copilot CLI, Antigravity, and Qoder. From then on, they are in the `/` menu of any project you open. (Project rules still come from `sync` inside a project.) Add `--dry-run` first to preview what it would install.

### The sync engine — what happens when you run `sync`

```
harness.config.json          ← your master spec (ONE file)
        │  validate()        ← quality checks + secret scanning
        ▼
lib/adapters/*.js            ← adapters: opencode, claude, gemini, cline,
                               freebuff, copilot, antigravity, qoder
        │  renderInstructions()
        ▼
.opencode/instructions.md    ← OpenCode
CLAUDE.md                    ← Claude Code
GEMINI.md                    ← Gemini CLI
.clinerules                  ← Cline
.agents/skills/<skill>/SKILL.md  ← Freebuff, Antigravity (project skills)
.github/skills/<skill>/SKILL.md  ← GitHub Copilot CLI (project skills)
.qoder/skills/<skill>/SKILL.md   ← Qoder (project skills)
.opencode/commands/<name>.md + .claude/commands/<name>.md  ← slash command per skill
```

Change the rules in **one** place (`harness.config.json`), and `sync` propagates them to every runtime.

Four guardrails run before any file is written:

1. **VALIDATE GATE** — if the spec is broken or contains a secret, sync refuses to run.
2. **DRY-RUN** — `sync --dry-run`: preview only, writes nothing.
3. **BACKUP** — before overwriting an existing file, sync writes a `.bak` copy first.
4. **IDEMPOTENT** — if nothing changed, sync touches nothing. Safe to run repeatedly.

### Scale limit — instruction files grow linearly with skills

Every enabled skill is inlined in full into every instruction file, bundle, and slash command. Measured at audit (22 skills): **266,198 bytes** of skill source → **2,660,559 bytes** of generated output across 124 files (**10×** amplification); `CLAUDE.md` alone is **262,243 bytes** today. Growth is linear: at 10× skills (220), each instruction file would be ≈ 2.6 MB and total output ≈ 26.6 MB. The binding constraint is the AI runtime's context window, not disk.

**Target ceiling the project accepts: total generated output ≤ 10 MB, and no single instruction file larger than 1 MB** — roughly 3× today's 34 skills (≈ 102 skills) at the current amplification. Two cheap wins already reduce the amplification: shared bundle directories are written once (Freebuff + Antigravity share `.agents/skills`), and each skill's content is built once per `sync` run instead of once per runtime.

Beyond that ceiling, the fix is a re-architecture (summaries + lazy-loading skills on demand) — that is **out of scope** for this fix; nothing here shrinks the files, it only documents the limit and the ceiling.

### Validate + secret scanning

`validate` inspects the config before it becomes instructions:

- No empty rules, no duplicates.
- Secret scanning — API keys and tokens must never be synced (they would leak into Git).
- `sync` itself refuses to proceed when validation reports errors.

```bash
reviewer-harness validate        # check the config (quality + secret scan)
```

### Sub-agents and slash commands

One master definition in the harness, generated into each runtime's format:

```bash
reviewer-harness agents list
reviewer-harness agents add reviewer
reviewer-harness commands list
reviewer-harness commands add review
```

- `agents add planner|reviewer|debugger` → `.opencode/agents/` + `.claude/agents/`
  - **planner** (Tigplano) — plans before coding
  - **reviewer** (Bantay) — hunts breakage and hallucinated code in diffs
  - **debugger** (Tig-ayo) — root-cause debugging, never symptom-patching
- `commands add review|explain` → `.opencode/commands/` + `.claude/commands/` (type `/review` or `/explain` in your runtime)

### Local memory — the AI remembers your project

AI models have no memory — every session, they forget your project. The harness keeps a `memory/` folder (inspired by Graphify's knowledge graph and Obsidian's vault, but lightweight and fully local):

```bash
reviewer-harness memory init     # start the memory/ vault
reviewer-harness memory list     # list notes + their links
reviewer-harness memory index    # rebuild INDEX.md + graph.json
```

What it creates:

```
memory/
  project.md     — notes (plain markdown, Obsidian-style)
  decisions.md   — [[wiki links]] connect the notes
  INDEX.md       — generated: the AI reads this first
  graph.json     — generated: nodes = notes, edges = links
```

One of the rules orders the AI to read the memory first, and to write what it learns as a note with [[links]]. `sync` also refreshes the index. Open `memory/` in Obsidian to see the graph view.

### This repo governs itself

reviewer-harness eats its own cooking: the instruction files at this repo's root — `.opencode/instructions.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules` — plus the agents and commands in `.opencode/` and `.claude/` and the skill bundles in `.agents/skills/`, `.github/skills/`, and `.qoder/skills/` are **generated by reviewer-harness itself** from its own `harness.config.json`. Open this repo in any AI coding tool and the tool follows the harness's own rules while working on the harness. To refresh them after editing the config, just run `node bin/cli.js sync` here.

## Sandboxing and security notice

reviewer-harness executes locally and is fully transparent:

- **Zero telemetry, zero network.** The tool reads and writes files in your project only. It sends no code or prompts to external servers, and it never needs an API key.
- **Non-destructive backups.** Before modifying any existing instruction file, sync creates a `.bak` copy; files that would not change are skipped.
- **Inspect before applying.** Run `sync --dry-run` to see exactly what would change — it writes nothing.
- **Secrets are blocked, not leaked.** `validate` (and sync itself) scans the config for API keys and tokens and refuses to sync if one is found.
- **Prefer a hard sandbox?** Run it in the Docker container (Installation, Method F).

## Command reference

Requires Node.js 18+ (no dependencies). Run these inside your project — every command works on the current directory unless you add `--target <dir>`.

### Start & everyday

| Command | What it does |
|---|---|
| `reviewer-harness init` | One command: detect the project, create the config, install every skill, agent and command, start the memory, and sync all runtimes (never overwrites an existing config; `--minimal` = config only) |
| `reviewer-harness validate` | Check the config: rule quality + secret scanning |
| `reviewer-harness sync --dry-run` | Preview the sync: shows what would change, writes nothing |
| `reviewer-harness sync` | Apply the rules to every enabled runtime (with `.bak` backups) |
| `reviewer-harness status` | Show the config: name, version, runtimes, target files, enabled skills |

### Skills, agents, commands

| Command | What it does |
|---|---|
| `reviewer-harness skills list` | List all 34 bundled skills, grouped by category (+ which are enabled) |
| `reviewer-harness skills add <name>` | Install a skill into the project and enable it in the config |
| `reviewer-harness skills remove <name>` | Disable a skill and remove it |
| `reviewer-harness agents list` | List the bundled sub-agents |
| `reviewer-harness agents add <name>` | Install a sub-agent (OpenCode + Claude) |
| `reviewer-harness commands list` | List the bundled slash commands |
| `reviewer-harness commands add <name>` | Install a slash command (OpenCode + Claude) |
| `reviewer-harness global [--dry-run]` | Install EVERY bundled skill for ALL projects (global `/` menus + skill bundles) |

### Local memory

| Command | What it does |
|---|---|
| `reviewer-harness memory init` | Start the local memory vault (`memory/` folder) |
| `reviewer-harness memory list` | List memory notes + their links |
| `reviewer-harness memory index` | Rebuild `INDEX.md` + `graph.json` |

Running from a source checkout instead? The same commands work as `node bin/cli.js <command>`.

## File map

- `bin/cli.js` — commands: `status`, `sync`, `init`, `validate`, `memory`, `skills`, `agents`, `commands`, `global`
- `bin/install.sh` / `bin/install.ps1` — one-liner installers (Linux/macOS, Windows)
- `Dockerfile` / `docker-compose.yml` — run the harness with zero local Node.js
- `lib/config.js` — loads and validates the structure of the master spec
- `lib/validate.js` — rule quality checks + secret scanning
- `lib/sync.js` — THE SYNC ENGINE: validate gate, dry-run, backup, idempotent writes
- `lib/frontmatter.js` — frontmatter parser (normalizes CRLF line endings, fixed in v1.14.0)
- `lib/init.js` — the config template + init v2: the full one-command setup (detect → install everything → sync)
- `lib/detect.js` — reads a project's manifests + README to detect its name, stack, goal, and validation commands
- `lib/memory.js` — local memory: notes vault, graph builder, index generator
- `lib/skills.js` — skills system: bundled store, install/enable, section rendering
- `lib/agents.js` / `lib/commands.js` — one source → OpenCode + Claude formats
- `lib/adapters/` — registry + one adapter per runtime (opencode, claude, gemini, cline, freebuff, copilot, antigravity, qoder)
- `skills/` — bundled skills, organized by category (`backend/`, `frontend/`, `security/`, `quality/`, `workflow/`, `architecture/`, `devops/`, `ai-engineering/`) — installs mirror the same folders in your project · `agents/` — bundled sub-agents · `commands/` — bundled slash commands
- `docs/superpowers/specs/` — design docs for releases and big changes

## Troubleshooting

**`Error: Config file not found: .../harness.config.json`**
You are in a folder without a harness config. Run `reviewer-harness init` there first, or point at the right folder with `--target <dir>`.

**`Skill "X" is enabled in the config but has no file in skills/`**
The config enables a skill whose file is missing from the project's `skills/` folder. Fix it with `reviewer-harness skills add X` (re-installs the file), or remove it with `reviewer-harness skills remove X`.

**`validate` reports a secret / sync refuses to run**
A value in your config looks like an API key or token. Remove the secret from `harness.config.json` — secrets must never be synced into instruction files. Use your runtime's own secret storage instead.

**`status` shows an old version after updating**
Your shell or `npx` is serving a cached copy. Run `npx --yes reviewer-harness@latest status` once to refresh the cache, or reinstall globally with `npm install -g reviewer-harness@latest`.

**Windows line endings (CRLF)**
Skill files with Windows (`\r\n`) line endings used to lose their frontmatter on sync. Fixed in v1.14.0 — the parser normalizes line endings, so CRLF and LF files sync identically. No manual conversion needed anymore.

**Sync changed nothing, but I edited the config**
Check that you edited the config in the same folder you are syncing (`--target` defaults to the current directory), and that `validate` passes — sync refuses to run on a broken config.

## How it was built (the lessons)

1. ✅ Scaffold — CLI + master config + adapter pattern
2. ✅ Sync engine — dry-run, .bak backup, idempotent
3. ✅ Guardrails — `validate` command + secret scanning + sync gate
4. ✅ Skills system — `skills add/list/remove`
5. ✅ Sub-agents and slash commands — `agents add`, `commands add`
6. ✅ Polish and publish — v1.0.0, LICENSE, publish-ready for GitHub/npx
7. ✅ v1.1.0 — all-English repo, validate-and-report rule, self-governing repo, modular skills, one-liner installers, Docker
8. ✅ v1.14.0 — the working peak: 27 skills (audit-team + fix-team, ub-mode, design-taste-frontend, ui-ux-pro-max, vengeance-ui, brainstorming, writing-plans, verification skills), Qoder as 8th runtime, system-design, nodejs-quality, all fix rounds verified WORKS, CRLF frontmatter fix (Windows sync without manual LF conversion), --help/--version flags fixed
9. ✅ v1.15.0 — 22 pre-tested commits merged, CI on GitHub, full 27-skill re-test (every skill graded WORKS/PARTIAL with evidence)
10. ✅ v1.15.1 — audit fix round F1–F8: vendored design libraries shipped with the harness, durable version tests, suite green on a fresh clone
11. ✅ v1.16.0 — playwright-cli skill (28 skills): real browser testing for coding agents
12. ✅ v1.17.0 — init v2: one command sets up everything — project detection (name, stack, goal, real validation commands) → adapted config → all skills, agents, commands → seeded memory → sync, with a receipt; re-running init refreshes instead of overwriting
13. ✅ v1.17.1 — less hassle edition: brainstorming hands off to writing-plans automatically after design approval, and the skills are organized into 8 category folders — in the harness and mirrored in every project it sets up
14. ✅ v1.18.0 — sauron-grade edition: all 34 skills retrofitted to one house template (Purpose, When to use, Rules, Validation gate, Examples, Sources, Changelog) with per-skill SemVer versions, a template validation gate in `validate` and CI, the sauron database clones and merges landed, and every skill in folder layout

## Contributing & Security

- Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md)
- Found a security issue? See [SECURITY.md](SECURITY.md)

## Author & credits

Created and maintained by **Edsiel Ursal** ([@xcell321](https://github.com/xcell321)) — designed and built together with **Muse**, Meta's AI assistant, as pair programmer and mentor. Every feature in this repo was planned, coded, tested, and documented in that collaboration: Edsiel directed the vision and made every call; Muse helped write and verify the code.

## License

MIT — see [LICENSE](LICENSE)
