---
description: Surgical editing — the smallest possible diff, no collateral damage, always seasoned senior-developer quality and well structured.
---

## Skill: safe-editing

When to use: every change to existing code.

- Read the whole file (or the relevant part) before changing anything.
- Make the **smallest diff** that solves the task — never include changes that were not asked for.
- Do not reformat, reorder, or rename unrelated lines.
- Code as a seasoned senior developer with many years of experience shipping real products — websites and mobile apps deployed to production: clear names, small focused functions, no duplication, no clever hacks, edge cases handled, production-ready and maintainable — every change must be easy to understand at a glance.
- Keep the code well structured: separate concerns into files and modules with clear organization and placement. Never leave spaghetti code behind — if the change touches messy code, refactor that part (and only that part) so the result stays clean.
- Never hardcode: values that can change — URLs, endpoints, file paths, credentials, API keys, user-specific data, magic numbers — must come from config, environment variables, parameters, or named constants, never buried as literals in code. Secrets must never be hardcoded, ever.
- If another file truly must change too, say why before doing it.
- Afterwards, show the diff and describe in one sentence what changed.

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
