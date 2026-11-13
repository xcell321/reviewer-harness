// lib/validate.js — LESSON 3: GUARDRAILS DEEP DIVE.
import { readFileSync } from "node:fs";
//
// Validation is the harness's security guard: it inspects the master
// spec BEFORE anything is synced. Two jobs:
//
//   1. QUALITY — no empty rules, no duplicates, a problem statement
//      must exist. A broken spec must never become instructions.
//   2. SECRET SCANNING — the config gets synced into instruction files
//      that are usually committed to Git. If an API key slips into
//      the rules, it leaks everywhere. Catch it before that happens.
//
// The sync engine itself calls this — with errors present, no sync.

// Patterns for common secrets. Not exhaustive (no scanner is perfect),
// but these catch the usual accidents.
const SECRET_PATTERNS = [
  { name: "OpenAI/Anthropic-style key", re: /sk-(ant-)?[A-Za-z0-9_-]{16,}/ },
  { name: "GitHub token", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "GitHub fine-grained token", re: /github_pat_[A-Za-z0-9_]{20,}/ },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "Generic secret assignment",
    re: /(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["']?[A-Za-z0-9_\-.]{12,}/i,
  },
];

// Show only the first 4 characters — a report must never leak the
// secret it just found.
function redact(text) {
  return text.length <= 4 ? "••••" : text.slice(0, 4) + "••••";
}

export function isValidName(name) {
  return typeof name === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name);
}

export function scanSecrets(label, text, errors) {
  if (typeof text !== "string") return;
  for (const { name, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) {
      errors.push(
        `Possible secret (${name}) in ${label}: "${redact(m[0])}" — ` +
          `remove it from the config! It would be synced into every instruction file and leaked into Git.`
      );
    }
  }
}

// --- Bundled-skill template gate (sauron-grade roadmap, Phase 2) ---
//
// The config validator above guards what a USER writes. This gate guards
// what the HARNESS SHIPS: every bundled skill must follow the house
// template (templates/skill-template.md) — name, description, a per-skill
// SemVer, and the seven required sections — so a non-compliant skill
// fails CI the same way a wrong skill count does. It applies ONLY to the
// bundled store; user project skills are never forced into the template.

export const REQUIRED_SKILL_SECTIONS = [
  "Purpose",
  "When to use",
  "Rules",
  "Validation gate",
  "Examples",
  "Sources",
  "Changelog",
];

const SKILL_VERSION_RE = /^\d+\.\d+\.\d+$/;
// Kebab/snake ids with at least one separator — the shape of a skill id
// ("api-security", "instruction_registers"), not of a CSS property value
// used as a bare word or a slash command (those carry "/", ".", "#", …).
const SKILL_ID_SHAPE = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)+$/;

function skillHeadings(body) {
  // [{ level, text }] for every ATX heading, in order.
  const out = [];
  for (const m of body.matchAll(/^(#{2,4})\s+(.+?)\s*$/gm)) {
    out.push({ level: m[1].length, text: m[2] });
  }
  return out;
}

function sectionText(body, title) {
  // The text under the heading named `title`, up to the next heading of
  // the same or higher level. Null when the section is absent.
  const lines = body.split("\n");
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{2,4})\s+(.+?)\s*$/);
    if (m && m[2] === title) {
      start = i + 1;
      level = m[1].length;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(/^(#{2,4})\s+/);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

export function validateSkillTemplate(skill, { roster = [] } = {}) {
  const errors = [];
  const label = skill?.name ? `Skill "${skill.name}"` : "A bundled skill";

  if (!skill?.name)
    errors.push(`${label} has no "name" in its frontmatter.`);
  if (!skill?.description || !String(skill.description).trim())
    errors.push(
      `${label} has no "description" in its frontmatter — the description is how an agent decides to load the skill.`
    );

  // --- Per-skill version: present, SemVer-shaped ---
  if (skill?.version === undefined || skill?.version === null || skill?.version === "")
    errors.push(
      `${label} has no "version" in its frontmatter — bundled skills carry a per-skill SemVer (see templates/skill-template.md).`
    );
  else if (!SKILL_VERSION_RE.test(String(skill.version)))
    errors.push(
      `${label} has version "${skill.version}" — not SemVer. Expected MAJOR.MINOR.PATCH (e.g. 1.0.0).`
    );

  // --- Required sections, as headings ---
  const body = typeof skill?.body === "string" ? skill.body : "";
  const headings = skillHeadings(body).map((h) => h.text);
  for (const section of REQUIRED_SKILL_SECTIONS) {
    const present = headings.some(
      (h) => h === section || h.startsWith(`${section} `) || h.startsWith(`${section}:`)
    );
    if (!present)
      errors.push(
        `${label} is missing the required "${section}" section (house template: templates/skill-template.md).`
      );
  }

  // --- Cross-references resolve ---
  // Deliberately narrow (false positives are worse than misses): only
  // backticked, skill-id-shaped tokens inside "When to use" — the one
  // section whose job is naming neighboring skills — must resolve to the
  // bundled roster. Rules bodies legitimately backtick guideline ids,
  // tool names, and provenance ids of merged-away skills; those are not
  // cross-references and are never scanned.
  const whenToUse = sectionText(body, "When to use");
  if (whenToUse !== null) {
    const known = new Set(roster);
    for (const m of whenToUse.matchAll(/`([^`\n]+)`/g)) {
      const token = m[1];
      if (SKILL_ID_SHAPE.test(token) && !known.has(token))
        errors.push(
          `${label} cross-references \`${token}\` in "When to use", but no bundled skill has that name — fix the reference or the roster.`
        );
    }
  }

  return errors;
}

export function validateBundledSkills(skills) {
  const roster = (skills ?? []).map((s) => s?.name).filter(Boolean);
  const errors = [];
  for (const s of skills ?? []) errors.push(...validateSkillTemplate(s, { roster }));
  return { errors, ok: errors.length === 0 };
}

export function validateConfig(config, { knownRuntimes = [] } = {}) {
  const errors = [];
  const warnings = [];

  // --- Name ---
  if (typeof config.name !== "string")
    errors.push(`The config "name" must be a string — the harness cannot be identified.`);
  else if (!config.name.trim())
    errors.push(`The config has no "name" — the harness cannot be identified.`);

  // --- Problem statement ---
  if (config.problem !== undefined && typeof config.problem !== "string")
    errors.push(`The config "problem" must be a string.`);
  else if (!config.problem || !String(config.problem).trim())
    warnings.push(
      `No "problem" statement — the AI will know the rules, but not why they exist.`
    );

  // --- Rules: quality ---
  if (!Array.isArray(config.rules) || config.rules.length === 0) {
    errors.push(`No rules — a harness without rules has no guardrails.`);
  } else {
    const seen = new Map();
    config.rules.forEach((rule, i) => {
      const label = `rule #${i + 1}`;
      if (typeof rule !== "string" || !rule.trim()) {
        errors.push(`Rule #${i + 1} is empty — remove it or write it.`);
        return;
      }
      const key = rule.trim().toLowerCase();
      if (seen.has(key))
        errors.push(`Rule #${i + 1} duplicates rule #${seen.get(key) + 1}.`);
      else seen.set(key, i);
      if (rule.length > 300)
        warnings.push(`Rule #${i + 1} is very long (${rule.length} chars) — consider splitting it.`);
      scanSecrets(label, rule, errors);
    });
  }

  // --- Skills: duplicates, entry types, name allowlist ---
  if (Array.isArray(config.skills)) {
    const seen = new Set();
    for (const s of config.skills) {
      if (typeof s !== "string") {
        errors.push(`Skill entry ${JSON.stringify(s)} is not a string — skills must be strings.`);
        continue;
      }
      if (!isValidName(s)) {
        errors.push(`Skill name "${s}" is not valid — names must match /^[A-Za-z0-9][A-Za-z0-9_-]*$/ (no "/", "\\", or "..").`);
        continue;
      }
      if (seen.has(s)) errors.push(`Skill "${s}" appears twice in the config.`);
      seen.add(s);
    }
  }

  // --- Runtimes: duplicates, entry types, unknown ---
  if (Array.isArray(config.runtimes)) {
    const seen = new Set();
    for (const r of config.runtimes) {
      if (typeof r !== "string") {
        errors.push(`Runtime entry ${JSON.stringify(r)} is not a string — runtimes must be strings.`);
        continue;
      }
      if (seen.has(r)) errors.push(`Runtime "${r}" appears twice in the config.`);
      seen.add(r);
      if (knownRuntimes.length && !knownRuntimes.includes(r))
        warnings.push(`Runtime "${r}" has no adapter — sync will skip it.`);
    }
  }

  // --- Version: type + drift vs the installed tool version ---
  if (
    config.version !== undefined &&
    typeof config.version !== "number" &&
    typeof config.version !== "string"
  ) {
    errors.push(`The config "version" must be a number or a string.`);
  } else if (config.version !== undefined) {
    const packageVersion = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
    if (String(config.version) !== String(packageVersion))
      warnings.push(
        `Config version "${config.version}" differs from the installed tool version "${packageVersion}" — the config may be stale.`
      );
  }

  // --- Secrets in other fields ---
  scanSecrets("name", config.name, errors);
  scanSecrets("problem", config.problem, errors);

  return { errors, warnings, ok: errors.length === 0 };
}
