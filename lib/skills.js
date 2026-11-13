// lib/skills.js — LESSON 4: SKILLS SYSTEM.
//
// Rules are short laws. SKILLS are deeper playbooks for specific work:
// reusable instruction bundles you enable per project.
//
//   skills/<category>/<name>.md — bundled in the harness (the "store"),
//                                  organized by category (v1.17.1); a
//                                  skill's identity is its NAME — the
//                                  category is organization only. The
//                                  database category uses the folder
//                                  form instead: <name>/SKILL.md.
//   <project>/skills/  — the installed copies in your project,
//                                  mirroring the same categories
//   config.skills      — the list of enabled skills in the project
//
// Sync renders the enabled skills into the instruction files, below
// the rules. One source, every runtime — the same pattern throughout.

import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  rmdirSync,
} from "node:fs";
import { join, dirname, basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./frontmatter.js";
import { isValidName } from "./validate.js";
import { loadConfig } from "./config.js";
import { writeSafe, isRealInside } from "./write-safe.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLED_DIR = join(ROOT, "skills");

// Name allowlist — pinned contract (fix plan): `isValidName` is the
// real export from lib/validate.js (Task 1), imported directly.

// Filesystem filenames cap at 255 bytes; reject absurdly long names
// (Review Focus #1) well before the filesystem does, with a clear error.
const MAX_NAME_LENGTH = 100;

// Every name that becomes a path goes through here first (api-security
// rule 4: "Validate input. Reject what you didn't expect." — whitelist
// shapes, never trust raw input; owasp-top10 rule 1: deny by default).
export function assertValidName(name, kind) {
  if (typeof name !== "string" || name.length > MAX_NAME_LENGTH || !isValidName(name)) {
    throw new Error(
      `Invalid ${kind} name "${name}" — names must match /^[A-Za-z0-9][A-Za-z0-9_-]*$/ and be at most ${MAX_NAME_LENGTH} characters.`
    );
  }
}

// Belt-and-braces after the allowlist: prove the resolved path stays
// inside its base directory before any read, write, or delete. The
// lexical check alone is not enough (B-1): a symlink inside the base
// can point outside it, so the REAL path — every symlink in the
// existing prefix resolved — must stay inside the base's real path.
export function assertInside(baseDir, filePath) {
  const base = resolve(baseDir);
  const resolved = resolve(filePath);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    throw new Error(`Path ${filePath} resolves outside ${baseDir}.`);
  }
  if (!isRealInside(baseDir, filePath)) {
    throw new Error(`Path ${filePath} resolves outside ${baseDir}.`);
  }
  return resolved;
}

// B-1 (base-symlink case): assertInside(skillsDir, file) cannot see
// that skillsDir ITSELF is a symlink out of the project — base and
// file then resolve outside together and the comparison passes.
// Prove separately, before any install/remove/load touches the
// directory, that the project's skills/ really lives in the project.
function assertSkillsBaseInside(targetDir) {
  const skillsDir = join(targetDir, "skills");
  if (!isRealInside(targetDir, skillsDir)) {
    throw new Error(`Path ${skillsDir} resolves outside ${targetDir}.`);
  }
}

// Warn before replacing a file the user changed (F-B4): the bundled copy
// is not the file on disk, so say so — writeSafe keeps the old version
// in a .bak, but a silent overwrite would still destroy their edits.
export function warnIfModified(abs, content) {
  if (existsSync(abs) && readFileSync(abs, "utf8") !== content) {
    console.warn(
      `Warning: ${abs} is locally modified — replacing it with the bundled copy. The previous version is saved to ${abs}.bak`
    );
    return true;
  }
  return false;
}

// Scan a skills/ directory for skill files: flat `<name>.md` files
// (category null) plus one level of category subfolders, in two forms:
// `<category>/<name>.md` (the harness form) and
// `<category>/<name>/SKILL.md` (the folder form, as in iging/sauron —
// the database category uses it). A skill's identity is its name in
// both forms. `library` folders hold data files (the design-taste
// palettes/type data), never skills — never descended into. Sorted by
// skill name, so listings are stable wherever the files live.
function scanSkillFiles(baseDir) {
  if (!existsSync(baseDir)) return [];
  const found = [];
  for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push({
        name: entry.name.replace(/\.md$/, ""),
        file: join(baseDir, entry.name),
        category: null,
      });
    } else if (entry.isDirectory() && entry.name !== "library") {
      const sub = join(baseDir, entry.name);
      for (const inner of readdirSync(sub, { withFileTypes: true })) {
        if (inner.isFile() && inner.name.endsWith(".md")) {
          found.push({
            name: inner.name.replace(/\.md$/, ""),
            file: join(sub, inner.name),
            category: entry.name,
          });
        } else if (inner.isDirectory() && inner.name !== "library") {
          const skillFile = join(sub, inner.name, "SKILL.md");
          if (existsSync(skillFile)) {
            found.push({ name: inner.name, file: skillFile, category: entry.name });
          }
        }
      }
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

// The bundled skills in full (name + description + body + category) —
// used by the "global" command, which installs them as slash commands
// for every project on the machine.
//
// The ONE bundled-listing loop (F-W21, ub-mode dryer): both public
// listings below are views over this helper, so they can never diverge.
function readBundledSkills() {
  const files = scanSkillFiles(BUNDLED_DIR);
  const seen = new Map();
  for (const f of files) {
    if (seen.has(f.name)) {
      throw new Error(
        `Duplicate bundled skill "${f.name}" — in ${seen.get(f.name)} and ${f.file}. Skill names must be unique across categories.`
      );
    }
    seen.set(f.name, f.file);
  }
  return files.map(({ name, file, category }) => {
    const { data, body } = parseFrontmatter(readFileSync(file, "utf8"));
    return {
      name,
      description: data.description ?? "",
      version: data.version ?? null,
      body: body.trim(),
      category,
    };
  });
}

export function loadBundledSkills() {
  return readBundledSkills();
}

export function listBundledSkills() {
  // The pinned public shape is { name, description } (a test deep-equals
  // it against loadBundledSkills); the category rides on the full
  // loadBundledSkills() objects instead.
  return readBundledSkills().map(({ name, description }) => ({ name, description }));
}

function readProjectConfig(targetDir) {
  const path = join(targetDir, "harness.config.json");
  if (!existsSync(path))
    throw new Error(
      `No harness.config.json in ${targetDir} — run "init" first.`
    );
  // Parse through loadConfig so a malformed file gets its wrapped,
  // contextual error ("Config is not valid JSON: …") instead of a
  // bare SyntaxError (the W-15 pattern).
  return { path, config: loadConfig(targetDir) };
}

function writeProjectConfig(path, config) {
  // W-3: the master config gets the same atomic write as every
  // derived file. A bare truncating writeFileSync here meant one
  // mid-write crash could brick every command with no rescue copy.
  writeSafe(path, JSON.stringify(config, null, 2) + "\n");
}

// Install a skill into the project: copy the file + enable it in config.
// MODULAR MODE: if the project has no config yet, just copy the file —
// the user gets the skill as a standalone playbook without adopting
// the full harness (the `npx ... skills add x` zero-install flow).
export function addSkill(name, targetDir) {
  assertValidName(name, "skill");
  const found = scanSkillFiles(BUNDLED_DIR).find((f) => f.name === name);
  if (!found) {
    const available = listBundledSkills().map((s) => s.name).join(", ");
    throw new Error(`No bundled skill named "${name}". Available: ${available}`);
  }
  const src = found.file;
  assertInside(BUNDLED_DIR, src);

  // W-15: parse the config BEFORE copying anything. loadConfig wraps
  // a malformed file in a contextual error; the old bare JSON.parse
  // here threw a raw SyntaxError AFTER writeSafe had already
  // installed the file — a half-applied add reported as a failure.
  const configPath = join(targetDir, "harness.config.json");
  const config = existsSync(configPath) ? loadConfig(targetDir) : null;

  // The install mirrors the store's organization (v1.17.1): a
  // categorized skill lands in skills/<category>/, so an init'd
  // project is organized exactly like the harness itself — flat
  // <name>.md for the harness form, <name>/SKILL.md for the folder
  // form (the database category).
  const destDir = found.category
    ? join(targetDir, "skills", found.category)
    : join(targetDir, "skills");
  const dest =
    basename(src) === "SKILL.md"
      ? join(destDir, name, "SKILL.md")
      : join(destDir, `${name}.md`);
  // B-1: prove containment (symlinks included) BEFORE creating any
  // directory — mkdir through a planted symlink could otherwise
  // create directories outside the project.
  assertSkillsBaseInside(targetDir);
  assertInside(join(targetDir, "skills"), dest);
  mkdirSync(dirname(dest), { recursive: true });
  const bundled = readFileSync(src, "utf8");
  warnIfModified(dest, bundled);
  const outcome = writeSafe(dest, bundled);
  const copied = outcome.written === true;

  if (!config) {
    return { copied, enabled: false, noConfig: true, file: dest };
  }
  if (!Array.isArray(config.skills)) config.skills = [];
  const alreadyEnabled = config.skills.includes(name);
  if (!alreadyEnabled) {
    config.skills.push(name);
    writeProjectConfig(configPath, config);
  }
  return { copied, enabled: true, alreadyEnabled, file: dest };
}

// Disable a skill: remove it from the config + delete the installed
// copy from the project. The skill must be enabled first — otherwise
// nothing is deleted and the config is untouched. Delete first, then
// rewrite the config, so a failed delete leaves the config truthful.
export function removeSkill(name, targetDir) {
  assertValidName(name, "skill");
  // S-19: a name that is not in the bundled store at all is an error,
  // exactly like addSkill — otherwise a typo'd removal reports "was
  // not enabled" and the user believes an enabled skill is gone.
  if (!scanSkillFiles(BUNDLED_DIR).some((f) => f.name === name)) {
    const available = listBundledSkills().map((s) => s.name).join(", ");
    throw new Error(`No bundled skill named "${name}". Available: ${available}`);
  }
  const { path, config } = readProjectConfig(targetDir);
  if (!Array.isArray(config.skills)) config.skills = [];
  const wasEnabled = config.skills.includes(name);
  if (!wasEnabled) return { wasEnabled: false, removedFile: false };
  // The installed copy may be flat (older installs) or categorized
  // (v1.17.1) — resolve wherever it actually lives.
  const installed = scanSkillFiles(join(targetDir, "skills")).find(
    (f) => f.name === name
  );
  const file = installed?.file ?? join(targetDir, "skills", `${name}.md`);
  assertSkillsBaseInside(targetDir);
  assertInside(join(targetDir, "skills"), file);
  const removedFile = existsSync(file);
  let keptDirectory = false;
  if (removedFile) {
    if (basename(file) === "SKILL.md") {
      // W-16: delete ONLY the SKILL.md the harness installed. The old
      // code rmSync'd the whole folder, taking any user files beside
      // it (notes, data) with it. The folder itself goes only when
      // nothing else remains in it.
      rmSync(file);
      const dir = dirname(file);
      let remaining = [];
      try {
        remaining = readdirSync(dir);
      } catch {
        remaining = [];
      }
      if (remaining.length === 0) {
        try {
          rmdirSync(dir);
        } catch {
          // Already gone or not empty after all — either is fine.
        }
      } else {
        keptDirectory = true;
      }
    } else {
      rmSync(file);
    }
  }
  config.skills = config.skills.filter((s) => s !== name);
  writeProjectConfig(path, config);
  const result = { wasEnabled, removedFile };
  // W-16: say so in the result when user files kept the folder alive.
  if (keptDirectory) result.keptDirectory = true;
  return result;
}

// Read the enabled skills in full (name + description + body) so sync
// can render them into the instruction files AND generate a slash
// command for each one.
export function loadSkills(targetDir, config) {
  // B-1: never read skill bodies through a skills/ symlink that
  // resolves outside the project.
  assertSkillsBaseInside(targetDir);
  const skills = [];
  // One scan resolves wherever an installed skill lives: flat
  // (`skills/<name>.md`, older installs) or categorized
  // (`skills/<category>/<name>.md`, v1.17.1 installs and this repo's
  // own store, which doubles as its project skills).
  const projectFiles = new Map(
    scanSkillFiles(join(targetDir, "skills")).map((f) => [f.name, f.file])
  );
  // Bundled store locations, for the W-14 shadowing check below.
  const bundledFiles = new Map(
    scanSkillFiles(BUNDLED_DIR).map((f) => [f.name, f.file])
  );
  for (const name of config.skills ?? []) {
    assertValidName(name, "skill");
    const file =
      projectFiles.get(name) ?? join(targetDir, "skills", `${name}.md`);
    assertInside(join(targetDir, "skills"), file);
    if (!existsSync(file))
      throw new Error(
        `Skill "${name}" is enabled in the config but has no file in skills/ — run "skills add ${name}".`
      );
    const raw = readFileSync(file, "utf8");
    const { data, body } = parseFrontmatter(raw);
    // W-14: a project-local skill file whose content differs from the
    // bundled skill of the same name SHADOWS the bundled one — sync
    // renders the local text into every runtime's instruction files.
    // That used to happen silently (the only warning lived on the
    // `skills add` path); name both files so the user can see which
    // copy wins. An identical local copy is a normal install — no
    // warning. (This repo's own store doubles as its project skills;
    // there the two paths are the same file, so nothing warns.)
    const bundledFile = bundledFiles.get(name);
    if (bundledFile && resolve(bundledFile) !== resolve(file)) {
      try {
        if (readFileSync(bundledFile, "utf8") !== raw) {
          console.warn(
            `Warning: project-local skill "${name}" (${file}) shadows the bundled skill "${name}" (${bundledFile}) — the local content differs from the bundled copy, and the local content is what sync renders.`
          );
        }
      } catch {
        // Bundled copy unreadable — nothing to compare against.
      }
    }
    skills.push({ name, description: data.description ?? "", body: body.trim() });
  }
  return skills;
}

// The project-local skill object for `name` (installed copy), or null
// when the project has none. Tolerant by design: this feeds content
// comparisons, where "cannot read it" must mean "not generated", not
// a crash.
function projectSkillObject(targetDir, name) {
  try {
    // B-1: do not read through a skills/ symlink that escapes the
    // project — treat the local copy as absent (bundled fallback).
    if (!isRealInside(targetDir, join(targetDir, "skills"))) return null;
    const found = scanSkillFiles(join(targetDir, "skills")).find(
      (f) => f.name === name
    );
    if (!found) return null;
    const { data, body } = parseFrontmatter(readFileSync(found.file, "utf8"));
    return { name, description: data.description ?? "", body: body.trim() };
  } catch {
    return null;
  }
}

// B-2 support for the orphan sweep: is `content` a file the harness
// itself generated for skill `name`? True when the content carries
// the harness's generated marker, or is byte-identical to what sync
// would generate for that skill — from the project-local copy when
// one is installed (that is what sync renders), else the bundled
// copy. Companion playbooks are embedded only when the companion was
// enabled in the same run, so both variants (with and without the
// companion) count as generated. Anything else is treated as
// hand-written and must never be deleted by the sweep.
export function isGeneratedSkillFile(targetDir, name, kind, content) {
  if (content.includes("generated by")) return true;
  const source =
    projectSkillObject(targetDir, name) ??
    readBundledSkills().find((s) => s.name === name) ??
    null;
  if (!source) return false;
  const build = kind === "bundle" ? skillBundleContent : skillCommandContent;
  const contexts = [[source]];
  const companions = (COMPANIONS[name] ?? [])
    .map(
      (companionName) =>
        projectSkillObject(targetDir, companionName) ??
        readBundledSkills().find((s) => s.name === companionName) ??
        null
    )
    .filter(Boolean);
  if (companions.length) contexts.push([source, ...companions]);
  return contexts.some((ctx) => build(source, ctx) === content);
}

// The slash-command file generated for a skill, so the skill shows up
// in the runtime's "/" menu (OpenCode and Claude list the files in
// their commands folders). Invoking /<skill> hands the playbook to
// the AI together with whatever the user types after it.
// Companion pairings: when one of these skills is rendered as a slash
// command, the companion's playbook is embedded in the same file —
// so a single call always carries both disciplines. safe-editing
// pairs with no-hallucination: the AI that edits must never invent
// the code it edits with.
const COMPANIONS = { "safe-editing": ["no-hallucination"] };

// Quote a value as a YAML single-quoted string (F-W19): descriptions
// contain ": " (rea, ub-mode), which a strict YAML parser rejects
// unquoted ("mapping values are not allowed here"). Single quotes only
// need '' doubling; newlines are flattened first.
export function yamlQuote(value) {
  return `'${String(value)
    .replace(/\r\n?/g, " ")
    .replace(/\n/g, " ")
    .replace(/'/g, "''")}'`;
}

export function skillCommandContent(skill, allSkills = []) {
  let content =
    `---\ndescription: ${yamlQuote(skill.description)}\n---\n\n` + `${skill.body}\n`;
  for (const companionName of COMPANIONS[skill.name] ?? []) {
    const companion = allSkills.find((s) => s.name === companionName);
    if (companion) {
      content +=
        `\n---\n\n## Companion playbook: ${companion.name} ` +
        `(always paired with ${skill.name})\n\n${companion.body}\n`;
    }
  }
  content += `\nApply this playbook to the following: $ARGUMENTS\n`;
  return content;
}

// Skill BUNDLE content — the Agent Skills open standard (agentskills.io):
// one folder per skill, containing a SKILL.md with `name` + `description`
// frontmatter. Freebuff, GitHub Copilot CLI, and Antigravity all read
// this format. The body is identical to the slash-command version
// (companions included) so every runtime enforces the same disciplines;
// only the frontmatter gains the required `name` field.
export function skillBundleContent(skill, allSkills = []) {
  const command = skillCommandContent(skill, allSkills);
  return command.replace(
    `---\ndescription: `,
    `---\nname: ${skill.name}\ndescription: `
  );
}
