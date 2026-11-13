---
name: no-hallucination
description: Make sure every library, function, and API actually exists before using it.
version: 1.0.0
---

## Skill: no-hallucination

### Purpose

Make sure every library, function, and API actually exists before using it.
It prevents invented imports, guessed names or signatures, and substitutes for things that do not exist from entering code as if they were real.

### When to use

When to use: every time you write new code or reach for a library/API.

| Trigger | Example |
| --- | --- |
| Writing new code | "Add a feature that calls a new API" |
| Reaching for a library or API | "Import a package and use its functions" |

Do NOT use when: the work is reporting a finished change as done — `verify_before_done` owns the defined-and-called and remote-evidence check for that report. The edit itself is governed by `safe-editing`, and a failure that is not yet understood is reproduced first under `debug-first`.

### Rules

- Before importing, check `package.json` (or the lockfile) that the package is really there.
- Use only functions and APIs you have seen in the codebase or in the official docs.
- If you are unsure of a name or signature, look it up first — never guess.
- If something does not exist, say so immediately — never invent a substitute.
- After coding, verify: does it actually run, or does it only *look* right?
- **Check the claim against the code, not the docs (general practice).** A README, comment, or error message can lie or go stale — the implementation is the truth. If docs and code contradict, report the contradiction; never smooth it over by quoting the docs.
- **Check config is alive (general practice).** Every config value, env var, flag, and setting the code reads must actually exist and be used. A setting nothing reads is dead config — flag it, don't assume it works.
- **Record what you could not verify (general practice).** If a claim can't be checked (no access, no docs, no run), write it down as UNKNOWN with the reason. Never upgrade an unknown into a fact by rephrasing it.

### Validation gate

Before reporting the task done, check each line against the actual work:

- [ ] Before importing, the package was checked in `package.json` (or the lockfile)
- [ ] Every function and API used was seen in the codebase or in the official docs
- [ ] Any unsure name or signature was looked up first — never guessed
- [ ] Anything that does not exist was said so immediately — no invented substitute
- [ ] After coding, it was verified to actually run, not only to look right
- [ ] Claims were checked against the code, not the docs; dead config was flagged; anything that could not be verified was recorded as UNKNOWN with the reason

### Examples

*Examples:* README says `getUser()` returns a Promise — run it. If it returns the user directly, the README is wrong, not the code. `config.json` sets `maxRetries: 5` but nothing reads `maxRetries` — dead config, flag it.

### Sources

- No external source is cited in this skill; the rules stand as written (general practice).

### Changelog

- 1.0.0 — 2026-11-13 — Template retrofit; rules unchanged.
