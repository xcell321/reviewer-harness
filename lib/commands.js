// lib/commands.js — LESSON 5: SLASH COMMANDS.
//
// Ang slash command kay andam nga prompt nga imong i-type sa runtime
// (e.g. /review, /explain). Usa ka master definition sa harness,
// i-generate ngadto sa format sa matag runtime:
//
//   OpenCode → .opencode/commands/<name>.md
//   Claude   → .claude/commands/<name>.md
//
// Ang $ARGUMENTS mapulihan sa runtime sa imong gi-type human sa command.

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./frontmatter.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLED_DIR = join(ROOT, "commands");

export function listBundledCommands() {
  if (!existsSync(BUNDLED_DIR)) return [];
  return readdirSync(BUNDLED_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const { data } = parseFrontmatter(readFileSync(join(BUNDLED_DIR, file), "utf8"));
      return { name: file.replace(/\.md$/, ""), description: data.description ?? "" };
    });
}

export function addCommand(name, targetDir) {
  const src = join(BUNDLED_DIR, `${name}.md`);
  if (!existsSync(src)) {
    const available = listBundledCommands().map((c) => c.name).join(", ");
    throw new Error(`Walay bundled command nga "${name}". Available: ${available}`);
  }
  const { data, body } = parseFrontmatter(readFileSync(src, "utf8"));
  const description = data.description ?? name;
  const content = `---\ndescription: ${description}\n---\n\n${body.trim()}\n`;
  const written = [];

  for (const dir of [
    join(targetDir, ".opencode", "commands"),
    join(targetDir, ".claude", "commands"),
  ]) {
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${name}.md`);
    writeFileSync(file, content);
    written.push(file);
  }
  return { written };
}
