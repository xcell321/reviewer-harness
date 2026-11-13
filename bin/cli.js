#!/usr/bin/env node
// reviewer-harness — CLI: sync engine, guardrail validation, local memory,
// skills, sub-agents, and slash commands.
// Commands: status | sync | init | validate | memory | skills | agents | commands | global | graph

import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { loadConfig } from "../lib/config.js";
import { adapters, supportedRuntimes } from "../lib/adapters/index.js";
import { sync, writeSafe } from "../lib/sync.js";
import { initProject, initFull } from "../lib/init.js";
import { initMemory, buildIndex, readNotes, memoryDir } from "../lib/memory.js";
import { validateConfig, validateBundledSkills } from "../lib/validate.js";
import { listBundledSkills, addSkill, removeSkill, loadBundledSkills, skillCommandContent, skillBundleContent, assertValidName, assertInside } from "../lib/skills.js";
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

// devops-basics rule 4: handle SIGTERM/SIGINT gracefully (W-7). The
// handler never exits mid-sync: it only records the abort request, and
// sync() polls it between files via its shouldAbort hook, reports the
// partial progress, and unwinds. The process then exits with the
// conventional code — 130 for SIGINT, 143 for SIGTERM — never 0, so a
// half-finished sync is never reported as success. When no sync is
// running there is no long loop to unwind, so the handler exits with
// the proper code immediately. A second signal force-exits at once.
let abortRequested = false;
let abortSignal = null;
let syncInProgress = false;
function signalExitCode(signal) {
  return signal === "SIGTERM" ? 143 : 130;
}
function isSignalAbortError(err) {
  return (
    !!err &&
    (err.signalAbort === true ||
      err.signalAbort === "signal-abort" ||
      err.isSignalAbort === true ||
      err.isAbortError === true ||
      err.code === "SIGNAL_ABORT" ||
      err.kind === "signal-abort" ||
      err.marker === "signal-abort" ||
      err.name === "SignalAbortError")
  );
}
function handleShutdownSignal(signal) {
  if (abortRequested) {
    // Second signal: the user means it — force-exit now.
    process.exit(signalExitCode(signal));
  }
  abortRequested = true;
  abortSignal = signal;
  console.error(
    `\nReceived ${signal} — ${syncInProgress ? "aborting after the current write." : "exiting."}`
  );
  if (!syncInProgress) process.exit(signalExitCode(signal));
  // A running sync notices shouldAbort between files, reports its
  // partial progress, and unwinds; cmdSync / main().catch then apply
  // the signal exit code.
}
process.on("SIGTERM", () => handleShutdownSignal("SIGTERM"));
process.on("SIGINT", () => handleShutdownSignal("SIGINT"));

function helpText() {
  return `reviewer-harness — your own AI harness

Usage (run inside your project):
  reviewer-harness init [--goal <text>]     Set up EVERYTHING in this project in one command: detect the stack + goal, create the config, install all skills, agents and commands, start the memory, and sync every runtime (--minimal = config only, the old behavior; --dry-run = preview)
  reviewer-harness validate                 Check the config: quality + secret scanning
  reviewer-harness graph [path]             Generate a codebase knowledge graph (graph.json, graph-report.md, graph.html) into .reviewer-harness/graph/
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
  // W-18: a valid config need not carry a version (loadConfig requires
  // only name + rules) — fall back to the tool's own version so the
  // status screen never prints the literal text "vundefined".
  console.log(`Harness : ${config.name ?? "(unnamed)"} v${config.version || packageVersion()}`);
  console.log(`Target  : ${targetDir}`);
  console.log(`Runtimes:`);
  if (!config.runtimes?.length) console.log(`  (none)`);
  for (const name of config.runtimes ?? []) {
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
  let results;
  // W-7: hand sync() the abort hook — it checks between files, reports
  // partial progress, and throws a signal-abort error instead of the
  // signal handler exiting mid-set and reporting a mixed state as 0.
  syncInProgress = true;
  try {
    results = sync({ targetDir, dryRun, shouldAbort: () => abortRequested });
  } catch (err) {
    syncInProgress = false;
    if (isSignalAbortError(err)) {
      // The library already reported the partial progress (P2); the
      // only thing left is the honest signal exit code.
      if (!err.alreadyReported && err.message) console.error(err.message);
      process.exitCode = signalExitCode(abortSignal ?? "SIGINT");
      return;
    }
    throw err;
  }
  syncInProgress = false;
  if (abortRequested) {
    // The signal landed after sync's last abort check — the sync is
    // fully unwound, so it is safe to stop here with the signal code
    // (and skip the memory-index refresh a success would do).
    process.exitCode = signalExitCode(abortSignal ?? "SIGINT");
    return;
  }
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
    // S-20: the missing-store state must behave like `memory index` —
    // same message, same exit 1 — not a quiet exit 0.
    if (!existsSync(memoryDir(targetDir)))
      throw new Error(`No memory/ in ${targetDir} — run "memory init" first.`);
    const notes = readNotes(targetDir);
    if (!notes.length) {
      console.log(`No memory notes in ${join(targetDir, "memory")} yet.`);
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
    // S-17: don't strand a first-time user at the config — name the
    // next step, like the full init and `skills add` flows do.
    console.log(`Next step: run "sync" to apply this config to every runtime (or run "init" without --minimal for the full setup).`);
    return;
  }
  const goal = values.goal ?? null;
  if (dryRun) {
    const r = initFull(targetDir, { dryRun: true, goal });
    console.log(`(dry-run: nothing was written)\n`);
    printDetection(r.detection);
    console.log(`Config : ${r.configExists ? "exists — would be kept (refresh)" : "would be created"}`);
    console.log(`Would install: ${r.planned.skills} skills, ${r.planned.agents} agents, ${r.planned.commands} commands`);
    if (r.skills.notInstalled?.length) {
      console.log(`Kept out (not in your config — removed skills stay removed): ${r.skills.notInstalled.join(", ")}`);
    }
    console.log(`Would start the local memory (if missing) and sync every runtime.`);
    return;
  }
  const r = initFull(targetDir, { goal });
  printDetection(r.detection);
  console.log(`Config : ${r.config.created ? `created → ${r.config.file}` : "already exists — kept, installs refreshed"}`);
  console.log(`Skills : ${r.skills.installed} installed + enabled ✓`);
  // B-5: the receipt must state what was kept — a refresh keeps the
  // config exactly as the user left it, so name the bundled skills
  // that were NOT installed (removed skills stay removed).
  if (r.skills.notInstalled?.length) {
    console.log(`Kept out (not in your config — removed skills stay removed): ${r.skills.notInstalled.join(", ")}`);
  }
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
  // Bundled-store template gate (sauron-grade roadmap, Phase 2): the
  // skills the harness ships must follow the house template, independent
  // of the project config being validated.
  const bundled = loadBundledSkills();
  const skillGate = validateBundledSkills(bundled);
  const allErrors = [...errors, ...skillGate.errors];
  const allOk = ok && skillGate.ok;
  // S-4: a failing validate is a failure like every other — its whole
  // report goes to stderr, so `2>errors.txt` in CI captures it. A
  // passing run's summary stays on stdout.
  const print = allOk ? console.log : console.error;
  for (const e of allErrors) print(`✗ ${e}`);
  for (const w of warnings) print(`⚠ ${w}`);
  if (allOk && !warnings.length)
    console.log(
      `✓ Config is clean — no problems, no known secret patterns found. Bundled skills: ${bundled.length}/${bundled.length} template-compliant.`
    );
  else if (allOk) console.log(`✓ No errors (${warnings.length} warning(s)).`);
  else {
    console.error(`\n✗ ${allErrors.length} error(s) — fix them before syncing.`);
    process.exitCode = 1;
  }
}

// S-9: has this project ever been synced — i.e. do generated runtime
// outputs exist on disk? Sync always writes the enabled skills' slash
// commands (.opencode/commands, .claude/commands) plus, per configured
// runtime, its instruction file or skill-bundle directory. `skills
// remove` uses this to decide whether removal must be pushed into the
// runtimes immediately (they exist and are live) or whether there is
// nothing live yet and a next-step hint is the honest receipt.
function hasSyncState(dir) {
  let config;
  try {
    config = loadConfig(dir);
  } catch {
    return false;
  }
  for (const name of config.runtimes ?? []) {
    const adapter = adapters[name];
    if (!adapter) continue;
    if (typeof adapter.targetFile === "function" && existsSync(join(dir, adapter.targetFile()))) return true;
    if (typeof adapter.skillBundleDir === "function" && existsSync(join(dir, adapter.skillBundleDir()))) return true;
  }
  return (
    existsSync(join(dir, ".claude", "commands")) ||
    existsSync(join(dir, ".opencode", "commands"))
  );
}

// Count what a sync() run changed, for compact receipts: files it
// wrote (instruction files, bundles, slash commands) and orphans the
// sweep deleted.
function countSyncChanges(results) {
  let written = 0;
  let deleted = 0;
  for (const r of results) {
    if (r.file && r.written) written++;
    for (const f of r.skillBundles ?? []) if (f.written) written++;
    for (const f of r.skillCommands ?? []) if (f.written) written++;
    if (
      r.runtime === "cleanup" &&
      typeof r.skipped === "string" &&
      r.skipped.startsWith("deleted orphan")
    ) {
      deleted++;
    }
  }
  return { written, deleted };
}

function cmdSkills() {
  if (sub === "list") {
    let enabled = [];
    // W-17: only a GENUINELY MISSING config yields the plain list.
    // A config that exists but fails to load (malformed JSON, wrong
    // shape) surfaces loadConfig's error — stderr + exit 1 via
    // main().catch — exactly like every other command. The old empty
    // catch disguised a corrupt config as "no config" and silently
    // showed nothing enabled.
    if (existsSync(join(targetDir, "harness.config.json"))) {
      enabled = loadConfig(targetDir).skills ?? [];
    }
    // Grouped by category (the store's organization, v1.17.1); a
    // skill without a category (flat in the store) lists last. The
    // category rides on the full loadBundledSkills() objects.
    const byCategory = [...loadBundledSkills()].sort((a, b) =>
      (a.category ?? "￿").localeCompare(b.category ?? "￿") || a.name.localeCompare(b.name)
    );
    // S-23: an empty store prints "(none)", not silence.
    if (!byCategory.length) console.log(`(none)`);
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
    // S-19 (lib side): removeSkill throws for a name that is not in
    // the bundled store at all (naming the available skills), so a
    // typo exits 1 instead of printing a misleading "was not
    // enabled" with exit 0. A bundled-but-not-enabled skill keeps
    // the "was not enabled" outcome below.
    const r = removeSkill(arg, targetDir);
    if (!r.wasEnabled) {
      console.log(`Skill "${arg}" was not enabled.`);
      return;
    }
    const headline =
      `Skill "${arg}" disabled${r.removedFile ? " and its file removed" : ""}` +
      `${r.keptDirectory ? " (its folder was kept — it contains other files)" : ""}.`;
    // S-9: a removed skill used to stay live in every runtime until
    // the user happened to run "sync" — the runtimes kept serving a
    // skill the user believed was off. When the project has sync
    // state (generated runtime outputs on disk), apply the sync now
    // so the removal takes effect immediately. With no sync state
    // there is nothing live to update — print the next step instead.
    if (!hasSyncState(targetDir)) {
      console.log(`${headline} Run "sync" to update the runtimes.`);
      return;
    }
    console.log(headline);
    // The same signal discipline as cmdSync (W-7): a signal during
    // the auto-sync stops it at a file boundary and maps to the
    // conventional exit codes, never a mid-set exit 0.
    syncInProgress = true;
    let results;
    try {
      results = sync({ targetDir, shouldAbort: () => abortRequested });
    } catch (err) {
      syncInProgress = false;
      // The remove stands — only the runtime refresh failed. Report
      // both outcomes honestly; the exit code carries the failure.
      console.error(
        `The skill stays removed, but the automatic sync failed — its generated runtime files were NOT updated. Run "sync" to finish.`
      );
      if (!err.alreadyReported && err.message) console.error(`Error: ${err.message}`);
      process.exitCode = isSignalAbortError(err)
        ? signalExitCode(abortSignal ?? "SIGINT")
        : 1;
      return;
    }
    syncInProgress = false;
    if (abortRequested) {
      process.exitCode = signalExitCode(abortSignal ?? "SIGINT");
      return;
    }
    const changes = countSyncChanges(results);
    console.log(
      `Runtimes updated — sync applied automatically: ${changes.written} file(s) written` +
        `${changes.deleted ? `, ${changes.deleted} orphaned file(s) removed` : ""} ✓`
    );
    // Mirror cmdSync: keep the memory index current after a
    // successful sync; its failure is a warning, not a failed remove.
    if (existsSync(memoryDir(targetDir))) {
      try {
        const stats = buildIndex(targetDir);
        console.log(`- memory: index refreshed (${stats.notes} notes, ${stats.edges} links) ✓`);
      } catch (err) {
        console.error(
          `Warning: memory index could not be updated — ${err.message} (the remove and sync themselves succeeded; run "memory index" to retry.)`
        );
      }
    }
  } else {
    console.error(`Usage: skills <list|add <name>|remove <name>> [--target <dir>]`);
    process.exitCode = 1;
  }
}

function cmdAgents() {
  if (sub === "list") {
    // S-23: an empty store prints "(none)", not silence.
    const agents = listBundledAgents();
    if (!agents.length) console.log(`(none)`);
    for (const a of agents) console.log(`- ${a.name} — ${a.description}`);
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
    // S-23: an empty store prints "(none)", not silence.
    const commands = listBundledCommands();
    if (!commands.length) console.log(`(none)`);
    for (const c of commands) console.log(`- /${c.name} — ${c.description}`);
  } else if (sub === "add" && arg) {
    const r = addCommand(arg, targetDir);
    console.log(`Command "/${arg}" installed:`);
    for (const f of r.written) console.log(`  → ${f}`);
  } else {
    console.error(`Usage: commands <list|add <name>> [--target <dir>]`);
    process.exitCode = 1;
  }
}

// Mirrors sauron's `graph` wiring: a dynamic import keeps the engine
// out of every other command's startup path. The target is the
// positional path when given (`graph [path]`, sauron-style), else the
// --target directory (which defaults to the current directory).
async function cmdGraph() {
  const graphTarget = sub ? resolve(process.cwd(), sub) : targetDir;
  const outDir = join(graphTarget, ".reviewer-harness", "graph");
  const artifacts = [
    join(outDir, "graph.json"),
    join(outDir, "graph-report.md"),
    join(outDir, "graph.html"),
  ];
  console.log(`[GRAPH] Analyzing AST knowledge graph for: ${graphTarget}`);
  // W-12 (CLI half): --dry-run is a preview like every other mutating
  // command's — name exactly what WOULD be written and write nothing
  // (buildCodebaseGraph writes its artifacts itself, so it must not
  // run at all here, not even far enough to create the directory).
  if (dryRun) {
    console.log(`(dry-run: nothing was written)\n`);
    console.log(`[DRY-RUN] Knowledge graph artifacts would be generated in ${outDir}`);
    for (const f of artifacts) console.log(`  - ${f}`);
    return;
  }
  try {
    const { buildCodebaseGraph } = await import("../lib/graph.js");
    const result = buildCodebaseGraph(graphTarget);
    console.log(`  [AST] Extracted ${result.nodes.length} nodes (files)`);
    console.log(`  [AST] Extracted ${result.edges.length} edges (dependencies)`);
    console.log(`  [AST] Detected ${result.cycles.length} circular dependency cycles`);
    // W-19: an empty result is almost always the wrong folder — warn
    // and fail instead of congratulating 0 files as a clean success.
    if (!result.nodes.length) {
      console.error(`Warning: 0 source files found — is this the right directory? (${graphTarget})`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n[COMPLETE] Knowledge graph artifacts generated in ${outDir}`);
    for (const f of artifacts) console.log(`  - ${f}`);
  } catch (err) {
    console.error(`[ERROR] Failed to generate codebase graph: ${err.message}`);
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
  // S-2 (CLI half): guard every name and composed path BEFORE the
  // first write — a bad name must abort the whole run up front, not
  // surface mid-loop after earlier home directories were written.
  for (const skill of skills) assertValidName(skill.name, "skill");
  for (const { dir, bundle } of targets) {
    for (const skill of skills) {
      const rel = bundle ? join(skill.name, "SKILL.md") : `${skill.name}.md`;
      assertInside(dir, join(dir, rel));
    }
  }
  // S-25: render each skill's content ONCE per run and reuse it for
  // every runtime — the same memoization sync() applies (lib/sync.js,
  // "MEMOIZE (F-S17)"). The builders are pure functions of
  // (skill, skills), so rebuilding per runtime was pure waste: up to
  // 6 targets × 34 skills = 204 builds for 68 distinct outputs.
  const bundleCache = new Map();
  const commandCache = new Map();
  const memoized = (cache, key, build) => {
    if (!cache.has(key)) cache.set(key, build());
    return cache.get(key);
  };
  const bundleContent = (skill) =>
    memoized(bundleCache, skill.name, () => skillBundleContent(skill, skills));
  const commandContent = (skill) =>
    memoized(commandCache, skill.name, () => skillCommandContent(skill, skills));
  if (dryRun) console.log("(dry-run: nothing was written)\n");
  for (const { runtime, dir, bundle } of targets) {
    let written = 0, unchanged = 0, pending = 0;
    for (const skill of skills) {
      const rel = bundle ? join(skill.name, "SKILL.md") : `${skill.name}.md`;
      const content = bundle ? bundleContent(skill) : commandContent(skill);
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

// S-18: how many positionals each command legitimately takes
// (command itself included). Anything beyond that used to be silently
// swallowed — `status extra-junk` ran as if the junk were not there,
// and a path typed without --target quietly targeted somewhere else.
function maxPositionals() {
  const noPositional = ["status", "sync", "init", "validate", "global", "help"];
  if (!command || noPositional.includes(command)) return 1;
  if (command === "memory" || command === "graph") return 2;
  if (command === "skills" || command === "agents" || command === "commands") {
    if (sub === "list") return 2;
    if (sub === "add" || sub === "remove") return 3;
    return 3; // an unknown/missing subcommand gets its usage error below
  }
  return 1;
}

async function main() {
  if (values.help) help();
  else if (values.version) console.log(`reviewer-harness ${packageVersion()}`);
  else if (positionals.length > maxPositionals()) {
    console.error(`Error: unexpected argument: ${positionals[maxPositionals()]}`);
    process.exitCode = 1;
  }
  else if (!command || command === "status") cmdStatus();
  else if (command === "sync") cmdSync();
  else if (command === "init") cmdInit();
  else if (command === "validate") cmdValidate();
  else if (command === "memory") cmdMemory();
  else if (command === "skills") cmdSkills();
  else if (command === "agents") cmdAgents();
  else if (command === "commands") cmdCommands();
  else if (command === "global") cmdGlobal();
  else if (command === "graph") await cmdGraph();
  else if (command === "help") help();
  else {
    console.error(`Unknown command "${command}".`);
    console.error(helpText());
    process.exitCode = 1;
  }
}

// The stack trace with its first line(s) removed: err.stack opens with
// "Error: <message>", which the caller has already printed (or the
// library already reported) — repeating it is the S-16 stutter. A
// multi-line message is stripped whole, not just its first line.
function stackWithoutMessage(err) {
  if (!err?.stack) return "";
  const prefix = `${err.name || "Error"}: ${err.message}`;
  const stack = err.stack.startsWith(prefix)
    ? err.stack.slice(prefix.length).replace(/^\n/, "")
    : err.stack.split("\n").slice(1).join("\n");
  return stack.trim() ? stack : "";
}

main().catch((err) => {
  // S-28: when the library already printed its report (a failed sync's
  // partial results), the CLI must not print it a second time — the
  // exit code is all that remains to apply here.
  if (!err.alreadyReported) console.error("Error:", err.message);
  if (values.verbose) {
    const stack = stackWithoutMessage(err);
    if (stack) console.error(stack);
  }
  process.exit(isSignalAbortError(err) ? signalExitCode(abortSignal ?? "SIGINT") : 1);
});
