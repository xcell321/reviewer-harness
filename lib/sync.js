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
import { loadSkillSections } from "./skills.js";

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

  // LESSON 4: attach the enabled skills — the adapters render them.
  config.skillSections = loadSkillSections(targetDir, config);

  const results = [];

  for (const name of config.runtimes) {
    const adapter = adapters[name];

    // No adapter for this runtime? Don't crash — report it.
    if (!adapter) {
      results.push({ runtime: name, skipped: `no adapter for "${name}"` });
      continue;
    }

    const rel = adapter.targetFile();
    const abs = join(targetDir, rel);
    const content = adapter.renderInstructions(config);

    // DRY-RUN: read only, never write. "Look before you agree."
    if (dryRun) {
      const existing = existsSync(abs) ? readFileSync(abs, "utf8") : null;
      results.push({ runtime: name, file: rel, dryRun: true, changed: existing !== content });
      continue;
    }

    mkdirSync(dirname(abs), { recursive: true });

    if (existsSync(abs)) {
      const old = readFileSync(abs, "utf8");
      // Nothing changed? Touch nothing — sync is idempotent.
      if (old === content) {
        results.push({ runtime: name, file: rel, unchanged: true });
        continue;
      }
      // About to overwrite? BACK UP first — protection against loss.
      copyFileSync(abs, abs + ".bak");
      writeFileSync(abs, content);
      results.push({ runtime: name, file: rel, written: true, backup: true });
    } else {
      writeFileSync(abs, content);
      results.push({ runtime: name, file: rel, written: true, backup: false });
    }

    // Verify the write actually landed (read it back).
    if (!dryRun && readFileSync(abs, "utf8") !== content) {
      throw new Error(`Failed to write ${abs}`);
    }
  }

  return results;
}
