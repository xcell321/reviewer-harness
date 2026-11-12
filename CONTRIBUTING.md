# Contributing to reviewer-harness

Thanks for your interest! reviewer-harness is a personal project that grew out of a real frustration — AI assistants breaking working code — and contributions that make the guardrails stronger are very welcome.

## Ways to contribute

- **Report a bug** — open a GitHub Issue with what you ran, what you expected, and what happened (include the CLI output).
- **Suggest a rule** — guardrail rules live in `harness.config.json`. If a rule saved your codebase, share it.
- **Add a skill, agent, or command** — see below; these are just markdown files.
- **Add a runtime adapter** — see below; this is the best way to grow the harness.
- **Improve the secret scanner** — new token patterns for `lib/validate.js` are high-value (include a test case: a fake token that should be caught, and a normal sentence that should not).

## Development setup

You only need **Node.js 18+**. There are **no dependencies** — nothing to install.

```bash
git clone https://github.com/xcell321/reviewer-harness.git
cd reviewer-harness
node bin/cli.js status
```

Try changes against a scratch project, never against a real one first:

```bash
mkdir /tmp/test-project
node bin/cli.js init --target /tmp/test-project
node bin/cli.js validate --target /tmp/test-project
node bin/cli.js sync --dry-run --target /tmp/test-project
node bin/cli.js sync --target /tmp/test-project
```

## Adding a runtime adapter

1. Create `lib/adapters/<runtime>.js` exporting two functions:
   - `targetFile()` — the instruction file path, relative to the project root
   - `renderInstructions(config)` — returns the file content as a string. Render, in order: the header, the `problem` section (if `config.problem` exists), the numbered `rules`, and any `config.skillSections`.
2. Register it in `lib/adapters/index.js` (one import + one entry in the `adapters` object).
3. Done — **do not modify `lib/sync.js`**. The sync engine loops over the registry (Open/Closed Principle): adapters are added, the engine is not edited.

## Adding a skill, agent, or command

Each is a single markdown file with frontmatter:

```markdown
---
name: my-thing
description: One line — when should the AI use this?
---

(the instructions / prompt body)
```

- Skills → `skills/<name>.md` (body starts with a `## Skill: <name>` heading)
- Agents → `agents/<name>.md`
- Commands → `commands/<name>.md` (the body is a prompt; `$ARGUMENTS` is replaced by the runtime)

No code changes needed — the CLI discovers files in these folders automatically.

## Scale limit — instruction files grow linearly with skills

Every enabled skill is inlined in full into every instruction file, bundle, and slash command. Measured at audit (22 skills): **266,198 bytes** of skill source → **2,660,559 bytes** of generated output across 124 files (**10×** amplification); `CLAUDE.md` alone is **262,243 bytes** today. Growth is linear: at 10× skills (220), each instruction file would be ≈ 2.6 MB and total output ≈ 26.6 MB. The binding constraint is the AI runtime's context window, not disk.

**Target ceiling the project accepts: total generated output ≤ 10 MB, and no single instruction file larger than 1 MB** — roughly 4× today's skills (≈ 80 skills). Two cheap wins already reduce the amplification: shared bundle directories are written once (Freebuff + Antigravity share `.agents/skills`), and each skill's content is built once per `sync` run instead of once per runtime (memoized in `lib/sync.js` — do not rebuild per-skill content in a loop over runtimes).

Beyond that ceiling, the fix is a re-architecture (summaries + lazy-loading skills on demand) — that is **out of scope** for this fix; nothing here shrinks the files, it only documents the limit and the ceiling. If you add a skill, remember: it grows every generated file, so keep skill bodies tight.

## House rules

- **Zero dependencies.** The harness must run on a bare Node.js install. Pull requests that add a dependency will be declined — if Node's standard library can do it, use that.
- **ES modules** (`import`/`export`), matching the existing code.
- **Safety first:** anything that writes files must respect the existing guardrails — validate before writing, back up before overwriting, never write outside the target directory.
- Comments and documentation are in English — this repo is public and international.
- Keep it small. A harness people actually read beats a framework nobody finishes configuring.

## Pull request process

1. Fork the repo and create a branch for your change.
2. Test your change on a scratch project with the flow above (`init` → `validate` → `sync --dry-run` → `sync`).
3. Describe in the PR: what changed, why, and what you tested.
4. One focused change per PR is easier to review than five at once.

## Code of conduct

Be kind, be concrete, assume good faith. Technical disagreement is welcome; personal attacks are not.
