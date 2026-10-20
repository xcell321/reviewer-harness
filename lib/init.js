// lib/init.js — the `init` command: start the harness in a new project.
//
// Creates harness.config.json from the template if none exists yet.
// Never overwrites an existing config — safe by default.

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE = {
  name: "reviewer-harness",
  version: "1.0.0",
  problem:
    "The problem — an AI with no guardrails: it sometimes breaks existing code it was never asked to touch, and hallucinates — inventing functions, libraries, or output that do not actually exist. These rules are the guardrails against that.",
  runtimes: ["opencode", "claude", "gemini", "cline"],
  skills: [],
  rules: [
    "Edit surgically: change only the code the task requires — never rewrite a whole file.",
    "Use only libraries that are already in the project. Never invent package names or APIs.",
    "After coding, run the tests/lint before saying the task is done.",
    "When unsure about existing code, read the surrounding files first before changing anything.",
    "Read memory/INDEX.md before coding — it is the project's local memory (decisions, gotchas, and do-not-touch files). When you learn something new about the project, write it as a note in memory/ with [[links]] to the related notes.",
    "Validate and report every change: after editing any code, run the project's validation (tests, lint, or build), then report every file you changed and show the actual validation output. A change is not done until it has been validated and reported — never finish silently.",
  ],
};

export function initProject(targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const dest = join(targetDir, "harness.config.json");
  if (existsSync(dest)) {
    return { created: false, file: dest };
  }
  writeFileSync(dest, JSON.stringify(TEMPLATE, null, 2) + "\n");
  return { created: true, file: dest };
}
