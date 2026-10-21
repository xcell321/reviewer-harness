#!/usr/bin/env node
// reviewer-harness — CLI: sync engine, guardrail validation, local memory,
// skills, sub-agents, and slash commands.
// Commands: status | sync | init | validate | memory | skills | agents | commands | global

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { loadConfig } from "../lib/config.js";
import { adapters, supportedRuntimes } from "../lib/adapters/index.js";
import { sync, writeSafe } from "../lib/sync.js";
import { initProject } from "../lib/init.js";
import { initMemory, buildIndex, readNotes, memoryDir } from "../lib/memory.js";
import { validateConfig } from "../lib/validate.js";
import { listBundledSkills, addSkill, removeSkill, loadBundledSkills, skillCommandContent } from "../lib/skills.js";
import { listBundledAgents, addAgent } from "../lib/agents.js";
import { listBundledCommands, addCommand } from "../lib/commands.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    target: { type: "string", default: process.cwd() },
  },
});
const [command, sub, arg] = positionals;
const targetDir = values.target;
const dryRun = values["dry-run"];

function help() {
  console.log(`reviewer-harness — your own AI harness

Usage (run inside your project):
  reviewer-harness init                     Create harness.config.json (one-time setup)
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

  reviewer-harness global [--dry-run]       Install EVERY bundled skill as a slash command for ALL projects (global OpenCode + Claude "/" menus)

  reviewer-harness memory init              Start the local memory (memory/ folder)
  reviewer-harness memory index             Rebuild the memory INDEX.md + graph.json
  reviewer-harness memory list              List memory notes + their links

Every command accepts --target <dir> (default: the current directory).
`);
}

function cmdStatus() {
  const config = loadConfig(targetDir);
  console.log(`Harness : ${config.name} v${config.version}`);
  console.log(`Target  : ${targetDir}`);
  console.log(`Runtimes:`);
  for (const name of config.runtimes) {
    const adapter = adapters[name];
    console.log(`  - ${name} → ${adapter ? adapter.targetFile() : "(no adapter!)"}`);
  }
  console.log(`Skills  : ${config.skills?.length ? config.skills.join(", ") : "(none)"}`);
}

function cmdSync() {
  const results = sync({ targetDir, dryRun });
  if (dryRun) console.log("(dry-run: nothing was written)\n");
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
    } else if (r.dryRun) {
      console.log(`- ${r.runtime} → ${r.file}: ${r.changed ? "WOULD WRITE (changes pending)" : "no changes"}`);
    } else if (r.unchanged) {
      console.log(`- ${r.runtime} → ${r.file}: no changes, skipped ✓`);
    } else {
      console.log(`- ${r.runtime} → ${r.file}: WRITTEN ✓${r.backup ? " (.bak backup made)" : ""}`);
    }
  }
  // If the project has a local memory, refresh its index as part of
  // sync — so the graph the AI reads is always current.
  if (!dryRun && existsSync(memoryDir(targetDir))) {
    const stats = buildIndex(targetDir);
    console.log(`- memory: index refreshed (${stats.notes} notes, ${stats.edges} links) ✓`);
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
    console.log(`Usage: memory <init|index|list> [--target <dir>]`);
  }
}

function cmdInit() {
  const { created, file } = initProject(targetDir);
  console.log(created ? `Config created: ${file}` : `Already exists: ${file} (not overwritten)`);
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
    for (const s of listBundledSkills()) {
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
    console.log(`Usage: skills <list|add <name>|remove <name>> [--target <dir>]`);
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
    console.log(`Usage: agents <list|add <name>> [--target <dir>]`);
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
    console.log(`Usage: commands <list|add <name>> [--target <dir>]`);
  }
}

function cmdGlobal() {
  const skills = loadBundledSkills();
  const targets = [
    { runtime: "OpenCode", dir: join(homedir(), ".config", "opencode", "commands") },
    { runtime: "Claude", dir: join(homedir(), ".claude", "commands") },
  ];
  if (dryRun) console.log("(dry-run: nothing was written)\n");
  for (const { runtime, dir } of targets) {
    let written = 0, unchanged = 0, pending = 0;
    for (const skill of skills) {
      const outcome = writeSafe(join(dir, `${skill.name}.md`), skillCommandContent(skill), dryRun);
      if (outcome.written) written++;
      else if (outcome.dryRun && outcome.changed) pending++;
      else unchanged++;
    }
    if (dryRun) console.log(`- ${runtime} (global): ${pending} would be written/updated, ${unchanged} unchanged → ${dir}`);
    else console.log(`- ${runtime} (global): ${written} written ✓, ${unchanged} unchanged → ${dir}`);
  }
  console.log(
    `\nDone: ${skills.map((s) => "/" + s.name).join(", ")} are now in the "/" menu of EVERY project.` +
      `\n(Per-project rules still come from "sync" inside a project.)`
  );
}

async function main() {
  if (!command || command === "status") cmdStatus();
  else if (command === "sync") cmdSync();
  else if (command === "init") cmdInit();
  else if (command === "validate") cmdValidate();
  else if (command === "memory") cmdMemory();
  else if (command === "skills") cmdSkills();
  else if (command === "agents") cmdAgents();
  else if (command === "commands") cmdCommands();
  else if (command === "global") cmdGlobal();
  else help();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
