// lib/agents.js — LESSON 5: SUB-AGENTS.
//
// A sub-agent is a specialist AI the main agent can call for one job
// (plan, review, debug). Each runtime has its own format:
//
//   OpenCode → .opencode/agents/<name>.md  (frontmatter: description, mode)
//   Claude   → .claude/agents/<name>.md    (frontmatter: name, description)
//
// The harness keeps ONE master definition (agents/<name>.md in the
// harness), and `agents add` generates both formats. The same pattern
// as the rules: one source, every runtime.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./frontmatter.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLED_DIR = join(ROOT, "agents");

export function listBundledAgents() {
  if (!existsSync(BUNDLED_DIR)) return [];
  return readdirSync(BUNDLED_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const { data } = parseFrontmatter(readFileSync(join(BUNDLED_DIR, file), "utf8"));
      return { name: file.replace(/\.md$/, ""), description: data.description ?? "" };
    });
}

// Install an agent into the project: one master, two runtime files.
export function addAgent(name, targetDir) {
  const src = join(BUNDLED_DIR, `${name}.md`);
  if (!existsSync(src)) {
    const available = listBundledAgents().map((a) => a.name).join(", ");
    throw new Error(`No bundled agent named "${name}". Available: ${available}`);
  }
  const { data, body } = parseFrontmatter(readFileSync(src, "utf8"));
  const description = data.description ?? name;
  const written = [];

  const opencodeDir = join(targetDir, ".opencode", "agents");
  mkdirSync(opencodeDir, { recursive: true });
  const opencodeFile = join(opencodeDir, `${name}.md`);
  writeFileSync(
    opencodeFile,
    `---\ndescription: ${description}\nmode: subagent\n---\n\n${body.trim()}\n`
  );
  written.push(opencodeFile);

  const claudeDir = join(targetDir, ".claude", "agents");
  mkdirSync(claudeDir, { recursive: true });
  const claudeFile = join(claudeDir, `${name}.md`);
  writeFileSync(
    claudeFile,
    `---\nname: ${name}\ndescription: ${description}\n---\n\n${body.trim()}\n`
  );
  written.push(claudeFile);

  return { written };
}
