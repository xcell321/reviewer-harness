# reviewer-harness

```
Four runtimes in the editor, each with files of its own,
Scattered rules in every corner, never quite in sync,
An AI that means well — but breaks what already works,
And forgets your whole project the moment the session ends:

One config to guard them all,
One harness to remind them,
One sync to bind them all,
and in your codebase, protect them.
```

![version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellowgreen)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![runtimes](https://img.shields.io/badge/runtimes-4-purple)
![status](https://img.shields.io/badge/status-Free%20%26%20Open%20Source-green)

**reviewer-harness** is a personal AI agent harness: one master config that syncs guardrail rules, reusable skills, and a local project memory to **Claude Code, OpenCode, Gemini CLI, and Cline** — so the AI that codes for you stops breaking what already works. No API key. No dependencies. Just Node.js and your rules.

## Overview

AI coding assistants are powerful, but anyone who vibe-codes with them daily runs into the same crises:

1. **The "you broke my code" crisis.** You ask the AI to add one feature, and it rewrites a file that was already working — deleting or altering parts you never asked it to touch. The fix becomes the bug.

2. **The hallucination crisis.** The AI confidently imports packages that don't exist, calls functions it invented, and presents output that only *looks* correct — until you run it.

3. **The fragmentation crisis.** Every AI runtime wants its own instruction file (`CLAUDE.md`, `.opencode/instructions.md`, `GEMINI.md`, `.clinerules`). Keeping the same rules in sync across all of them by hand is tedious and error-prone.

4. **The amnesia crisis.** Every new session, the AI forgets your project: the decisions you made, the files that must never be touched, the gotchas you already paid for once.

**reviewer-harness solves this with One Master Config.** You define your rules, your problem statement, and your skills once — in a single `harness.config.json` — and the harness validates them (including scanning for leaked secrets) and syncs them deterministically to every runtime. A local, graph-style memory gives the AI something to read before it codes, and to write to when it learns.

## The problem (why this harness exists)

**An AI with no guardrails.** You cannot control the model — but you *can* control **the rules it must follow**. That is the harness. The problem statement lives in `harness.config.json` (the `problem` field) and is synced along with everything else — it appears in every runtime file, so every AI knows not just the rules, but *why* they exist.

## What is this?

The harness is **not the AI model** — it is what prepares everything the AI reads before it starts coding:

```
harness.config.json          ← your master spec (ONE file)
        │  validate()        ← quality checks + secret scanning
        ▼
lib/adapters/*.js            ← adapters: opencode, claude, gemini, cline
        │  renderInstructions()
        ▼
.opencode/instructions.md    ← OpenCode
CLAUDE.md                    ← Claude Code
GEMINI.md                    ← Gemini CLI
.clinerules                  ← Cline
```

Change the rules in **one** place (`harness.config.json`), and `sync` propagates them to every runtime.

## Quickstart

You can use reviewer-harness in two ways: **Modular Mode** (zero-install: add individual skills to any project, no setup) or **Full Harness Mode** (one master config synced across all 4 runtimes).

### 1. Modular Skills (zero-install via npx)

Copy a single skill straight into your current project — no install, no config needed. The skill lands in `./skills/` as a playbook your AI can follow:

```bash
# Browse the bundled skills first
npx reviewer-harness skills list

# Add individual skills to this project
npx reviewer-harness skills add safe-editing
npx reviewer-harness skills add no-hallucination
```

> Prefer a global CLI? Install once with `npm install -g reviewer-harness` and run `reviewer-harness skills add <name>` anywhere.

### 2. Full Harness Synchronization (4 runtimes)

`init` creates your master config, `validate` checks it (including secret scanning), and `sync` generates the native instruction file for every runtime you enable: `.opencode/instructions.md`, `CLAUDE.md`, `GEMINI.md`, and `.clinerules`.

```bash
# Using npx (zero-install, recommended)
npx reviewer-harness init
npx reviewer-harness sync --dry-run   # preview: writes nothing
npx reviewer-harness sync             # writes, with .bak backups

# Using pnpm (zero-install)
pnpm dlx reviewer-harness init

# Or install globally
npm install -g reviewer-harness
reviewer-harness init

# Direct git clone
git clone https://github.com/xcell321/reviewer-harness.git
cd reviewer-harness && node bin/cli.js init --target ../my-project
```

### 3. Standalone one-liner installers

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/xcell321/reviewer-harness/main/bin/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/xcell321/reviewer-harness/main/bin/install.ps1 | iex
```

### 4. Running via Docker (zero local Node.js required)

For zero-dependency execution without installing Node.js on your machine:

```bash
git clone https://github.com/xcell321/reviewer-harness.git
cd reviewer-harness

# Check status / start the harness in the mounted workspace
docker compose run --rm reviewer-harness status
docker compose run --rm reviewer-harness init
docker compose run --rm reviewer-harness sync
```

## Sandboxing and security notice

reviewer-harness executes locally and is fully transparent:

- **Zero telemetry, zero network.** The tool reads and writes files in your project only. It sends no code or prompts to external servers, and it never needs an API key.
- **Non-destructive backups.** Before modifying any existing instruction file, sync creates a `.bak` copy; files that would not change are skipped.
- **Inspect before applying.** Run `sync --dry-run` to see exactly what would change — it writes nothing.
- **Secrets are blocked, not leaked.** `validate` (and sync itself) scans the config for API keys and tokens and refuses to sync if one is found.
- **Prefer a hard sandbox?** Run it in the Docker container above.

## The Sync Engine (safe by design)

Guardrails that run before any file is written:

1. **VALIDATE GATE** — if the spec is broken or contains a secret, sync refuses to run
2. **DRY-RUN** — `sync --dry-run`: preview only, writes nothing
3. **BACKUP** — before overwriting an existing file, write a `.bak` copy first
4. **IDEMPOTENT** — if nothing changed, touch nothing (safe to run repeatedly)

## Validate + Secret Scanning

`validate` inspects the config before it becomes instructions:

- No empty rules, no duplicates
- Secret scanning — API keys and tokens must never be synced (they would leak into Git!)
- `sync` itself refuses to proceed when validation reports errors

## This repo governs itself

reviewer-harness eats its own cooking: the instruction files at this repo's root — `.opencode/instructions.md`, `CLAUDE.md`, `GEMINI.md`, `.clinerules` — plus the agents and commands in `.opencode/` and `.claude/` are **generated by reviewer-harness itself** from its own `harness.config.json`. Open this repo in any AI coding tool and the tool follows the harness's own rules while working on the harness. To refresh them after editing the config, just run `node bin/cli.js sync` here.

## Local Memory (graph-style, Obsidian-ready)

AI models have no memory — every session, they forget your project. The harness keeps a `memory/` folder (inspired by Graphify's knowledge graph and Obsidian's vault, but lightweight and fully local):

```
memory/
  project.md     — notes (plain markdown, Obsidian-style)
  decisions.md   — [[wiki links]] connect the notes
  INDEX.md       — generated: the AI reads this first
  graph.json     — generated: nodes = notes, edges = links
```

One of the rules orders the AI to read the memory first, and to write what it learns as a note with [[links]]. `sync` also refreshes the index. Open `memory/` in Obsidian to see the graph view.

## Skills

Reusable playbooks, enabled per project:

- `skills list` — see the bundled skills
- `skills add <name>` — install into the project and enable it in the config
- `skills remove <name>` — disable it

Bundled: `safe-editing`, `no-hallucination`, `debug-first`, `explain-bisaya`, `clone`. Enabled skills render below the rules in every instruction file — and sync also generates a **slash command** for each one (`.opencode/commands/<name>.md` and `.claude/commands/<name>.md`), so every enabled skill appears in the `/` menu of OpenCode and Claude, ready to invoke on a specific task: `/safe-editing`, `/no-hallucination`, and so on.

**Every project, instantly:** want the skills in the `/` menu of *every* project, with no per-project setup? Run `reviewer-harness global` once — it installs all bundled skills as slash commands into the global OpenCode (`~/.config/opencode/commands`) and Claude (`~/.claude/commands`) folders. From then on, they are in the `/` menu of any project you open. (Project rules still come from `sync` inside a project.)

**A built-in pairing:** the `/safe-editing` command always carries the `no-hallucination` playbook inside it as a companion section — one call, both disciplines, so the AI that edits can never invent the code it edits with.

## Sub-agents and Slash Commands

One master definition in the harness, generated into each runtime's format:

- `agents add planner|reviewer|debugger` → `.opencode/agents/` + `.claude/agents/`
  - **planner** (Tigplano) — plans before coding
  - **reviewer** (Bantay) — hunts breakage and hallucinated code in diffs
  - **debugger** (Tig-ayo) — root-cause debugging, never symptom-patching
- `commands add review|explain` → `.opencode/commands/` + `.claude/commands/` (type `/review` or `/explain` in your runtime)

## Command reference

Requires Node.js 18+ (no dependencies). Run these inside your project — every command works on the current directory unless you add `--target <dir>`.

**Start & everyday**

```bash
reviewer-harness init            # one-time: create the master config
reviewer-harness validate        # check the config (quality + secret scan)
reviewer-harness sync --dry-run  # preview the changes, writes nothing
reviewer-harness sync            # apply the rules to every runtime
reviewer-harness status          # show the config + target files
```

**Skills, agents, commands**

```bash
reviewer-harness skills list
reviewer-harness skills add safe-editing
reviewer-harness skills remove safe-editing
reviewer-harness agents add reviewer
reviewer-harness commands add review
```

**Local memory**

```bash
reviewer-harness memory init     # start the memory/ vault
reviewer-harness memory list     # list notes + their links
reviewer-harness memory index    # rebuild INDEX.md + graph.json
```

Running from a source checkout instead? The same commands work as `node bin/cli.js <command>`.

## File map

- `bin/cli.js` — commands: `status`, `sync`, `init`, `validate`, `memory`, `skills`, `agents`, `commands`
- `bin/install.sh` / `bin/install.ps1` — one-liner installers (Linux/macOS, Windows)
- `Dockerfile` / `docker-compose.yml` — run the harness with zero local Node.js
- `lib/config.js` — loads and validates the structure of the master spec
- `lib/validate.js` — rule quality checks + secret scanning
- `lib/sync.js` — THE SYNC ENGINE: validate gate, dry-run, backup, idempotent writes
- `lib/init.js` — creates the harness.config.json template in a new project
- `lib/memory.js` — local memory: notes vault, graph builder, index generator
- `lib/skills.js` — skills system: bundled store, install/enable, section rendering
- `lib/agents.js` / `lib/commands.js` — one source → OpenCode + Claude formats
- `lib/adapters/` — registry + one adapter per runtime (opencode, claude, gemini, cline)
- `skills/` — bundled skills · `agents/` — bundled sub-agents · `commands/` — bundled slash commands

## How it was built (the lessons)

1. ✅ Scaffold — CLI + master config + adapter pattern
2. ✅ Sync engine — dry-run, .bak backup, idempotent
3. ✅ Guardrails — `validate` command + secret scanning + sync gate
4. ✅ Skills system — `skills add/list/remove`
5. ✅ Sub-agents and slash commands — `agents add`, `commands add`
6. ✅ Polish and publish — v1.0.0, LICENSE, publish-ready for GitHub/npx
7. ✅ v1.1.0 — all-English repo, validate-and-report rule, self-governing repo, modular skills, one-liner installers, Docker

## Contributing & Security

- Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md)
- Found a security issue? See [SECURITY.md](SECURITY.md)

## Author & credits

Created and maintained by **Edsiel Ursal** ([@xcell321](https://github.com/xcell321)) — designed and built together with **Muse**, Meta's AI assistant, as pair programmer and mentor. Every feature in this repo was planned, coded, tested, and documented in that collaboration: Edsiel directed the vision and made every call; Muse helped write and verify the code.

## License

MIT — see [LICENSE](LICENSE)
