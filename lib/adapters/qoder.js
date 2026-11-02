// lib/adapters/qoder.js — ADAPTER for Qoder (Alibaba's agentic coding CLI/IDE).
//
// Qoder follows the Agent Skills open standard (agentskills.io):
// skills are folders containing a SKILL.md with `name` + `description`
// frontmatter. Personal skills live at `~/.qoder/skills/<name>/SKILL.md`;
// project skills live at `<project>/.qoder/skills/<name>/SKILL.md`.
// This adapter covers the project side (used by `sync`); the personal
// side is covered by the `global` command.
//
// Qoder has no single instruction file like CLAUDE.md, so this
// adapter is skills-only: it exports skillBundleDir() instead of
// targetFile()/renderInstructions().

export function skillBundleDir() {
  return ".qoder/skills";
}
