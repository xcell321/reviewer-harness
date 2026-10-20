// lib/config.js — nagbasa ug nag-validate sa master spec.
//
// Ang master spec (harness.config.json) mao ang "usa ka kamatuoran":
// dinhi ra ka mag-define sa imong rules, unya ang harness na'y
// bahala mo-sync niini ngadto sa matag AI runtime.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadConfig(dir = ROOT) {
  const path = join(dir, "harness.config.json");
  if (!existsSync(path)) {
    throw new Error(
      `Wala nakit-an ang config file: ${path}\nPagdagan og "init" para maghimo og bag-o, o i-check ang --target directory.`
    );
  }

  let config;
  try {
    config = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`Dili ma-parse ang config (invalid JSON): ${path}`);
  }

  // Gamay nga validation — ang harness dili modawat og bungi nga spec.
  if (!config.name) throw new Error('Ang config kinahanglan naay "name".');
  if (!Array.isArray(config.rules))
    throw new Error('Ang config kinahanglan naay "rules" nga array.');
  if (!Array.isArray(config.runtimes)) config.runtimes = [];
  if (!Array.isArray(config.skills)) config.skills = [];

  return config;
}
