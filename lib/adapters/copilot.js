// lib/adapters/copilot.js — ADAPTER for GitHub Copilot CLI.
//
// GitHub Copilot CLI reads Agent Skills (agentskills.io) from skill
// folders: project skills at `<project>/.github/skills/<name>/SKILL.md`
// (it also recognizes `.claude/skills/` and `.agents/skills/`), and
// personal skills at `~/.copilot/skills/<name>/SKILL.md` (or
// `~/.agents/skills/`). This adapter covers the project side (used by
// `sync`); the personal side is covered by the `global` command.
//
// Like Freebuff and Antigravity, Copilot CLI is skills-only here:
// it exports skillBundleDir() instead of targetFile()/renderInstructions().

export function skillBundleDir() {
  return ".github/skills";
}
