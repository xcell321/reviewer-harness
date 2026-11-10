---
name: verify_before_done
description: Check defined-and-called plus remote evidence before reporting done, pushed, fixed, or working — and never present an untested guess as done.
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

Apply this playbook to the following: $ARGUMENTS
