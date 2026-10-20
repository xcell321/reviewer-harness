// lib/sync.js — ANG SYNC ENGINE (ang kasing-kasing sa Lesson 2).
//
// Trabaho niini: kuhaa ang master spec, i-render pinaagi sa matag adapter,
// unya isulat sa target project nga LUWAS:
//
//   1. DRY-RUN — preview lang, walay isulat (tan-awa ang diff sa dili pa mo-commit)
//   2. BACKUP   — sa dili pa i-overwrite ang existing file, himo og .bak copy
//   3. SKIP     — kung walay na-usab, ayaw hilabti (idempotent)
//
// Kini ang unang guardrail sa imong harness: ang harness mismo dili
// makaguba sa imong files — parehong proteksyon nga gusto nimo
// ihatag batok sa AI nga maguba sa imong code.

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

  // LESSON 3 GATE: ang sync dili mopadayon kung bungi o delikado ang
  // spec — labaw na kung naay secret nga ma-leak sa instruction files.
  const { errors } = validateConfig(config, { knownRuntimes: supportedRuntimes });
  if (errors.length) {
    throw new Error(
      `Dili mo-sync — naay ${errors.length} ka problema ang config:\n` +
        errors.map((e) => `  ✗ ${e}`).join("\n") +
        `\nDagana ang "validate" para sa tibuok report.`
    );
  }

  // LESSON 4: i-attach ang enabled skills — ang adapters mo-render niini.
  config.skillSections = loadSkillSections(targetDir, config);

  const results = [];

  for (const name of config.runtimes) {
    const adapter = adapters[name];

    // Kung walay adapter para sa runtime, ayaw pag-crash — i-report lang.
    if (!adapter) {
      results.push({ runtime: name, skipped: `walay adapter para sa "${name}"` });
      continue;
    }

    const rel = adapter.targetFile();
    const abs = join(targetDir, rel);
    const content = adapter.renderInstructions(config);

    // DRY-RUN: basa lang, ayaw suwat. Para sa "tan-aw sa dili pa mosugot".
    if (dryRun) {
      const existing = existsSync(abs) ? readFileSync(abs, "utf8") : null;
      results.push({ runtime: name, file: rel, dryRun: true, changed: existing !== content });
      continue;
    }

    mkdirSync(dirname(abs), { recursive: true });

    if (existsSync(abs)) {
      const old = readFileSync(abs, "utf8");
      // Walay na-usab? Ayaw hilabti — idempotent ang sync.
      if (old === content) {
        results.push({ runtime: name, file: rel, unchanged: true });
        continue;
      }
      // Naay ma-overwrite? BACKUP una — kini ang proteksyon batok sa pagkaguba.
      copyFileSync(abs, abs + ".bak");
      writeFileSync(abs, content);
      results.push({ runtime: name, file: rel, written: true, backup: true });
    } else {
      writeFileSync(abs, content);
      results.push({ runtime: name, file: rel, written: true, backup: false });
    }

    // Siguraduhon nga ang sulat nahuman gyud (basaha pag-usab).
    if (!dryRun && readFileSync(abs, "utf8") !== content) {
      throw new Error(`Napakyas pagsulat sa ${abs}`);
    }
  }

  return results;
}
