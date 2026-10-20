// lib/skills.js — LESSON 4: SKILLS SYSTEM.
//
// Rules are short laws. SKILLS are deeper playbooks for specific work
// (like sauron's `add`): reusable instruction bundles you enable
// per project.
//
//   skills/<name>.md   — bundled in the harness (the "store")
//   <project>/skills/  — the installed copy in your project
//   config.skills      — the list of enabled skills in the project
//
// Sync renders the enabled skills into the instruction files, below
// the rules. One source, every runtime — the same pattern throughout.

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./frontmatter.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLED_DIR = join(ROOT, "skills");

export function listBundledSkills() {
  if (!existsSync(BUNDLED_DIR)) return [];
  return readdirSync(BUNDLED_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const { data } = parseFrontmatter(
        readFileSync(join(BUNDLED_DIR, file), "utf8")
      );
      return {
        name: file.replace(/\.md$/, ""),
        description: data.description ?? "",
      };
    });
}

function readProjectConfig(targetDir) {
  const path = join(targetDir, "harness.config.json");
  if (!existsSync(path))
    throw new Error(
      `No harness.config.json in ${targetDir} — run "init" first.`
    );
  return { path, config: JSON.parse(readFileSync(path, "utf8")) };
}

function writeProjectConfig(path, config) {
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

// Install a skill into the project: copy the file + enable it in config.
export function addSkill(name, targetDir) {
  const src = join(BUNDLED_DIR, `${name}.md`);
  if (!existsSync(src)) {
    const available = listBundledSkills().map((s) => s.name).join(", ");
    throw new Error(`No bundled skill named "${name}". Available: ${available}`);
  }
  const { path, config } = readProjectConfig(targetDir);
  if (!Array.isArray(config.skills)) config.skills = [];

  const destDir = join(targetDir, "skills");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${name}.md`);
  const copied = !existsSync(dest) || readFileSync(dest, "utf8") !== readFileSync(src, "utf8");
  copyFileSync(src, dest);

  const alreadyEnabled = config.skills.includes(name);
  if (!alreadyEnabled) {
    config.skills.push(name);
    writeProjectConfig(path, config);
  }
  return { copied, enabled: true, alreadyEnabled, file: dest };
}

// Disable a skill: remove it from the config + delete the installed
// copy from the project.
export function removeSkill(name, targetDir) {
  const { path, config } = readProjectConfig(targetDir);
  if (!Array.isArray(config.skills)) config.skills = [];
  const wasEnabled = config.skills.includes(name);
  config.skills = config.skills.filter((s) => s !== name);
  if (wasEnabled) writeProjectConfig(path, config);
  const file = join(targetDir, "skills", `${name}.md`);
  const removedFile = existsSync(file);
  if (removedFile) rmSync(file);
  return { wasEnabled, removedFile };
}

// Read the enabled skills' contents so sync can render them.
// Enabled but no file? That's a clear error, not a silent skip:
// a strict harness never guesses.
export function loadSkillSections(targetDir, config) {
  const sections = [];
  for (const name of config.skills ?? []) {
    const file = join(targetDir, "skills", `${name}.md`);
    if (!existsSync(file))
      throw new Error(
        `Skill "${name}" is enabled in the config but has no file in skills/ — run "skills add ${name}".`
      );
    const { body } = parseFrontmatter(readFileSync(file, "utf8"));
    sections.push(body.trim());
  }
  return sections;
}
