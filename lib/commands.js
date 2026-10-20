// lib/commands.js — LESSON 5: SLASH COMMANDS.
//
// A slash command is a ready-made prompt you type in the runtime
// (e.g. /review, /explain). One master definition in the harness,
// generated into each runtime's format:
//
//   OpenCode → .opencode/commands/<name>.md
//   Claude   → .claude/commands/<name>.md
//
// $ARGUMENTS is replaced by the runtime with whatever you type
// after the command.

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
    throw new Error(`No bundled command named "${name}". Available: ${available}`);
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
