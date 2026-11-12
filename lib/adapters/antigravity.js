// lib/adapters/antigravity.js — ADAPTER for Google Antigravity.
//
// Antigravity follows the Agent Skills open standard (agentskills.io):
// workspace skills at `<workspace>/.agents/skills/<name>/SKILL.md`
// (with backward compatibility for `.agent/skills/`), and global
// skills at `~/.gemini/config/skills/<name>/SKILL.md`. This adapter
// covers the workspace side (used by `sync`); the global side is
// covered by the `global` command.
//
// Like Freebuff and Copilot CLI, Antigravity is skills-only here:
// it exports skillBundleDir() instead of targetFile()/renderInstructions().
//
// NOTE: this directory is shared with Freebuff (which returns the
// same ".agents/skills"). sync() writes a shared bundle directory
// once per run — the later runtime reports it as deduped (F-S44).

export function skillBundleDir() {
  return ".agents/skills";
}
