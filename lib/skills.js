// lib/skills.js — LESSON 4: SKILLS SYSTEM.
//
// Rules are short laws. SKILLS are deeper playbooks for specific work:
// reusable instruction bundles you enable per project.
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
// MODULAR MODE: if the project has no config yet, just copy the file —
// the user gets the skill as a standalone playbook without adopting
// the full harness (the `npx ... skills add x` zero-install flow).
export function addSkill(name, targetDir) {
  const src = join(BUNDLED_DIR, `${name}.md`);
  if (!existsSync(src)) {
    const available = listBundledSkills().map((s) => s.name).join(", ");
    throw new Error(`No bundled skill named "${name}". Available: ${available}`);
  }

  const destDir = join(targetDir, "skills");
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${name}.md`);
  const copied = !existsSync(dest) || readFileSync(dest, "utf8") !== readFileSync(src, "utf8");
  copyFileSync(src, dest);

  const configPath = join(targetDir, "harness.config.json");
  if (!existsSync(configPath)) {
    return { copied, enabled: false, noConfig: true, file: dest };
  }
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!Array.isArray(config.skills)) config.skills = [];
  const alreadyEnabled = config.skills.includes(name);
  if (!alreadyEnabled) {
    config.skills.push(name);
    writeProjectConfig(configPath, config);
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

// Read the enabled skills in full (name + description + body) so sync
// can render them into the instruction files AND generate a slash
// command for each one.
export function loadSkills(targetDir, config) {
  const skills = [];
  for (const name of config.skills ?? []) {
    const file = join(targetDir, "skills", `${name}.md`);
    if (!existsSync(file))
      throw new Error(
        `Skill "${name}" is enabled in the config but has no file in skills/ — run "skills add ${name}".`
      );
    const { data, body } = parseFrontmatter(readFileSync(file, "utf8"));
    skills.push({ name, description: data.description ?? "", body: body.trim() });
  }
  return skills;
}

// Enabled but no file? loadSkills throws a clear error, never a
// silent skip: a strict harness never guesses.
export function loadSkillSections(targetDir, config) {
  return loadSkills(targetDir, config).map((s) => s.body);
}

// The slash-command file generated for a skill, so the skill shows up
// in the runtime's "/" menu (OpenCode and Claude list the files in
// their commands folders). Invoking /<skill> hands the playbook to
// the AI together with whatever the user types after it.
export function skillCommandContent(skill) {
  return (
    `---\ndescription: ${skill.description}\n---\n\n` +
    `${skill.body}\n\nApply this playbook to the following: $ARGUMENTS\n`
  );
}
