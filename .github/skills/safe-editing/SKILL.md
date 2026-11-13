---
name: safe-editing
description: 'Surgical editing — the smallest possible diff, no collateral damage, always seasoned senior-developer quality and well structured.'
---

## Skill: safe-editing

### Purpose

Governs every edit to existing code: the smallest possible diff that solves the task, with no collateral damage. It prevents unrequested changes, unrelated reformatting, and hardcoded values from sneaking into a codebase one edit at a time.

### When to use

When to use: every change to existing code.

| Trigger | Example |
| --- | --- |
| Any change to existing code | "Rename `getUser` to `fetchUser`" |
| A fix or refactor inside a file that already exists | "Fix the off-by-one in the pager" |

Do NOT use when: the change needed is not yet known — `debug-first` owns reproducing and diagnosing the failure first; this skill governs the edit once the change is known.

### Rules

- Read the whole file (or the relevant part) before changing anything.
- Make the **smallest diff** that solves the task — never include changes that were not asked for.
- Do not reformat, reorder, or rename unrelated lines.
- Code as a seasoned senior developer with many years of experience shipping real products — websites and mobile apps deployed to production: clear names, small focused functions, no duplication, no clever hacks, edge cases handled, production-ready and maintainable — every change must be easy to understand at a glance.
- Keep the code well structured: separate concerns into files and modules with clear organization and placement. Never leave spaghetti code behind — if the change touches messy code, refactor that part (and only that part) so the result stays clean.
- Never hardcode: values that can change — URLs, endpoints, file paths, credentials, API keys, user-specific data, magic numbers — must come from config, environment variables, parameters, or named constants, never buried as literals in code. Secrets must never be hardcoded, ever.
- If another file truly must change too, say why before doing it.
- Afterwards, show the diff and describe in one sentence what changed.

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] The whole file (or the relevant part) was read before editing
- [ ] The diff is the smallest that solves the task — nothing unasked-for is in it
- [ ] No unrelated lines were reformatted, reordered, or renamed
- [ ] No new hardcoded values (URLs, endpoints, paths, credentials, keys, magic numbers) — config, environment variables, parameters, or named constants instead
- [ ] If another file changed too, the reason was stated before changing it
- [ ] The diff is shown and the change described in one sentence

### Examples

**Do:** read the file, change only the lines the task needs, then show the diff with a one-sentence summary of what changed.

**Do not:** reformat the whole file, rename unrelated variables, and bury a new API URL as a literal — all while fixing one bug.

### Sources

- No external source is cited in this skill; the rules stand as written (general practice).

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.

---

## Companion playbook: no-hallucination (always paired with safe-editing)

## Skill: no-hallucination

When to use: every time you write new code or reach for a library/API.

- Before importing, check `package.json` (or the lockfile) that the package is really there.
- Use only functions and APIs you have seen in the codebase or in the official docs.
- If you are unsure of a name or signature, look it up first — never guess.
- If something does not exist, say so immediately — never invent a substitute.
- After coding, verify: does it actually run, or does it only *look* right?
- **Check the claim against the code, not the docs (general practice).** A README, comment, or error message can lie or go stale — the implementation is the truth. If docs and code contradict, report the contradiction; never smooth it over by quoting the docs.
- **Check config is alive (general practice).** Every config value, env var, flag, and setting the code reads must actually exist and be used. A setting nothing reads is dead config — flag it, don't assume it works.
- **Record what you could not verify (general practice).** If a claim can't be checked (no access, no docs, no run), write it down as UNKNOWN with the reason. Never upgrade an unknown into a fact by rephrasing it.

*Examples:* README says `getUser()` returns a Promise — run it. If it returns the user directly, the README is wrong, not the code. `config.json` sets `maxRetries: 5` but nothing reads `maxRetries` — dead config, flag it.

Apply this playbook to the following: $ARGUMENTS
