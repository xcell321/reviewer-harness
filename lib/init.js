// lib/init.js — the `init` command: start the harness in a new project.
//
// Creates harness.config.json from the template if none exists yet.
// Never overwrites an existing config — safe by default.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectProject } from "./detect.js";
import { writeSafe } from "./write-safe.js";
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
  writeSafe(dest, JSON.stringify(TEMPLATE, null, 2) + "\n");
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

// W-14 (defence in depth, init half): a validation command is
// interpolated verbatim into the rules written for every AI runtime,
// so only a plain command shape may pass — letters, digits, spaces
// and . _ - / @ (e.g. `npm test`, `npm run lint`, `go test ./...`).
// Anything carrying shell metacharacters (`;`, `&`, `|`, `$`, "`",
// quotes, newlines, …) is dropped, never laundered into an
// instruction. detect.js sanitizes the packageManager at the source;
// this guards any other path that reaches adaptConfig.
const SAFE_VALIDATION_COMMAND = /^[A-Za-z0-9 ._\/@-]+$/;
const SAFE_PACKAGE_MANAGER_NAME = /^[A-Za-z0-9._-]+$/;

function isSafeValidationCommand(cmd) {
  return typeof cmd === "string" && SAFE_VALIDATION_COMMAND.test(cmd);
}

// Rewrite a config init JUST created with what detection learned:
// the project's name, goal, stack, and its real validation commands
// (so the "run the tests/lint" rule names `npm test`, not a generic
// instruction). Never called on a pre-existing config — that file
// belongs to the user.
function adaptConfig(file, detection) {
  const config = JSON.parse(readFileSync(file, "utf8"));
  if (detection.name) config.name = detection.name;
  if (detection.goal) config.goal = detection.goal;
  if (detection.stack?.language) {
    const stack = { ...detection.stack };
    if (
      stack.packageManager != null &&
      !SAFE_PACKAGE_MANAGER_NAME.test(String(stack.packageManager))
    ) {
      stack.packageManager = null;
    }
    config.stack = stack;
  }
  const cmds = Object.entries(detection.validation ?? {}).filter(([, cmd]) =>
    isSafeValidationCommand(cmd)
  );
  if (cmds.length) {
    config.validation = Object.fromEntries(cmds);
    const list = cmds.map(([kind, cmd]) => `\`${cmd}\` (${kind})`).join(", ");
    config.rules = config.rules.map((rule) =>
      rule.startsWith("After coding, run the tests/lint")
        ? `After coding, run the project's validation before saying the task is done: ${list}.`
        : rule
    );
  }
  writeSafe(file, JSON.stringify(config, null, 2) + "\n");
}

const GITIGNORE_PATTERNS = ["*.bak.*", ".reviewer-harness/graph/"];

// W-4b (init half): sync's backups (*.bak, *.bak.1, *.bak.2) and the
// graph artifacts would otherwise leak into the user's git. If the
// project already has a .gitignore, append only the missing patterns
// under a `# reviewer-harness` comment (never duplicating a pattern
// or the comment), through writeSafe. If there is no .gitignore,
// create nothing — the receipt suggests the patterns instead.
function ensureGitignoreGuidance(targetDir) {
  const file = join(targetDir, ".gitignore");
  if (!existsSync(file)) {
    return {
      exists: false,
      updated: false,
      added: [],
      suggested: [...GITIGNORE_PATTERNS],
      suggestion: `Add to .gitignore: ${GITIGNORE_PATTERNS.join(", ")}`,
    };
  }
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const missing = GITIGNORE_PATTERNS.filter((pattern) => !lines.includes(pattern));
  if (!missing.length) {
    return { exists: true, updated: false, added: [], suggested: [], suggestion: null };
  }
  let suffix = "";
  if (content.length && !content.endsWith("\n")) suffix += "\n";
  if (!lines.includes("# reviewer-harness")) suffix += "# reviewer-harness\n";
  suffix += missing.map((pattern) => `${pattern}\n`).join("");
  writeSafe(file, content + suffix);
  return { exists: true, updated: true, added: missing, suggested: [], suggestion: null };
}

// The skill set of an existing config, or null when it cannot be
// read — a null set on a refresh falls back to no filtering only
// when there is no config to honour; a present-but-unreadable config
// surfaces the same parse error addSkill would have raised anyway.
function readExistingSkillSet(file) {
  if (!existsSync(file)) return null;
  const config = JSON.parse(readFileSync(file, "utf8"));
  return new Set(Array.isArray(config.skills) ? config.skills : []);
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
    // On a refresh the plan honours the existing config (B-5): only
    // the skills it still enables would be re-installed.
    let plannedSkills = bundledSkills.length;
    let plannedNotInstalled = [];
    if (configExists) {
      const existing = readExistingSkillSet(join(targetDir, "harness.config.json"));
      if (existing) {
        plannedSkills = bundledSkills.filter((s) => existing.has(s.name)).length;
        plannedNotInstalled = bundledSkills
          .filter((s) => !existing.has(s.name))
          .map((s) => s.name);
      }
    }
    return {
      dryRun: true,
      detection,
      configExists,
      planned: {
        skills: plannedSkills,
        agents: bundledAgents.length,
        commands: bundledCommands.length,
      },
      skills: {
        installed: 0,
        notInstalled: plannedNotInstalled,
        availableButNotInstalled: plannedNotInstalled,
        keptAsIs: configExists,
      },
    };
  }

  // Config first — addSkill enables skills in it, so it must exist
  // before any skill is installed. A fresh config is adapted to the
  // detection; an existing one is kept untouched.
  const { created, file } = initProject(targetDir);
  if (created) adaptConfig(file, detection);
  const keptAsIs = !created;

  // B-5: first init installs every bundled skill. A refresh (existing
  // config) must keep that config exactly as the user left it — a
  // skill absent from its skill set was removed (or predates the
  // config) and stays absent: addSkill is NOT called for it, since
  // addSkill re-enables in the config. Bundled skills not installed
  // on a refresh are named in the receipt as available but not
  // installed. Enabled skills are still refreshed via addSkill,
  // which is a no-op for their config entry (already enabled).
  let skillsInstalled = 0;
  const notInstalledSkills = [];
  const existingSkillSet = keptAsIs ? readExistingSkillSet(file) : null;
  for (const skill of bundledSkills) {
    if (keptAsIs && existingSkillSet && !existingSkillSet.has(skill.name)) {
      notInstalledSkills.push(skill.name);
      continue;
    }
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

  // W-4b: .gitignore guidance for the harness's own backup / graph
  // files (append the missing patterns, or suggest them in the
  // receipt when the project has no .gitignore).
  const gitignore = ensureGitignoreGuidance(targetDir);

  // Sync every runtime — the same gate-kept sync as the `sync`
  // command (it validates the config and refuses on secrets).
  const results = sync({ targetDir });

  return {
    detection,
    config: { created, file, keptAsIs },
    skills: {
      installed: skillsInstalled,
      keptAsIs,
      // Skills kept exactly as the user left the config: on a refresh
      // these bundled skills were NOT installed (removed, or the
      // config predates them) — available but not installed.
      notInstalled: notInstalledSkills,
      availableButNotInstalled: notInstalledSkills,
      skipped: notInstalledSkills,
    },
    agents: { installed: bundledAgents.length, files: agentFiles },
    commands: { installed: bundledCommands.length, files: commandFiles },
    memory: { created: memory.created, notes: memory.notes },
    gitignore,
    sync: { written: countSyncWritten(results), runtimes: results.length },
  };
}
