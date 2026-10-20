// lib/skills.js — LESSON 4: SKILLS SYSTEM.
//
// Ang rules kay mubo nga mga lagda. Ang SKILLS kay mas lawom nga
// playbooks para sa espesipikong trabaho (sama sa `add` ni sauron):
// reusable nga instruction bundles nga imong i-enable per project.
//
//   skills/<name>.md   — bundled sa harness (ang "store")
//   <project>/skills/  — ang gi-install nga kopya sa imong project
//   config.skills      — listahan sa enabled skills sa project
//
// Ang sync mo-render sa enabled skills ngadto sa instruction files,
// ubos sa rules. Usa ka tinubdan, tanang runtimes — parehong pattern.

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
      `Walay harness.config.json sa ${targetDir} — dagana una ang "init".`
    );
  return { path, config: JSON.parse(readFileSync(path, "utf8")) };
}

function writeProjectConfig(path, config) {
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

// I-install ang skill sa project: kopyaha ang file + i-enable sa config.
export function addSkill(name, targetDir) {
  const src = join(BUNDLED_DIR, `${name}.md`);
  if (!existsSync(src)) {
    const available = listBundledSkills().map((s) => s.name).join(", ");
    throw new Error(`Walay bundled skill nga "${name}". Available: ${available}`);
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

// I-disable ang skill: tangtanga sa config + tangtanga ang gi-install
// nga kopya sa project.
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

// Basaha ang sulod sa enabled skills para i-render sa sync.
// Kung enabled pero walay file — sayop nga klaro, dili hilom nga skip:
// ang strict nga harness dili magtag-an.
export function loadSkillSections(targetDir, config) {
  const sections = [];
  for (const name of config.skills ?? []) {
    const file = join(targetDir, "skills", `${name}.md`);
    if (!existsSync(file))
      throw new Error(
        `Ang skill "${name}" enabled sa config pero walay file sa skills/ — dagana ang "skills add ${name}".`
      );
    const { body } = parseFrontmatter(readFileSync(file, "utf8"));
    sections.push(body.trim());
  }
  return sections;
}
