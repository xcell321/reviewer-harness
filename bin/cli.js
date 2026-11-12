#!/usr/bin/env node
// reviewer-harness — CLI: sync engine, guardrail validation, local memory,
// skills, sub-agents, and slash commands.
// Commands: status | sync | init | validate | memory | skills | agents | commands | global

import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadConfig } from "../lib/config.js";
import { adapters, supportedRuntimes } from "../lib/adapters/index.js";
import { sync, writeSafe } from "../lib/sync.js";
import { initProject, initFull } from "../lib/init.js";
import { initMemory, buildIndex, readNotes, memoryDir } from "../lib/memory.js";
import { validateConfig } from "../lib/validate.js";
import { listBundledSkills, addSkill, removeSkill, loadBundledSkills, skillCommandContent, skillBundleContent } from "../lib/skills.js";
import { listBundledAgents, addAgent } from "../lib/agents.js";
import { listBundledCommands, addCommand } from "../lib/commands.js";

// F-B1 (full fix): the top-level parse sits outside main().catch, so
// an unknown flag used to crash with a raw Node stack trace. Catch it
// here: clean one-line error + help on stderr, exit 1. helpText() is a
// hoisted function declaration, so it is callable this early.
let values;
let positionals;
try {
  ({ values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      minimal: { type: "boolean", default: false },
      goal: { type: "string" },
      target: { type: "string", default: process.cwd() },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
    },
  }));
} catch (err) {
  console.error(`Error: ${err.message}`);
  console.error(helpText());
  process.exit(1);
}
const [command, sub, arg] = positionals;
const targetDir = values.target;
const dryRun = values["dry-run"];

// devops-basics rule 4: handle SIGTERM/SIGINT gracefully — finish the
// current write, then exit cleanly. Node runs a synchronous write to
// completion before a signal handler executes, and writeSafe is atomic
// (temp file + rename), so exiting here can never leave a half-written
// file behind.
let shuttingDown = false;
function handleShutdownSignal(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`\nReceived ${signal} — finishing the current write, then exiting.`);
  process.exit(0);
}
process.on("SIGTERM", () => handleShutdownSignal("SIGTERM"));
process.on("SIGINT", () => handleShutdownSignal("SIGINT"));

function helpText() {
  return `reviewer-harness — your own AI harness

Usage (run inside your project):
  reviewer-harness init [--goal <text>]     Set up EVERYTHING in this project in one command: detect the stack + goal, create the config, install all skills, agents and commands, start the memory, and sync every runtime (--minimal = config only, the old behavior; --dry-run = preview)
  reviewer-harness validate                 Check the config: quality + secret scanning
  reviewer-harness sync [--dry-run]         Sync the rules to every runtime (--dry-run = preview only)
  reviewer-harness status                   Show the config + target files

  reviewer-harness skills list              List bundled skills (+ which are enabled)
  reviewer-harness skills add <name>        Install + enable a skill in the project
  reviewer-harness skills remove <name>     Disable + remove a skill
  reviewer-harness agents list              List bundled sub-agents
  reviewer-harness agents add <name>        Install a sub-agent (OpenCode + Claude)
  reviewer-harness commands list            List bundled slash commands
  reviewer-harness commands add <name>      Install a slash command (OpenCode + Claude)

  reviewer-harness global [--dry-run]       Install EVERY bundled skill for ALL projects (OpenCode + Claude "/" menus; Freebuff, Copilot CLI, Antigravity, Qoder skill bundles)

  reviewer-harness memory init              Start the local memory (memory/ folder)
  reviewer-harness memory index             Rebuild the memory INDEX.md + graph.json
  reviewer-harness memory list              List memory notes + their links

Every command accepts --target <dir> (default: the current directory).
`;
}

function help() {
  console.log(helpText());
}

function packageVersion() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

function cmdStatus() {
  const config = loadConfig(targetDir);
  console.log(`Harness : ${config.name} v${config.version}`);
  console.log(`Target  : ${targetDir}`);
  console.log(`Runtimes:`);
  if (!config.runtimes?.length) console.log(`  (none)`);
  for (const name of config.runtimes) {
    const adapter = adapters[name];
    const target = !adapter ? "(no adapter!)"
      : typeof adapter.targetFile === "function" ? adapter.targetFile()
      : typeof adapter.skillBundleDir === "function" ? `${adapter.skillBundleDir()}/<skill>/SKILL.md`
      : "(unknown)";
    console.log(`  - ${name} → ${target}`);
  }
  console.log(`Skills  : ${config.skills?.length ? config.skills.join(", ") : "(none)"}`);
}

function cmdSync() {
  const config = loadConfig(targetDir);
  const results = sync({ targetDir, dryRun });
  if (dryRun) console.log("(dry-run: nothing was written)\n");
  if (!config.runtimes?.length && !config.skills?.length) {
    console.log(`Nothing to sync — no runtimes and no skills are enabled.`);
    console.log(`Run "skills add <name>" or add a runtime to the config to enable something.`);
  }
  for (const r of results) {
    if (r.skillCommands) {
      const written = r.skillCommands.filter((f) => f.written).length;
      const pending = r.skillCommands.filter((f) => f.dryRun && f.changed).length;
      const unchanged = r.skillCommands.filter((f) => f.unchanged || (f.dryRun && !f.changed)).length;
      if (dryRun) {
        console.log(`- skill commands: ${pending} would be written/updated, ${unchanged} unchanged (they appear in the "/" menu of OpenCode and Claude)`);
      } else {
        console.log(`- skill commands: ${written} written ✓, ${unchanged} unchanged (one per skill, in the "/" menu of OpenCode and Claude)`);
      }
    } else if (r.skipped) {
      console.log(`- ${r.runtime}: SKIP — ${r.skipped}`);
    } else if (r.skillBundles) {
      const files = r.skillBundles;
      const written = files.filter((f) => f.written).length;
      const pending = files.filter((f) => f.dryRun && f.changed).length;
      const unchanged = files.filter((f) => f.unchanged || (f.dryRun && !f.changed)).length;
      const where = `${r.bundleDir}/<skill>/SKILL.md`;
      if (dryRun) {
        console.log(`- ${r.runtime} → ${where}: ${pending} would be written/updated, ${unchanged} unchanged (Agent Skills bundles)`);
      } else {
        console.log(`- ${r.runtime} → ${where}: ${written} written ✓, ${unchanged} unchanged`);
      }
    } else if (r.dryRun) {
      console.log(`- ${r.runtime} → ${r.file}: ${r.changed ? "WOULD WRITE (changes pending)" : "no changes"}`);
    } else if (r.unchanged) {
      console.log(`- ${r.runtime} → ${r.file}: no changes, skipped ✓`);
    } else {
      console.log(`- ${r.runtime} → ${r.file}: WRITTEN ✓${r.backup ? " (.bak backup made)" : ""}`);
    }
  }
  // If the project has a local memory, refresh its index as part of
  // sync — so the graph the AI reads is always current. The index is
  // a secondary artifact, so its failure is a warning, not a failed
  // sync (system-design failure isolation): the sync already succeeded.
  if (!dryRun && existsSync(memoryDir(targetDir))) {
    try {
      const stats = buildIndex(targetDir);
      console.log(`- memory: index refreshed (${stats.notes} notes, ${stats.edges} links) ✓`);
    } catch (err) {
      console.error(
        `Warning: memory index could not be updated — ${err.message} (sync itself succeeded; run "memory index" to retry.)`
      );
    }
  }
}

function cmdMemory() {
  if (sub === "init") {
    const r = initMemory(targetDir);
    console.log(
      r.created.length
        ? `Local memory created: ${r.dir} (${r.created.join(", ")})`
        : `Local memory already exists: ${r.dir} (nothing overwritten)`
    );
    console.log(`Index: ${r.notes} notes, ${r.edges} links. Open the folder in Obsidian for the graph view.`);
  } else if (sub === "index") {
    if (!existsSync(memoryDir(targetDir)))
      throw new Error(`No memory/ in ${targetDir} — run "memory init" first.`);
    const stats = buildIndex(targetDir);
    console.log(`Index rebuilt: ${stats.notes} notes, ${stats.edges} links, ${stats.dangling} dangling links.`);
  } else if (sub === "list") {
    const notes = readNotes(targetDir);
    if (!notes.length) {
      console.log(`No memory notes in ${join(targetDir, "memory")} — run "memory init" first.`);
      return;
    }
    for (const n of notes) {
      console.log(`- [[${n.id}]] ${n.title}${n.links.length ? ` → ${n.links.join(", ")}` : ""}`);
    }
  } else {
    console.error(`Usage: memory <init|index|list> [--target <dir>]`);
    process.exitCode = 1;
  }
}

function printDetection(d) {
  const stack = [d.stack?.language, d.stack?.framework].filter(Boolean).join(" · ");
  console.log(`Project: ${d.name}${stack ? ` — ${stack}` : ""}`);
  if (d.goal) console.log(`Goal   : ${d.goal}`);
}

function cmdInit() {
  // --minimal keeps the original behavior: the config file, nothing else.
  if (values.minimal) {
    const { created, file } = initProject(targetDir);
    console.log(created ? `Config created: ${file}` : `Already exists: ${file} (not overwritten)`);
    return;
  }
  const goal = values.goal ?? null;
  if (dryRun) {
    const r = initFull(targetDir, { dryRun: true, goal });
    console.log(`(dry-run: nothing was written)\n`);
    printDetection(r.detection);
    console.log(`Config : ${r.configExists ? "exists — would be kept (refresh)" : "would be created"}`);
    console.log(`Would install: ${r.planned.skills} skills, ${r.planned.agents} agents, ${r.planned.commands} commands`);
    console.log(`Would start the local memory (if missing) and sync every runtime.`);
    return;
  }
  const r = initFull(targetDir, { goal });
  printDetection(r.detection);
  console.log(`Config : ${r.config.created ? `created → ${r.config.file}` : "already exists — kept, installs refreshed"}`);
  console.log(`Skills : ${r.skills.installed} installed + enabled ✓`);
  console.log(`Agents : ${r.agents.installed} installed (${r.agents.files} runtime files) ✓`);
  console.log(`Commands: ${r.commands.installed} installed (${r.commands.files} runtime files) ✓`);
  console.log(`Memory : ${r.memory.created.length ? `created (${r.memory.created.join(", ")})` : "already exists"} — ${r.memory.notes} notes indexed ✓`);
  console.log(`Sync   : ${r.sync.written} files written across ${r.sync.runtimes} runtime targets ✓`);
  console.log(`\nDone — everything is installed. Open any runtime in this project and the harness is live.`);
}

function cmdValidate() {
  const config = loadConfig(targetDir);
  const { errors, warnings, ok } = validateConfig(config, {
    knownRuntimes: supportedRuntimes,
  });
  for (const e of errors) console.log(`✗ ${e}`);
  for (const w of warnings) console.log(`⚠ ${w}`);
  if (ok && !warnings.length) console.log(`✓ Config is clean — no problems, no secrets.`);
  else if (ok) console.log(`✓ No errors (${warnings.length} warning(s)).`);
  else {
    console.log(`\n✗ ${errors.length} error(s) — fix them before syncing.`);
    process.exitCode = 1;
  }
}

function cmdSkills() {
  if (sub === "list") {
    let enabled = [];
    try {
      enabled = loadConfig(targetDir).skills ?? [];
    } catch {
      /* no config in the target — just list the bundled skills */
    }
    // Grouped by category (the store's organization, v1.17.1); a
    // skill without a category (flat in the store) lists last. The
    // category rides on the full loadBundledSkills() objects.
    const byCategory = [...loadBundledSkills()].sort((a, b) =>
      (a.category ?? "￿").localeCompare(b.category ?? "￿") || a.name.localeCompare(b.name)
    );
    let lastCategory;
    for (const s of byCategory) {
      const category = s.category ?? "uncategorized";
      if (category !== lastCategory) {
        console.log(`\n${category}:`);
        lastCategory = category;
      }
      console.log(`- ${s.name}${enabled.includes(s.name) ? " ✓ enabled" : ""} — ${s.description}`);
    }
  } else if (sub === "add" && arg) {
    const r = addSkill(arg, targetDir);
    if (r.noConfig) {
      console.log(
        `Skill "${arg}" copied → ${r.file}\n` +
          `(No harness.config.json here, so it is not enabled in a harness — it is yours as a standalone playbook.\n` +
          `Run "init" in this project if you want the full harness to sync it to every runtime.)`
      );
    } else {
      console.log(
        r.alreadyEnabled
          ? `Skill "${arg}" is already enabled (file refreshed). Run "sync" to apply.`
          : `Skill "${arg}" installed → ${r.file}\nEnabled in the config. Run "sync" to apply it to the runtimes.`
      );
    }
  } else if (sub === "remove" && arg) {
    const r = removeSkill(arg, targetDir);
    console.log(
      r.wasEnabled
        ? `Skill "${arg}" disabled${r.removedFile ? " and its file removed" : ""}. Run "sync" to update the runtimes.`
        : `Skill "${arg}" was not enabled.`
    );
  } else {
    console.error(`Usage: skills <list|add <name>|remove <name>> [--target <dir>]`);
    process.exitCode = 1;
  }
}

function cmdAgents() {
  if (sub === "list") {
    for (const a of listBundledAgents()) console.log(`- ${a.name} — ${a.description}`);
  } else if (sub === "add" && arg) {
    const r = addAgent(arg, targetDir);
    console.log(`Agent "${arg}" installed:`);
    for (const f of r.written) console.log(`  → ${f}`);
  } else {
    console.error(`Usage: agents <list|add <name>> [--target <dir>]`);
    process.exitCode = 1;
  }
}

function cmdCommands() {
  if (sub === "list") {
    for (const c of listBundledCommands()) console.log(`- /${c.name} — ${c.description}`);
  } else if (sub === "add" && arg) {
    const r = addCommand(arg, targetDir);
    console.log(`Command "/${arg}" installed:`);
    for (const f of r.written) console.log(`  → ${f}`);
  } else {
    console.error(`Usage: commands <list|add <name>> [--target <dir>]`);
    process.exitCode = 1;
  }
}

function cmdGlobal() {
  const skills = loadBundledSkills();
  const targets = [
    { runtime: "OpenCode", dir: join(homedir(), ".config", "opencode", "commands") },
    { runtime: "Claude", dir: join(homedir(), ".claude", "commands") },
    // Skill-bundle runtimes (Agent Skills open standard: <skill>/SKILL.md)
    { runtime: "Freebuff", dir: join(homedir(), ".agents", "skills"), bundle: true },
    { runtime: "Copilot CLI", dir: join(homedir(), ".copilot", "skills"), bundle: true },
    { runtime: "Antigravity", dir: join(homedir(), ".gemini", "config", "skills"), bundle: true },
    { runtime: "Qoder", dir: join(homedir(), ".qoder", "skills"), bundle: true },
  ];
  if (dryRun) console.log("(dry-run: nothing was written)\n");
  for (const { runtime, dir, bundle } of targets) {
    let written = 0, unchanged = 0, pending = 0;
    for (const skill of skills) {
      const rel = bundle ? join(skill.name, "SKILL.md") : `${skill.name}.md`;
      const content = bundle
        ? skillBundleContent(skill, skills)
        : skillCommandContent(skill, skills);
      const outcome = writeSafe(join(dir, rel), content, dryRun);
      if (outcome.written) written++;
      else if (outcome.dryRun && outcome.changed) pending++;
      else unchanged++;
    }
    const where = bundle ? `${dir} (<skill>/SKILL.md)` : dir;
    if (dryRun) console.log(`- ${runtime} (global): ${pending} would be written/updated, ${unchanged} unchanged → ${where}`);
    else console.log(`- ${runtime} (global): ${written} written ✓, ${unchanged} unchanged → ${where}`);
  }
  if (dryRun) {
    console.log(`Dry run complete — nothing was written. Run without --dry-run to install.`);
  } else {
    console.log(
      `\nDone: ${skills.map((s) => "/" + s.name).join(", ")} are now available in EVERY project.` +
        `\n(OpenCode + Claude: "/" menu commands. Freebuff, Copilot CLI, Antigravity, Qoder: Agent Skills bundles.)` +
        `\n(Per-project rules still come from "sync" inside a project.)`
    );
  }
}

async function main() {
  if (values.help) help();
  else if (values.version) console.log(`reviewer-harness ${packageVersion()}`);
  else if (!command || command === "status") cmdStatus();
  else if (command === "sync") cmdSync();
  else if (command === "init") cmdInit();
  else if (command === "validate") cmdValidate();
  else if (command === "memory") cmdMemory();
  else if (command === "skills") cmdSkills();
  else if (command === "agents") cmdAgents();
  else if (command === "commands") cmdCommands();
  else if (command === "global") cmdGlobal();
  else if (command === "help") help();
  else {
    console.error(`Unknown command "${command}".`);
    console.error(helpText());
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (values.verbose) console.error(err.stack);
  process.exit(1);
});
