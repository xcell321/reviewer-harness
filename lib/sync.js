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
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  renameSync,
  openSync,
  fsyncSync,
  closeSync,
  rmSync,
  statSync,
  readdirSync,
} from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { loadConfig } from "./config.js";
import { adapters, supportedRuntimes } from "./adapters/index.js";
import { validateConfig, scanSecrets } from "./validate.js";
import { loadSkills, loadBundledSkills, skillCommandContent, skillBundleContent } from "./skills.js";

// Write one file the safe way. Returns what happened:
// dry-run → { dryRun: true, changed } · no change → { unchanged: true }
// changed → { written: true, backup } (with a .bak copy when the
// file already existed). Every real write is verified by reading
// the file back.
//
// Atomic (system-design rule 40 — ACID durability: "committed stays
// committed"): the content goes to `abs + ".tmp"`, is fsynced, then
// renamed over the target — a kill or power loss mid-write leaves
// either the old file or the new file, never a truncated one.
// Backups rotate through 3 generations (.bak, .bak.1, .bak.2) so a
// second sync cannot destroy the rescue copy of the first.
const BACKUP_GENERATIONS = [".bak", ".bak.1", ".bak.2"];

function rotateBackups(abs) {
  // Oldest first, so no generation is clobbered by the shift.
  const gens = BACKUP_GENERATIONS;
  if (existsSync(abs + gens[gens.length - 1])) rmSync(abs + gens[gens.length - 1]);
  for (let i = gens.length - 1; i > 0; i--) {
    if (existsSync(abs + gens[i - 1])) renameSync(abs + gens[i - 1], abs + gens[i]);
  }
}

function fsyncDir(dir) {
  // Best effort: a directory fsync makes the rename itself durable.
  // Some filesystems/platforms refuse it — the file fsync above is
  // the guarantee; a failed dir fsync must not fail the write.
  try {
    const fd = openSync(dir, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    // Ignore — see above.
  }
}

function writeAtomic(abs, content) {
  const tmp = abs + ".tmp";
  const fd = openSync(tmp, "w");
  try {
    writeFileSync(fd, content);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, abs);
  fsyncDir(dirname(abs));
}

export function writeSafe(abs, content, dryRun) {
  if (dryRun) {
    const existing = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    return { dryRun: true, changed: existing !== content };
  }
  mkdirSync(dirname(abs), { recursive: true });
  if (existsSync(abs)) {
    const old = readFileSync(abs, "utf8");
    if (old === content) return { unchanged: true };
    rotateBackups(abs);
    copyFileSync(abs, abs + ".bak");
    writeAtomic(abs, content);
    if (readFileSync(abs, "utf8") !== content)
      throw new Error(`Failed to write ${abs}`);
    return { written: true, backup: true };
  }
  writeAtomic(abs, content);
  if (readFileSync(abs, "utf8") !== content)
    throw new Error(`Failed to write ${abs}`);
  return { written: true, backup: false };
}

export function sync({ targetDir, dryRun = false }) {
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
  // until every output is rendered and every target path is checked —
  // sync is a transaction (system-design rule 40, atomicity: all or
  // nothing), so a failed run never leaves a mixed old/new state.
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
  // committed, so a failed sync never leaves a mixed old/new state.
  const failures = [];
  for (const item of items) {
    const problem = pathProblem(targetDir, join(targetDir, item.rel));
    if (problem) failures.push({ file: item.rel, error: problem });
  }

  // COMMIT: write every staged file, collecting errors instead of
  // throwing on the first failure — the caller gets the full picture.
  const changed = [];
  if (!failures.length) {
    for (const item of items) {
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
    throw new Error(report);
  }

  // ORPHAN SWEEP (F-W14): delete generated files the current config
  // no longer produces, and report each deletion in the sync output.
  // Runs only after a successful commit — a failed sync deletes nothing.
  for (const orphan of findOrphans(targetDir, config, items.map((i) => i.rel))) {
    if (dryRun) {
      plan.push({
        runtime: "cleanup",
        skipped: `would delete orphan ${orphan.file} (${orphan.reason})`,
      });
      continue;
    }
    try {
      rmSync(join(targetDir, orphan.file));
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
// escapes the target directory.
function pathProblem(targetDir, abs) {
  const rel = relative(targetDir, abs);
  if (rel.startsWith("..")) return `${abs} is outside the target directory`;
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

// Generated files on disk that the current config no longer produces.
// Two guards keep this from ever deleting user content:
//  - bundle/command orphans must be named after a known bundled skill
//    (so explain.md, review.md and hand-written commands survive);
//  - instruction-file orphans must still carry the generated-file
//    marker ("generated by"), so a hand-written CLAUDE.md survives.
function findOrphans(targetDir, config, stagedRels) {
  const staged = new Set(stagedRels);
  const bundled = new Set(loadBundledSkills().map((s) => s.name));
  const orphans = new Map(); // rel -> reason (dedupes shared bundle dirs)
  const add = (rel, reason) => {
    if (!staged.has(rel) && !orphans.has(rel)) orphans.set(rel, reason);
  };

  // Skill bundles: <bundleDir>/<skill>/SKILL.md. A .bak file is
  // writeSafe's backup of a live file, never an orphan on its own —
  // backups are deleted only together with their orphaned SKILL.md.
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
      if (!statSync(skillDir).isDirectory()) continue;
      if (!readdirSync(skillDir).includes("SKILL.md")) continue;
      const rel = `${dir}/${skill}/SKILL.md`;
      if (staged.has(rel)) continue;
      const reason = `skill "${skill}" is no longer enabled`;
      add(rel, reason);
      for (const gen of [".bak", ".bak.1", ".bak.2"]) {
        if (existsSync(join(skillDir, `SKILL.md${gen}`))) add(`${rel}${gen}`, reason);
      }
    }
  }

  // Slash commands: <dir>/<skill>.md (plus its .bak files, only when
  // the command itself is orphaned).
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
    try {
      if (readFileSync(abs, "utf8").includes("generated by")) {
        add(rel, `runtime "${name}" is no longer enabled`);
      }
    } catch {
      // Unreadable — leave it alone rather than guessing.
    }
  }

  return [...orphans.entries()].map(([file, reason]) => ({ file, reason }));
}
