# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting instead:
**Security tab → Report a vulnerability** on this repository
(or open `https://github.com/xcell321/reviewer-harness/security/advisories/new`).

Include:

- What the issue is and what it lets an attacker (or a careless config) do
- Steps to reproduce, ideally with a minimal `harness.config.json`
- The version of reviewer-harness and your Node.js version

You can expect an acknowledgment within a few days. Fixes for confirmed issues will be released as a patch version, and the reporter credited in the release notes (unless they prefer to stay anonymous).

## The harness's security model

reviewer-harness is designed to be safe by default:

- **Local only.** The harness makes no network calls and sends nothing anywhere. It reads a config, and writes instruction files inside the target project.
- **Secret scanning.** `validate` — and the gate inside `sync` — scans rules and other config text for common credential patterns (API keys, GitHub tokens, AWS keys, private key blocks, generic secret assignments). A config containing a likely secret **will not sync**, because synced instruction files are commonly committed to Git.
- **Backup before overwrite.** If sync is about to overwrite an existing instruction file, it first writes a `.bak` copy.
- **Writes stay in the target.** Sync writes only the known instruction files (and `memory/` index files, when memory is in use) inside the target directory you specify.

## What counts as a vulnerability here

- A secret pattern that bypasses the scanner and ends up in synced files
- A way for config content to make sync write outside the target directory
- Overwriting a file without the promised `.bak` backup
- Anything that makes the harness execute code from the config or from a skill/agent/command file (these are data — markdown and JSON — and must never be executed)

Usability complaints about the scanner (false positives on ordinary sentences) are bugs, not vulnerabilities — please file those as regular issues so the patterns can be tuned in the open.
