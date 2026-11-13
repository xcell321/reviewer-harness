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

import { readdirSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./frontmatter.js";
import { assertValidName, assertInside, warnIfModified, yamlQuote } from "./skills.js";
import { writeSafe, isRealInside } from "./write-safe.js";

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

// B-1 (base-symlink case, same guard as skills.js's
// assertSkillsBaseInside): assertInside(dir, file) cannot see that
// dir ITSELF is a symlink out of the project — base and file then
// resolve outside together and the comparison passes. Prove, before
// the mkdir/write, that each runtime dir really lives in the project.
function assertRuntimeDirInside(targetDir, dir) {
  if (!isRealInside(targetDir, dir)) {
    throw new Error(`Path ${dir} resolves outside ${targetDir}.`);
  }
}

export function addCommand(name, targetDir) {
  assertValidName(name, "command");
  const src = join(BUNDLED_DIR, `${name}.md`);
  assertInside(BUNDLED_DIR, src);
  if (!existsSync(src)) {
    const available = listBundledCommands().map((c) => c.name).join(", ");
    throw new Error(`No bundled command named "${name}". Available: ${available}`);
  }
  const { data, body } = parseFrontmatter(readFileSync(src, "utf8"));
  const description = data.description ?? name;
  const content = `---\ndescription: ${yamlQuote(description)}\n---\n\n${body.trim()}\n`;
  const written = [];

  for (const dir of [
    join(targetDir, ".opencode", "commands"),
    join(targetDir, ".claude", "commands"),
  ]) {
    assertRuntimeDirInside(targetDir, dir);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${name}.md`);
    assertInside(dir, file);
    warnIfModified(file, content);
    writeSafe(file, content);
    written.push(file);
  }
  return { written };
}
