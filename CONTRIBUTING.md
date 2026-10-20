# Contributing to reviewer-harness

Salamat sa imong interes! (Thanks for your interest!) reviewer-harness is a personal project that grew out of a real frustration — AI assistants breaking working code — and contributions that make the guardrails stronger are very welcome.

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

## House rules

- **Zero dependencies.** The harness must run on a bare Node.js install. Pull requests that add a dependency will be declined — if Node's standard library can do it, use that.
- **ES modules** (`import`/`export`), matching the existing code.
- **Safety first:** anything that writes files must respect the existing guardrails — validate before writing, back up before overwriting, never write outside the target directory.
- Bisaya (Cebuano) comments are welcome — they are part of this project's voice. English is fine too.
- Keep it small. A harness people actually read beats a framework nobody finishes configuring.

## Pull request process

1. Fork the repo and create a branch for your change.
2. Test your change on a scratch project with the flow above (`init` → `validate` → `sync --dry-run` → `sync`).
3. Describe in the PR: what changed, why, and what you tested.
4. One focused change per PR is easier to review than five at once.

## Code of conduct

Be kind, be concrete, assume good faith. Technical disagreement is welcome; personal attacks are not.
