---
name: verify_before_done
description: 'Check defined-and-called plus remote evidence before reporting done, pushed, fixed, or working — and never present an untested guess as done. Also covers provider claims and publish/install surfaces (verify_provider_claims and verify_publish_install_surface merged in, 2026-11-13).'
---

## Skill: verify_before_done

### Check defined and called

- Confirm every changed symbol is both defined and called, or imported and used, before you report a code fix as done.

- Treat a definition with no call site as an untested change, not a fix.

### Re-run every affected suite after every change

- After any change to a file, re-run every test suite that touches that file before you report the work as done, even when the change looks like a comment or a doc edit.

- Do not reuse a passing result from before the change, since the change itself can break the suite that passed.

- When a task has several suites, run all of them at the end, not only the suite for the part you just touched.

- If a suite cannot run here, say which suite is unrun and label the work untested instead of reporting it as done.

### Treat mock passes as logic-only evidence

- Treat a pass on mocked data as proof of the code logic only, never as proof that the live behavior works.

- Check what the mock returns before you trust the pass, since a pre-shaped mock can hide a missing row, a wrong field name, or a call that never happens.

- Ask whether the test would still pass if the real service returned nothing, returned an error, or used a different field name, and add a live or integration check when the answer is yes.

- For security and data rules, verify the real check on the live path, such as who can call a function or which rows a query creates, instead of trusting a mock that assumes the rule holds.

### Get remote evidence

- Confirm a pushed commit SHA exists on origin through the runtime's GitHub access (git ls-remote, the repo's commits page, or the runtime's GitHub tooling) before you say it is pushed.

- Use test output or a smoke test as the evidence for fixed or working, and never report from a report alone.

- Check origin yourself when the user relays another agent's done or pushed claim instead of repeating it unverified.

### Never present a guess as done

- Label untested work as untested and name what remains, instead of presenting a best guess as done.

- Hand over a checkable SHA or test command with every done report, so the user can verify without asking.

### Available connectors

- GitHub access (git ls-remote, the repo's web UI, or the runtime's GitHub tooling) for checking commits, tags, and releases on origin.

- Use the runtime's own search and setup to find other connectors and related skills.

- If nothing here fits, look on the web for a maintained API or MCP server and set it up through the runtime's own connector/MCP setup, or build a custom connector.

### Alternatives for better results

- Save the checkable evidence, such as the SHA, the test command, or the screenshot, with the report so a later turn can re-verify without redoing the work.

## Merged: verify_provider_claims (2026-11-13)

The standalone `verify_provider_claims` skill was merged into this skill on 2026-11-13. Its rules follow, unchanged.

### Spot the claims that go stale

- Treat any statement about a third party's current state as a claim that can go stale, such as availability, free tier, pricing, endpoint URLs and ports, signup requirements, and retired or deprecated status.

- Pause before you assert one of these claims from memory, since model routing, pricing, and endpoints change faster than training data.

- Name the claim plainly in your own working notes before you check it, so you know exactly what you are verifying.

### Check the live source first

- Read the provider's current docs, README, changelog, or status page for the exact claim before you state it.

- Prefer the user's own verified setup, such as a screenshot, their config file, or a working connection, over documentation when the two disagree.

- Quote the source you checked when you present the claim, so the user can see where it came from.

- Say what changed when the live source contradicts your memory, instead of silently correcting yourself.

### Say what you could not verify

- State plainly when you could not check a claim, and give it as your best understanding rather than a fact.

- Recheck a provider fact you verified before when enough time has passed or the user reports a mismatch, instead of reusing it blindly.

- Keep dated provider facts with their source in memory when the user relies on them repeatedly, and recheck them before a new recommendation.

### Available connectors

- Use the runtime's own search and setup to find other connectors and related skills.

- If nothing here fits, look on the web for a maintained API or MCP server and set it up through the runtime's own connector/MCP setup, or build a custom connector.

### Alternatives for better results

- Ask the user to confirm the current state from their own screen when the provider's docs are vague, paywalled, or contradict each other, since their live setup settles the question fastest.

- Check the provider's changelog or release notes when a claim worked recently and now fails, since a quiet retirement or migration is the usual cause.

## Merged: verify_publish_install_surface (2026-11-13)

The standalone `verify_publish_install_surface` skill was merged into this skill on 2026-11-13. Its rules follow, unchanged.

### Identify the surface the user is looking at

- Ask which surface the user is looking at before explaining an update, such as a release page, a registry listing, a screenshot, or the installed file on their machine.

- Treat a release page, a registry listing, and a local install as three different surfaces that can show three different versions at the same time.

- Read any screenshot the user sends for the surface it actually shows instead of assuming it shows the surface you just published to.

### Check each surface in order

- Check the source commit or tag first and record the version it carries.

- Check the registry listing next and record the newest version it actually offers, since a release note alone does not change what an install command will fetch.

- Check the installed file last and ask the user to read the version marker inside it, since an install without the follow up sync or generation step can leave an older file in place.

- Name the version found on each surface in your reply and say plainly which surfaces match and which ones do not.

### Confirm the local install before closing

- Ask explicitly whether the user ran every step of the update chain, including any sync or generation step that rewrites local command files, before concluding that a missing feature is a code problem.

- Give the full update chain again when any step is missing, and wait for the user to confirm the local file changed before saying the update is live for them.

- Do not say a version is live on the user's machine from a successful push, a successful registry publish, or a release page alone.

### Available connectors

- GitHub access (git ls-remote, the repo's web UI, or the runtime's GitHub tooling) for checking commits, tags, and releases.

- The npm registry (`npm view <package> version`) for checking published package versions.

- Use the runtime's own search and setup to find other connectors and related skills.

- If nothing here fits, look on the web for a maintained API or MCP server and set it up through the runtime's own connector/MCP setup, or build a custom connector.

### Alternatives for better results

- Ask the user to paste the exact version line from the installed file when a screenshot is cropped or unclear, since that line settles the local surface faster than another restart.

- Batch related changes into one publish when the user must run the full update chain, so one verification round covers all of them.

Apply this playbook to the following: $ARGUMENTS
