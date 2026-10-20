#!/usr/bin/env node
// reviewer-harness — CLI: sync engine, guardrail validation, local memory,
// skills, sub-agents, ug slash commands.
// Commands: status | sync | init | validate | memory | skills | agents | commands

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";
import { adapters, supportedRuntimes } from "../lib/adapters/index.js";
import { sync } from "../lib/sync.js";
import { initProject } from "../lib/init.js";
import { initMemory, buildIndex, readNotes, memoryDir } from "../lib/memory.js";
import { validateConfig } from "../lib/validate.js";
import { listBundledSkills, addSkill, removeSkill } from "../lib/skills.js";
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
  console.log(`reviewer-harness — imong kaugalingong AI harness

Usage:
  node bin/cli.js status [--target <dir>]              Ipakita ang config + target files
  node bin/cli.js sync [--dry-run] [--target <dir>]    I-sync ang rules ngadto sa tanang runtimes
  node bin/cli.js init [--target <dir>]                Maghimo og harness.config.json sa project
  node bin/cli.js validate [--target <dir>]            I-check ang config: kalidad + secret scanning
  node bin/cli.js memory init [--target <dir>]         Sugdi ang local memory (memory/ folder)
  node bin/cli.js memory index [--target <dir>]        I-rebuild ang INDEX.md + graph.json sa memory
  node bin/cli.js memory list [--target <dir>]         Ilista ang memory notes + ilang links
  node bin/cli.js skills list [--target <dir>]         Ilista ang bundled skills (+ enabled ba)
  node bin/cli.js skills add <name> [--target <dir>]   I-install ug i-enable ang skill sa project
  node bin/cli.js skills remove <name> [--target <dir>] I-disable ug tangtanga ang skill
  node bin/cli.js agents list                          Ilista ang bundled sub-agents
  node bin/cli.js agents add <name> [--target <dir>]   I-install ang sub-agent (OpenCode + Claude)
  node bin/cli.js commands list                        Ilista ang bundled slash commands
  node bin/cli.js commands add <name> [--target <dir>] I-install ang slash command (OpenCode + Claude)
`);
}

function cmdStatus() {
  const config = loadConfig(targetDir);
  console.log(`Harness : ${config.name} v${config.version}`);
  console.log(`Target  : ${targetDir}`);
  console.log(`Runtimes:`);
  for (const name of config.runtimes) {
    const adapter = adapters[name];
    console.log(`  - ${name} → ${adapter ? adapter.targetFile() : "(walay adapter!)"}`);
  }
  console.log(`Skills  : ${config.skills?.length ? config.skills.join(", ") : "(wala)"}`);
}

function cmdSync() {
  const results = sync({ targetDir, dryRun });
  if (dryRun) console.log("(dry-run: walay gisulat)\n");
  for (const r of results) {
    if (r.skipped) {
      console.log(`- ${r.runtime}: SKIP — ${r.skipped}`);
    } else if (r.dryRun) {
      console.log(`- ${r.runtime} → ${r.file}: ${r.changed ? "WOULD WRITE (naay ma-usab)" : "walay ma-usab"}`);
    } else if (r.unchanged) {
      console.log(`- ${r.runtime} → ${r.file}: walay na-usab, gi-skip ✓`);
    } else {
      console.log(`- ${r.runtime} → ${r.file}: GISULAT ✓${r.backup ? " (naay .bak backup)" : ""}`);
    }
  }
  // Kung naay local memory ang project, i-refresh ang index apil sa sync —
  // aron pirmi bag-o ang graph nga basahon sa AI.
  if (!dryRun && existsSync(memoryDir(targetDir))) {
    const stats = buildIndex(targetDir);
    console.log(`- memory: index gi-refresh (${stats.notes} notes, ${stats.edges} links) ✓`);
  }
}

function cmdMemory() {
  if (sub === "init") {
    const r = initMemory(targetDir);
    console.log(
      r.created.length
        ? `Gibuh at ang local memory: ${r.dir} (${r.created.join(", ")})`
        : `Naa na ang local memory: ${r.dir} (wala gi-overwrite)`
    );
    console.log(`Index: ${r.notes} notes, ${r.edges} links. Ablihi ang folder sa Obsidian para sa graph view.`);
  } else if (sub === "index") {
    if (!existsSync(memoryDir(targetDir)))
      throw new Error(`Walay memory/ sa ${targetDir} — dagana una ang "memory init".`);
    const stats = buildIndex(targetDir);
    console.log(`Index gi-rebuild: ${stats.notes} notes, ${stats.edges} links, ${stats.dangling} dangling links.`);
  } else if (sub === "list") {
    const notes = readNotes(targetDir);
    if (!notes.length) {
      console.log(`Walay memory notes sa ${join(targetDir, "memory")} — dagana ang "memory init" una.`);
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
  console.log(created ? `Gibuh at ang config: ${file}` : `Naa na: ${file} (wala gi-overwrite)`);
}

function cmdValidate() {
  const config = loadConfig(targetDir);
  const { errors, warnings, ok } = validateConfig(config, {
    knownRuntimes: supportedRuntimes,
  });
  for (const e of errors) console.log(`✗ ${e}`);
  for (const w of warnings) console.log(`⚠ ${w}`);
  if (ok && !warnings.length) console.log(`✓ Limpyo ang config — walay problema, walay secrets.`);
  else if (ok) console.log(`✓ Walay errors (${warnings.length} ka warnings).`);
  else {
    console.log(`\n✗ ${errors.length} ka errors — ayoha sa dili pa mo-sync.`);
    process.exitCode = 1;
  }
}

function cmdSkills() {
  if (sub === "list") {
    let enabled = [];
    try {
      enabled = loadConfig(targetDir).skills ?? [];
    } catch {
      /* walay config sa target — bundled ra ang ilista */
    }
    for (const s of listBundledSkills()) {
      console.log(`- ${s.name}${enabled.includes(s.name) ? " ✓ enabled" : ""} — ${s.description}`);
    }
  } else if (sub === "add" && arg) {
    const r = addSkill(arg, targetDir);
    console.log(
      r.alreadyEnabled
        ? `Ang skill "${arg}" enabled na (file gi-refresh). Dagana ang "sync" para ma-aplay.`
        : `Gi-install ang skill "${arg}" → ${r.file}\nEnabled na sa config. Dagana ang "sync" para ma-aplay sa runtimes.`
    );
  } else if (sub === "remove" && arg) {
    const r = removeSkill(arg, targetDir);
    console.log(
      r.wasEnabled
        ? `Gi-disable ang skill "${arg}"${r.removedFile ? " ug gitangtang ang file" : ""}. Dagana ang "sync" para ma-update ang runtimes.`
        : `Ang skill "${arg}" wala man enabled.`
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
    console.log(`Gi-install ang agent "${arg}":`);
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
    console.log(`Gi-install ang command "/${arg}":`);
    for (const f of r.written) console.log(`  → ${f}`);
  } else {
    console.log(`Usage: commands <list|add <name>> [--target <dir>]`);
  }
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
  else help();
}

main().catch((err) => {
  console.error("Sayop:", err.message);
  process.exit(1);
});
