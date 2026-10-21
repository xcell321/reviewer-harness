// lib/sync.js — THE SYNC ENGINE (the heart of Lesson 2).
//
// Its job: take the master spec, render it through each adapter, and
// write it into the target project SAFELY:
//
//   1. VALIDATE — refuse to sync a broken or dangerous spec
//   2. DRY-RUN  — preview only, writes nothing
//   3. BACKUP   — before overwriting an existing file, make a .bak copy
//   4. SKIP     — if nothing changed, touch nothing (idempotent)
//
// Sync also generates one SLASH COMMAND per enabled skill (into the
// OpenCode and Claude commands folders), so every skill appears in
// the runtime's "/" menu and can be invoked on demand.
//
// This is the harness's first guardrail: the harness itself cannot
// destroy your files — the same protection it gives you against an
// AI breaking your code.

import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { loadConfig } from "./config.js";
import { adapters, supportedRuntimes } from "./adapters/index.js";
import { validateConfig } from "./validate.js";
import { loadSkills, skillCommandContent } from "./skills.js";

// Write one file the safe way. Returns what happened:
// dry-run → { dryRun: true, changed } · no change → { unchanged: true }
// changed → { written: true, backup } (with a .bak copy when the
// file already existed). Every real write is verified by reading
// the file back.
function writeSafe(abs, content, dryRun) {
  if (dryRun) {
    const existing = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    return { dryRun: true, changed: existing !== content };
  }
  mkdirSync(dirname(abs), { recursive: true });
  if (existsSync(abs)) {
    const old = readFileSync(abs, "utf8");
    if (old === content) return { unchanged: true };
    copyFileSync(abs, abs + ".bak");
    writeFileSync(abs, content);
    if (readFileSync(abs, "utf8") !== content)
      throw new Error(`Failed to write ${abs}`);
    return { written: true, backup: true };
  }
  writeFileSync(abs, content);
  if (readFileSync(abs, "utf8") !== content)
    throw new Error(`Failed to write ${abs}`);
  return { written: true, backup: false };
}

export function sync({ targetDir, dryRun = false }) {
  const config = loadConfig(targetDir);

  // LESSON 3 GATE: sync refuses to proceed when the spec is broken or
  // dangerous — above all when a secret would leak into the files.
  const { errors } = validateConfig(config, { knownRuntimes: supportedRuntimes });
  if (errors.length) {
    throw new Error(
      `Refusing to sync — the config has ${errors.length} problem(s):\n` +
        errors.map((e) => `  ✗ ${e}`).join("\n") +
        `\nRun "validate" for the full report.`
    );
  }

  // LESSON 4: attach the enabled skills — the adapters render them
  // into the instruction files, and each one also becomes a slash
  // command below.
  const skills = loadSkills(targetDir, config);
  config.skillSections = skills.map((s) => s.body);

  const results = [];

  for (const name of config.runtimes) {
    const adapter = adapters[name];

    // No adapter for this runtime? Don't crash — report it.
    if (!adapter) {
      results.push({ runtime: name, skipped: `no adapter for "${name}"` });
      continue;
    }

    const rel = adapter.targetFile();
    const outcome = writeSafe(join(targetDir, rel), adapter.renderInstructions(config), dryRun);
    results.push({ runtime: name, file: rel, ...outcome });
  }

  // SLASH COMMANDS: one per enabled skill, for the two runtimes whose
  // "/" menu lists command files (OpenCode and Claude).
  if (skills.length) {
    const files = [];
    for (const skill of skills) {
      const content = skillCommandContent(skill);
      for (const dir of [".opencode/commands", ".claude/commands"]) {
        const rel = `${dir}/${skill.name}.md`;
        files.push({ file: rel, ...writeSafe(join(targetDir, rel), content, dryRun) });
      }
    }
    results.push({ skillCommands: files });
  }

  return results;
}
