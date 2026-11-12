// lib/config.js — loads and validates the master spec.
//
// The master spec (harness.config.json) is the single source of truth:
// you define your rules in exactly one place, and the harness syncs
// them to every AI runtime.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadConfig(dir = ROOT) {
  const path = join(dir, "harness.config.json");
  if (!existsSync(path)) {
    throw new Error(
      `Config file not found: ${path}\nRun "init" to create one, or check the --target directory.`
    );
  }

  let config;
  try {
    config = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(
      `Config is not valid JSON: ${path}: ${err.message}\nCheck for a trailing comma or other syntax error.`
    );
  }

  // A valid-JSON file is not necessarily a config: null, an array, or a
  // bare string must fail here with a clear error — never a raw
  // TypeError from the `.name` check below (F-W20, Review Focus #5).
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error(
      `Config must be an object, not ${
        config === null ? "null" : Array.isArray(config) ? "an array" : `a ${typeof config}`
      }.`
    );
  }

  // Light structural validation — the harness rejects a broken spec.
  if (!config.name) throw new Error('The config needs a "name".');
  if (!Array.isArray(config.rules))
    throw new Error('The config needs a "rules" array.');
  if (!Array.isArray(config.runtimes)) config.runtimes = [];
  if (!Array.isArray(config.skills)) config.skills = [];

  return config;
}
