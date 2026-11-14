// lib/write-safe.js — the atomic file writer, as a LEAF module.
//
// Extracted from lib/sync.js (S-8): writeSafe is a low-level primitive
// with no sync-engine knowledge, but it used to live in the sync
// engine, so skills/agents/commands/memory all imported "up" into
// sync.js — and skills.js formed an import cycle with it. This module
// imports nothing from any other harness module, which dissolves the
// cycle: importers point here, and sync.js imports from here too.
//
// Behaviour is identical to the original sync.js implementation:
// temp file + fsync + rename + directory fsync + read-back verify +
// 3-generation backup rotation + unchanged-skip. The one deliberate
// change is W-9: the temp path is unique per invocation (pid + random
// suffix), so two processes writing the same file at the same time
// never share a temp file and collide on rename.

import {
  writeFileSync,
  readFileSync,
  existsSync,
  lstatSync,
  realpathSync,
  mkdirSync,
  copyFileSync,
  renameSync,
  openSync,
  fsyncSync,
  closeSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { join, dirname, basename, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";

// Backups rotate through 3 generations (.bak, .bak.1, .bak.2) so a
// second write cannot destroy the rescue copy of the first.
const BACKUP_GENERATIONS = [".bak", ".bak.1", ".bak.2"];

function rotateBackups(abs) {
  // Oldest first, so no generation is clobbered by the shift.
  // Every step is best effort (W-9): the generations are shared
  // paths, so a concurrent writer can shift one between the exists
  // check and the rename, or remove the oldest first. A generation
  // lost that way is a stale rescue copy, never the payload — and
  // the copy in writeSafe re-creates ".bak" right after — so a lost
  // rotation race must not fail the write.
  const gens = BACKUP_GENERATIONS;
  try {
    if (existsSync(abs + gens[gens.length - 1])) rmSync(abs + gens[gens.length - 1]);
  } catch {
    // Lost the race — see above.
  }
  for (let i = gens.length - 1; i > 0; i--) {
    try {
      if (existsSync(abs + gens[i - 1])) renameSync(abs + gens[i - 1], abs + gens[i]);
    } catch {
      // Lost the race — see above.
    }
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

// Resolve the path the filesystem ACTUALLY reaches (B-1): realpath
// the nearest existing ancestor (which resolves every symlink in the
// existing prefix, including a symlinked directory component), then
// append the not-yet-existing tail lexically. A path that does not
// exist yet has no symlinks of its own below that ancestor, so this
// is exact for both existing and about-to-be-created targets.
export function realPathOf(abs) {
  let cur = resolve(abs);
  const tail = [];
  while (true) {
    let exists = true;
    try {
      lstatSync(cur);
    } catch {
      exists = false;
    }
    if (exists) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    tail.unshift(basename(cur));
    cur = parent;
  }
  let real = cur;
  try {
    real = realpathSync(cur);
  } catch {
    // Unresolvable (e.g. a broken symlink): keep the lexical path —
    // writes through a broken link fail rather than escaping, and
    // rename/unlink act on the link itself, never its target.
  }
  return tail.length ? join(real, ...tail) : real;
}

// True when the real (symlink-resolved) location of `abs` is `baseDir`
// itself or lives underneath its real location. This is the check the
// old lexical-only containment missed: a symlinked component inside
// the base that points outside makes this return false.
export function isRealInside(baseDir, abs) {
  const base = realPathOf(baseDir);
  const target = realPathOf(abs);
  return target === base || target.startsWith(base + sep);
}

function writeAtomic(abs, content) {
  // W-9: a unique temp per invocation — concurrent writers to the
  // same target each get their own temp file, so neither one's
  // rename can consume (or be consumed by) the other's temp.
  const tmp = `${abs}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  try {
    const fd = openSync(tmp, "w");
    try {
      writeFileSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, abs);
  } catch (e) {
    // S-5 (in-process half): a failed write must not leave its own
    // temp behind. The temp name is unique to this invocation, so
    // unlinking it can never touch another writer's file.
    try {
      unlinkSync(tmp);
    } catch {
      // Already gone (e.g. the rename succeeded and a later step
      // failed) — nothing to clean.
    }
    throw e;
  }
  fsyncDir(dirname(abs));
}

// Write one file the safe way. Returns what happened:
// dry-run → { dryRun: true, changed } · no change → { unchanged: true }
// changed → { written: true, backup } (with a .bak copy when the
// file already existed). Every real write is verified by reading
// the file back.
//
// Atomic (system-design rule 40 — ACID durability: "committed stays
// committed"): the content goes to a unique temp file, is fsynced,
// then renamed over the target — a kill or power loss mid-write
// leaves either the old file or the new file, never a truncated one.
export function writeSafe(abs, content, dryRun) {
  if (dryRun) {
    const existing = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    return { dryRun: true, changed: existing !== content };
  }
  mkdirSync(dirname(abs), { recursive: true });
  // S-5 (conservative half): remove a stale LEGACY temp (`abs + ".tmp"`,
  // the pre-W-9 deterministic name) for this target before writing.
  // No current writer uses that name, so it can only be litter from
  // an interrupted old-version write. Unique-name temps of other
  // processes are deliberately NOT touched here — they may be live;
  // sync sweeps only aged ones (see sweepStaleTemps in lib/sync.js).
  // Best effort: a cleanup failure must never fail the write.
  try {
    unlinkSync(abs + ".tmp");
  } catch {
    // No stale temp (the common case) or it cannot be removed —
    // either way the write below is unaffected.
  }
  if (existsSync(abs)) {
    const old = readFileSync(abs, "utf8");
    if (old === content) return { unchanged: true };
    rotateBackups(abs);
    copyFileSync(abs, abs + ".bak");
    writeVerified(abs, content);
    return { written: true, backup: true };
  }
  writeVerified(abs, content);
  return { written: true, backup: false };
}

// Write + read-back verify, tolerating a concurrent writer (W-9):
// another writer's rename can land between our rename and our
// read-back, so the file then holds THEIR complete value instead
// of ours — the write itself succeeded and was superseded, not
// corrupted. Re-writing converges as soon as a verify window
// stays quiet; a mismatch that survives every attempt is a real
// failure and throws exactly as the single-attempt verify did.
const VERIFY_ATTEMPTS = 8;
function writeVerified(abs, content) {
  for (let attempt = 1; ; attempt++) {
    writeAtomic(abs, content);
    if (readFileSync(abs, "utf8") === content) return;
    if (attempt >= VERIFY_ATTEMPTS)
      throw new Error(`Failed to write ${abs}`);
  }
}
