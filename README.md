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

## Ang problema (ngano naa ni nga harness)

**Ang AI nga walay guardrails.** Ang modelo dili nimo ma-control — pero ang **mga lagda nga iyang sundon**, kaya nimo. Mao na ang harness. Ang problem statement naa sa `harness.config.json` (ang `problem` field) ug apil sa pag-sync — makita kini sa tanang runtime files, aron ang matag AI mahibalo dili lang sa rules, kundi sa *ngano*.

## Unsa ni?

Ang harness **dili ang AI model** — kini ang nag-andam sa tanan nga basahon sa AI sa dili pa siya mocode:

```
harness.config.json          ← imong master spec (USA ra ka file)
        │  validate()        ← kalidad + secret scanning
        ▼
lib/adapters/*.js            ← adapters: opencode, claude, gemini, cline
        │  renderInstructions()
        ▼
.opencode/instructions.md    ← OpenCode
CLAUDE.md                    ← Claude Code
GEMINI.md                    ← Gemini CLI
.clinerules                  ← Cline
```

Usba ang rules sa **usa** ka lugar (`harness.config.json`), unya `sync` na'y bahala mo-sync niini ngadto sa tanang runtimes.

## Ang Sync Engine (luwas gyud!)

Guardrails sa dili pa isulat ang bisan unsang file:

1. **VALIDATE GATE** — kung bungi ang spec o naay secret, dili mo-sync
2. **DRY-RUN** — `sync --dry-run`: preview lang, walay isulat
3. **BACKUP** — kung naay ma-overwrite, himo og `.bak` copy una
4. **IDEMPOTENT** — kung walay na-usab, ayaw hilabti (pwede daganon balik-balik)

## Validate + Secret Scanning

`validate` mosusi sa config sa dili pa kini mahimong instructions:

- Walay empty nga rules, walay duplicates
- Secret scanning — API keys / tokens dili dapat ma-sync (ma-leak sa Git!)
- Ang `sync` mismo dili mopadayon kung naay validation errors

## Local Memory (graph-style, Obsidian-ready)

Ang AI walay memory — kada session, kalimot siya sa imong project. Ang harness naay `memory/` folder (gi-inspire sa knowledge graph sa Graphify ug sa vault sa Obsidian, pero gaan ug lokal):

```
memory/
  project.md     — notes (plain markdown, Obsidian-style)
  decisions.md   — [[wiki links]] ang magdugtong sa notes
  INDEX.md       — gi-generate: basahon sa AI pag-una
  graph.json     — gi-generate: nodes = notes, edges = links
```

Usa sa rules mosugo sa AI: basaha una ang memory, ug isulat ang bag-ong nakat-onan isip note nga naay [[links]]. Ang `sync` mo-refresh sad sa index. Ablihi ang `memory/` sa Obsidian para sa graph view.

## Skills

Reusable nga playbooks, i-enable per project:

- `skills list` — tan-awa ang bundled skills
- `skills add <name>` — i-install sa project ug i-enable sa config
- `skills remove <name>` — i-disable

Bundled: `safe-editing`, `no-hallucination`, `debug-first`, `explain-bisaya`. Ang enabled skills mo-render ubos sa rules sa tanang instruction files.

## Sub-agents ug Slash Commands

Usa ka master definition sa harness, i-generate ngadto sa format sa matag runtime:

- `agents add planner|reviewer|debugger` → `.opencode/agents/` + `.claude/agents/`
  - **planner** (Tigplano) — plans before coding
  - **reviewer** (Bantay) — hunts breakage and hallucinated code in diffs
  - **debugger** (Tig-ayo) — root-cause debugging, never symptom-patching
- `commands add review|explain` → `.opencode/commands/` + `.claude/commands/` (i-type og `/review` o `/explain` sa runtime)

## Pagdagan

Kinahanglan og Node.js 18+ (walay dependencies).

```bash
node bin/cli.js init --target ./akong-project
node bin/cli.js validate --target ./akong-project
node bin/cli.js sync --dry-run --target ./akong-project
node bin/cli.js sync --target ./akong-project
node bin/cli.js memory init --target ./akong-project
node bin/cli.js skills add safe-editing --target ./akong-project
node bin/cli.js agents add reviewer --target ./akong-project
node bin/cli.js commands add review --target ./akong-project
```

O, kung gi-install globally / pinaagi sa npx gikan sa GitHub:

```bash
npm install -g github:xcell321/reviewer-harness
reviewer-harness sync
npx github:xcell321/reviewer-harness status
```

## File map

- `bin/cli.js` — commands: `status`, `sync`, `init`, `validate`, `memory`, `skills`, `agents`, `commands`
- `lib/config.js` — mobasa + mo-validate sa structure sa master spec
- `lib/validate.js` — kalidad sa rules + secret scanning
- `lib/sync.js` — ANG SYNC ENGINE: validate gate, dry-run, backup, idempotent writes
- `lib/init.js` — maghimo og harness.config.json template sa bag-ong project
- `lib/memory.js` — local memory: notes vault, graph builder, index generator
- `lib/skills.js` — skills system: bundled store, install/enable, render sections
- `lib/agents.js` / `lib/commands.js` — usa ka source → OpenCode + Claude formats
- `lib/adapters/` — registry + matag runtime adapter (opencode, claude, gemini, cline)
- `skills/` — bundled skills · `agents/` — bundled sub-agents · `commands/` — bundled slash commands

## Ang mga lesson (giunsa ni pagkatukod)

1. ✅ Scaffold — CLI + master config + adapter pattern
2. ✅ Sync engine — dry-run, .bak backup, idempotent
3. ✅ Guardrails — `validate` command + secret scanning + sync gate
4. ✅ Skills system — `skills add/list/remove`
5. ✅ Sub-agents ug slash commands — `agents add`, `commands add`
6. ✅ Polish ug publish — v1.0.0, LICENSE, publish-ready para sa GitHub/npx

## Contributing & Security

- Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md)
- Found a security issue? See [SECURITY.md](SECURITY.md)

## License

MIT — see [LICENSE](LICENSE)
