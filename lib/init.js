// lib/init.js — the `init` command: start the harness in a new project.
//
// Creates harness.config.json from the template if none exists yet.
// Never overwrites an existing config — safe by default.

import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectProject } from "./detect.js";
import { listBundledSkills, addSkill } from "./skills.js";
import { listBundledAgents, addAgent } from "./agents.js";
import { listBundledCommands, addCommand } from "./commands.js";
import { initMemory } from "./memory.js";
import { sync } from "./sync.js";

const TOOL_VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const TEMPLATE = {
  name: "reviewer-harness",
  version: TOOL_VERSION,
  problem:
    "The problem — an AI with no guardrails: it sometimes breaks existing code it was never asked to touch, and hallucinates — inventing functions, libraries, or output that do not actually exist. These rules are the guardrails against that.",
  runtimes: ["opencode", "claude", "gemini", "cline", "freebuff", "copilot", "antigravity", "qoder"],
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

// --- init v2 (v1.17): one command, everything installed, adapted ---
//
// Modeled on GitHub Spec Kit's `specify init` (github.com/github/spec-kit,
// MIT): detect the project, scaffold the config, install everything,
// and sync — in a single run, instead of init + skills add ×N +
// agents add + commands add + memory init + sync. BMAD-METHOD's
// installer contributes the second half of the contract: running
// init AGAIN over an existing setup is a refresh/repair — the
// existing config is kept exactly as the user left it.

// Rewrite a config init JUST created with what detection learned:
// the project's name, goal, stack, and its real validation commands
// (so the "run the tests/lint" rule names `npm test`, not a generic
// instruction). Never called on a pre-existing config — that file
// belongs to the user.
function adaptConfig(file, detection) {
  const config = JSON.parse(readFileSync(file, "utf8"));
  if (detection.name) config.name = detection.name;
  if (detection.goal) config.goal = detection.goal;
  if (detection.stack?.language) config.stack = detection.stack;
  const cmds = Object.entries(detection.validation ?? {});
  if (cmds.length) {
    config.validation = detection.validation;
    const list = cmds.map(([kind, cmd]) => `\`${cmd}\` (${kind})`).join(", ");
    config.rules = config.rules.map((rule) =>
      rule.startsWith("After coding, run the tests/lint")
        ? `After coding, run the project's validation before saying the task is done: ${list}.`
        : rule
    );
  }
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
}

// Count the files a sync run actually wrote, from its own results —
// the receipt reports what happened, not what was planned.
function countSyncWritten(results) {
  let written = 0;
  for (const r of results) {
    if (r.written) written++;
    if (r.skillCommands) written += r.skillCommands.filter((f) => f.written).length;
    if (r.skillBundles) written += r.skillBundles.filter((f) => f.written).length;
  }
  return written;
}

// The full setup. Returns a structured summary the CLI prints as the
// receipt. With dryRun, returns the detection + planned counts and
// writes nothing.
export function initFull(targetDir, { dryRun = false, goal = null } = {}) {
  const detection = detectProject(targetDir);
  if (goal) detection.goal = goal;
  const bundledSkills = listBundledSkills();
  const bundledAgents = listBundledAgents();
  const bundledCommands = listBundledCommands();
  const configExists = existsSync(join(targetDir, "harness.config.json"));

  if (dryRun) {
    return {
      dryRun: true,
      detection,
      configExists,
      planned: {
        skills: bundledSkills.length,
        agents: bundledAgents.length,
        commands: bundledCommands.length,
      },
    };
  }

  // Config first — addSkill enables skills in it, so it must exist
  // before any skill is installed. A fresh config is adapted to the
  // detection; an existing one is kept untouched.
  const { created, file } = initProject(targetDir);
  if (created) adaptConfig(file, detection);

  // Every bundled skill, installed + enabled (the same code path as
  // `skills add`, once per skill — no second install machinery).
  let skillsInstalled = 0;
  for (const skill of bundledSkills) {
    addSkill(skill.name, targetDir);
    skillsInstalled++;
  }

  let agentFiles = 0;
  for (const agent of bundledAgents) {
    agentFiles += addAgent(agent.name, targetDir).written.length;
  }

  let commandFiles = 0;
  for (const command of bundledCommands) {
    commandFiles += addCommand(command.name, targetDir).written.length;
  }

  // Local memory, seeded with the detected truth (name, goal, stack,
  // validation commands) instead of blank placeholders.
  const memory = initMemory(targetDir, {
    name: detection.name,
    goal: detection.goal,
    stack: detection.stack,
    validation: detection.validation,
  });

  // Sync every runtime — the same gate-kept sync as the `sync`
  // command (it validates the config and refuses on secrets).
  const results = sync({ targetDir });

  return {
    detection,
    config: { created, file },
    skills: { installed: skillsInstalled },
    agents: { installed: bundledAgents.length, files: agentFiles },
    commands: { installed: bundledCommands.length, files: commandFiles },
    memory: { created: memory.created, notes: memory.notes },
    sync: { written: countSyncWritten(results), runtimes: results.length },
  };
}
