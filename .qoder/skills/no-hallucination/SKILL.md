---
name: no-hallucination
description: 'Make sure every library, function, and API actually exists before using it.'
---

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
