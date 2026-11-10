---
name: verify_publish_install_surface
description: Verify a published version on each surface the user can see (commit/tag, registry, installed file) before claiming it is installed or live.
---

## Skill: verify_publish_install_surface

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
