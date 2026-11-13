// lib/sync.js — THE SYNC ENGINE (the heart of Lesson 2).
//
// Its job: take the master spec, render it through each adapter, and
// write it into the target project SAFELY:
//
//   1. VALIDATE — refuse to sync a broken or dangerous spec
//   2. DRY-RUN  — preview only, writes nothing
//   3. BACKUP   — before overwriting an existing file, make a .bak copy
//   4. SKIP     — if nothing changed, touch nothing (idempotent)
//
// Sync also generates one SLASH COMMAND per enabled skill (into the
// OpenCode and Claude commands folders), so every skill appears in
// the runtime's "/" menu and can be invoked on demand.
//
// This is the harness's first guardrail: the harness itself cannot
// destroy your files — the same protection it gives you against an
// AI breaking your code.

import {
  readFileSync,
  existsSync,
  rmSync,
  statSync,
  lstatSync,
  readdirSync,
} from "node:fs";
import { join, dirname, basename, relative, sep } from "node:path";
import { loadConfig } from "./config.js";
import { adapters, supportedRuntimes } from "./adapters/index.js";
import { validateConfig, scanSecrets } from "./validate.js";
import { loadSkills, loadBundledSkills, skillCommandContent, skillBundleContent, isGeneratedSkillFile } from "./skills.js";
import { writeSafe, isRealInside } from "./write-safe.js";

// writeSafe lives in lib/write-safe.js now (S-8 — a leaf module, so
// skills/agents/commands/memory no longer import "up" into the sync
// engine and the old sync↔skills import cycle is gone). Re-exported
// here so existing importers of lib/sync.js keep working unchanged.
export { writeSafe } from "./write-safe.js";

// sync({ targetDir, dryRun, shouldAbort }) — shouldAbort is an
// optional hook (W-7): when supplied, it is polled between files in
// the commit loop; returning true stops the sync cleanly at the next
// file boundary, reports the partial results, and throws an error
// marked `signalAbort` (the CLI wires the real signal handlers and
// the 130/143 exit codes against this hook). With no hook, behaviour
// is exactly as before.
export function sync({ targetDir, dryRun = false, shouldAbort = null }) {
  const config = loadConfig(targetDir);

  // LESSON 3 GATE: sync refuses to proceed when the spec is broken or
  // dangerous — above all when a secret would leak into the files.
  const { errors } = validateConfig(config, { knownRuntimes: supportedRuntimes });
  if (errors.length) {
    throw new Error(
      `Refusing to sync — the config has ${errors.length} problem(s):\n` +
        errors.map((e) => `  ✗ ${e}`).join("\n") +
        `\nRun "validate" for the full report.`
    );
  }

  // LESSON 4: attach the enabled skills — the adapters render them
  // into the instruction files, and each one also becomes a slash
  // command below.
  const skills = loadSkills(targetDir, config);
  config.skillSections = skills.map((s) => s.body);

  // MEMOIZE (F-S17): each skill's bundle/command content is built once
  // per sync run, not once per runtime (5x per skill before: 110
  // rebuilds at 22 skills). The builders are pure, so one build per
  // skill per output kind is enough; the caches live only for this run.
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

  // SECRET SCAN (F-B2, api-security rule 9 — never log the secret
  // itself): every loaded skill body is scanned with the same
  // SECRET_PATTERNS as the config gate, BEFORE any file is written.
  // A hit is a sync-blocking error naming the skill and the redacted
  // match. An example-looking key blocks too — the scanner cannot tell
  // an example from a live key; the user removes or redacts it.
  const secretErrors = [];
  for (const skill of skills) {
    scanSecrets(`skill "${skill.name}" body`, skill.body, secretErrors);
    scanSecrets(`skill "${skill.name}" description`, skill.description, secretErrors);
  }
  if (secretErrors.length) {
    throw new Error(
      `Refusing to sync — secret(s) found in skill bodies:\n` +
        secretErrors.map((e) => `  ✗ ${e}`).join("\n")
    );
  }

  // STAGE: render every output in memory first. Nothing is written
  // until every output is rendered and every target path is checked.
  // What the transaction claim covers, exactly (W-8): staging and
  // preflight are all-or-nothing — a rendering error or a blocked
  // target path fails the run before any file is committed. The
  // COMMIT phase is per-file atomic (each file lands whole or not at
  // all, via writeSafe), but it is NOT all-or-nothing across files:
  // a failure mid-commit (ENOSPC, permissions, a signal abort) leaves
  // the files already written at their new content and the rest at
  // their old content — a mixed old/new set. That failure is reported
  // in full (reportPartialSync: what changed, what failed), and
  // re-running sync converges the tree to the staged state.
  // The plan keeps the exact results shape callers already use
  // ({ runtime, file, ...outcome } / { skillBundles } / { skillCommands });
  // file entries carry `content` only until the commit attaches the outcome.
  const plan = [];
  const writtenBundleDirs = new Map(); // bundleDir -> first runtime that wrote it

  for (const name of config.runtimes) {
    const adapter = adapters[name];

    // No adapter for this runtime? Don't crash — report it.
    if (!adapter) {
      plan.push({ runtime: name, skipped: `no adapter for "${name}"` });
      continue;
    }

    // Instruction-file runtimes (OpenCode, Claude, Gemini, Cline):
    // one rendered rules file per runtime.
    if (typeof adapter.targetFile === "function") {
      const rel = adapter.targetFile();
      plan.push({ runtime: name, file: rel, content: adapter.renderInstructions(config) });
    }

    // Skill-bundle runtimes (Freebuff, Copilot CLI, Antigravity):
    // one <skill>/SKILL.md per enabled skill, following the Agent
    // Skills open standard (agentskills.io). DEDUPE (F-S44): runtimes
    // sharing a bundle directory (Freebuff + Antigravity both use
    // .agents/skills) write it once — the later runtime reports the
    // directory as deduped instead of staging the same files again.
    if (typeof adapter.skillBundleDir === "function") {
      const bundleDir = adapter.skillBundleDir();
      if (writtenBundleDirs.has(bundleDir)) {
        plan.push({
          runtime: name,
          bundleDir,
          skillBundles: [],
          deduped: true,
          dedupedFrom: writtenBundleDirs.get(bundleDir),
        });
        continue;
      }
      writtenBundleDirs.set(bundleDir, name);
      const files = [];
      for (const skill of skills) {
        const rel = `${bundleDir}/${skill.name}/SKILL.md`;
        files.push({ file: rel, content: bundleContent(skill) });
      }
      plan.push({ runtime: name, bundleDir, skillBundles: files });
    }
  }

  // SLASH COMMANDS: one per enabled skill, for the two runtimes whose
  // "/" menu lists command files (OpenCode and Claude).
  if (skills.length) {
    const files = [];
    for (const skill of skills) {
      const content = commandContent(skill);
      for (const dir of [".opencode/commands", ".claude/commands"]) {
        files.push({ file: `${dir}/${skill.name}.md`, content });
      }
    }
    plan.push({ skillCommands: files });
  }

  // Flatten the plan into committable items, each knowing how to
  // attach its outcome back to its plan entry.
  const items = [];
  for (const entry of plan) {
    if (entry.file) {
      items.push({
        rel: entry.file,
        content: entry.content,
        set: (outcome) => {
          delete entry.content;
          Object.assign(entry, outcome);
        },
      });
    }
    for (const f of entry.skillBundles ?? []) {
      items.push({
        rel: f.file,
        content: f.content,
        set: (outcome) => {
          delete f.content;
          Object.assign(f, outcome);
        },
      });
    }
    for (const f of entry.skillCommands ?? []) {
      items.push({
        rel: f.file,
        content: f.content,
        set: (outcome) => {
          delete f.content;
          Object.assign(f, outcome);
        },
      });
    }
  }

  // PREFLIGHT: a blocked target path fails the run BEFORE any file is
  // committed — preflight failures never leave a mixed old/new state
  // (commit-phase failures can; see the STAGE comment above).
  const failures = [];
  for (const item of items) {
    const problem = pathProblem(targetDir, join(targetDir, item.rel));
    if (problem) failures.push({ file: item.rel, error: problem });
  }

  // S-5: sweep stale temp litter for the staged targets before
  // writing (best effort; never on a dry run, which writes nothing).
  if (!dryRun) sweepStaleTemps(targetDir, items);

  // COMMIT: write every staged file, collecting errors instead of
  // throwing on the first failure — the caller gets the full picture.
  const changed = [];
  let aborted = false;
  if (!failures.length) {
    for (const item of items) {
      // W-7: poll the abort hook between files — a signal stops the
      // sync at a file boundary, never mid-write, and the partial
      // results below report exactly what was and was not written.
      if (typeof shouldAbort === "function" && shouldAbort()) {
        aborted = true;
        failures.push({
          file: item.rel,
          error: "aborted by signal — sync stopped before writing this file",
        });
        break;
      }
      try {
        const outcome = writeSafe(join(targetDir, item.rel), item.content, dryRun);
        item.set(outcome);
        if (outcome.written) changed.push(item.rel);
      } catch (e) {
        failures.push({ file: item.rel, error: e.message });
        item.set({ error: e.message });
      }
    }
  }

  if (failures.length) {
    const report = reportPartialSync({
      staged: items.map((i) => i.rel),
      changed,
      failures,
    });
    const err = new Error(report);
    // S-28: the library has already printed this report (see
    // reportPartialSync) — the flag tells the CLI's catch not to
    // print it a second time.
    err.alreadyReported = true;
    // W-7: a stop requested through the abort hook is a signal
    // abort, not an ordinary failure — the CLI maps it to the
    // conventional signal exit codes (130/143).
    if (aborted) err.signalAbort = true;
    throw err;
  }

  // ORPHAN SWEEP (F-W14): delete generated files the current config
  // no longer produces, and report each deletion in the sync output.
  // Runs only after a successful commit — a failed sync deletes nothing.
  for (const orphan of findOrphans(targetDir, config, items.map((i) => i.rel))) {
    // B-2: a kept-foreign file is not an orphan at all — its content
    // is not what the harness generates, so it is the user's file.
    // Report it as kept and never touch it (dry-run included).
    if (orphan.foreign) {
      plan.push({
        runtime: "cleanup",
        skipped: `kept-foreign ${orphan.file} (${orphan.reason})`,
      });
      continue;
    }
    if (dryRun) {
      plan.push({
        runtime: "cleanup",
        skipped: `would delete orphan ${orphan.file} (${orphan.reason})`,
      });
      continue;
    }
    try {
      // B-1: re-prove real containment at the delete boundary itself
      // — a path that resolves (through any symlink) outside the
      // target directory is refused, never deleted through.
      const abs = join(targetDir, orphan.file);
      if (!isRealInside(targetDir, abs)) {
        throw new Error(`${abs} resolves outside the target directory — refusing to delete`);
      }
      rmSync(abs);
      plan.push({
        runtime: "cleanup",
        skipped: `deleted orphan ${orphan.file} (${orphan.reason})`,
      });
    } catch (e) {
      plan.push({
        runtime: "cleanup",
        skipped: `could not delete orphan ${orphan.file}: ${e.message}`,
      });
    }
  }

  return plan;
}

// A target path is blocked when a component that must be a directory
// is an existing file, the target itself is a directory, or the path
// escapes the target directory — lexically, or in reality: a symlinked
// component that resolves outside the target blocks the write (B-1).
function pathProblem(targetDir, abs) {
  const rel = relative(targetDir, abs);
  if (rel.startsWith("..")) return `${abs} is outside the target directory`;
  if (!isRealInside(targetDir, abs))
    return `${abs} resolves outside the target directory (through a symlink)`;
  const parts = rel.split(sep);
  let cur = targetDir;
  for (const part of parts.slice(0, -1)) {
    cur = join(cur, part);
    if (existsSync(cur) && !statSync(cur).isDirectory())
      return `${cur} is a file, not a directory`;
  }
  if (existsSync(abs) && !statSync(abs).isFile())
    return `${abs} is a directory, not a file`;
  return null;
}

// Print the partial results (which files changed, which failed) before
// the caller throws — a failed sync must never fail silently about
// what it already did. Returns the report text (also the thrown error).
function reportPartialSync({ staged, changed, failures }) {
  const lines = [
    `Sync failed — partial results:`,
    `  staged: ${staged.length} file(s): ${staged.join(", ") || "(none)"}`,
    `  changed: ${changed.join(", ") || "(none)"}`,
    ...failures.map((f) => `  failed: ${f.file} — ${f.error}`),
  ];
  const report = lines.join("\n");
  console.error(report);
  return report;
}

// Slash-command folders sync writes into (one file per enabled skill).
const COMMAND_DIRS = [".opencode/commands", ".claude/commands"];

// S-5: stale temp litter for the staged targets. writeSafe's temp
// names are unique per invocation (W-9), so a temp another process is
// actively writing cannot be told apart from an interrupted run's
// leftover by name alone — the conservative rule used here: the
// legacy deterministic name (`<file>.tmp`, which no current writer
// uses) is always stale, and a unique-name temp is swept only when
// it is far older than any single small-file write can take. Every
// removal is best effort; a sweep failure never fails the sync.
const STALE_TEMP_MS = 10 * 60 * 1000;

function sweepStaleTemps(targetDir, items) {
  for (const item of items) {
    const abs = join(targetDir, item.rel);
    try {
      rmSync(abs + ".tmp", { force: true });
    } catch {
      // A directory with that name, a permission problem — litter
      // cleanup must never block the sync itself.
    }
    try {
      const dir = dirname(abs);
      const prefix = `${basename(abs)}.tmp-`;
      for (const f of readdirSync(dir)) {
        if (!f.startsWith(prefix)) continue;
        try {
          const p = join(dir, f);
          if (Date.now() - statSync(p).mtimeMs > STALE_TEMP_MS)
            rmSync(p, { force: true });
        } catch {
          // Vanished mid-sweep or not removable — ignore.
        }
      }
    } catch {
      // Target directory does not exist yet — nothing to sweep.
    }
  }
}

// Generated files on disk that the current config no longer produces.
// Three guards keep this from ever deleting user content:
//  - bundle/command orphans must be named after a known bundled skill
//    (so explain.md, review.md and hand-written commands survive);
//  - EVERY orphan type must pass the content check (B-2): the file
//    carries the harness's generated marker, or is byte-identical to
//    what the harness would generate for that skill. A hand-written
//    file that merely shares a bundled skill's name is reported as
//    kept-foreign and left untouched;
//  - the file's REAL path must stay inside the target directory
//    (B-1): a candidate that resolves outside through a symlink is
//    kept-foreign, never deleted through the link.
// Instruction-file orphans use the same marker rule as before.
function findOrphans(targetDir, config, stagedRels) {
  const staged = new Set(stagedRels);
  const bundled = new Set(loadBundledSkills().map((s) => s.name));
  const orphans = new Map(); // rel -> { reason, foreign } (dedupes shared bundle dirs)
  const add = (rel, reason) => {
    if (!staged.has(rel) && !orphans.has(rel))
      orphans.set(rel, { reason, foreign: false });
  };
  const addForeign = (rel, reason) => {
    if (!staged.has(rel) && !orphans.has(rel))
      orphans.set(rel, { reason, foreign: true });
  };

  // Judge one candidate file: "orphan" when the harness provably
  // generated it, "escape" when its real path leaves the project,
  // "foreign" otherwise (hand-written or unreadable — keep it).
  const judge = (abs, name, kind) => {
    if (!isRealInside(targetDir, abs)) return "escape";
    let content;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      return "foreign";
    }
    return isGeneratedSkillFile(targetDir, name, kind, content)
      ? "orphan"
      : "foreign";
  };
  const foreignReason = (verdict, name) =>
    verdict === "escape"
      ? `skill "${name}" resolves outside the project (symlink) — not deleted`
      : `skill "${name}" is no longer enabled, but this file's content is not what the harness generates — kept as a hand-written file`;

  // Skill bundles: <bundleDir>/<skill>/SKILL.md. A .bak file is
  // writeSafe's backup of a live file, never an orphan on its own —
  // backups are deleted only together with their orphaned SKILL.md,
  // and only when the SKILL.md itself passed the content check.
  const bundleDirs = new Set();
  for (const adapter of Object.values(adapters)) {
    if (typeof adapter.skillBundleDir === "function") bundleDirs.add(adapter.skillBundleDir());
  }
  for (const dir of bundleDirs) {
    const absDir = join(targetDir, dir);
    if (!existsSync(absDir)) continue;
    for (const skill of readdirSync(absDir)) {
      if (!bundled.has(skill)) continue;
      const skillDir = join(absDir, skill);
      const rel = `${dir}/${skill}/SKILL.md`;
      if (staged.has(rel)) continue;
      let lst;
      try {
        lst = lstatSync(skillDir);
      } catch {
        continue;
      }
      // B-1: a symlinked skill directory is never descended into or
      // deleted through — report it kept-foreign and move on.
      if (lst.isSymbolicLink()) {
        if (existsSync(join(skillDir, "SKILL.md")))
          addForeign(rel, `skill "${skill}" directory is a symlink — not deleted`);
        continue;
      }
      if (!lst.isDirectory()) continue;
      if (!readdirSync(skillDir).includes("SKILL.md")) continue;
      const reason = `skill "${skill}" is no longer enabled`;
      const verdict = judge(join(skillDir, "SKILL.md"), skill, "bundle");
      if (verdict !== "orphan") {
        addForeign(rel, foreignReason(verdict, skill));
        continue;
      }
      add(rel, reason);
      for (const gen of [".bak", ".bak.1", ".bak.2"]) {
        if (existsSync(join(skillDir, `SKILL.md${gen}`))) add(`${rel}${gen}`, reason);
      }
    }
  }

  // Slash commands: <dir>/<skill>.md (plus its .bak files, only when
  // the command itself is orphaned AND passed the content check).
  for (const dir of COMMAND_DIRS) {
    const absDir = join(targetDir, dir);
    if (!existsSync(absDir)) continue;
    for (const f of readdirSync(absDir)) {
      if (!f.endsWith(".md")) continue;
      const name = f.replace(/\.md$/, "");
      if (!bundled.has(name)) continue;
      const rel = `${dir}/${f}`;
      if (staged.has(rel)) continue;
      const reason = `skill "${name}" is no longer enabled`;
      const verdict = judge(join(absDir, f), name, "command");
      if (verdict !== "orphan") {
        addForeign(rel, foreignReason(verdict, name));
        continue;
      }
      add(rel, reason);
      for (const gen of [".bak", ".bak.1", ".bak.2"]) {
        if (existsSync(join(absDir, `${f}${gen}`))) add(`${rel}${gen}`, reason);
      }
    }
  }

  // Instruction files of runtimes no longer enabled.
  for (const [name, adapter] of Object.entries(adapters)) {
    if (typeof adapter.targetFile !== "function") continue;
    if (config.runtimes.includes(name)) continue;
    const rel = adapter.targetFile();
    const abs = join(targetDir, rel);
    if (!existsSync(abs) || staged.has(rel)) continue;
    // B-1: never even read through a symlink that escapes the project.
    if (!isRealInside(targetDir, abs)) continue;
    try {
      if (readFileSync(abs, "utf8").includes("generated by")) {
        add(rel, `runtime "${name}" is no longer enabled`);
      }
    } catch {
      // Unreadable — leave it alone rather than guessing.
    }
  }

  return [...orphans.entries()].map(([file, v]) => ({
    file,
    reason: v.reason,
    ...(v.foreign ? { foreign: true } : {}),
  }));
}
