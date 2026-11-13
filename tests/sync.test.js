import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeSafe, sync } from "../lib/sync.js";

// S-30: every temp dir created here is registered and removed by
// the after() hook — no leaks.
const madeDirs = [];
after(() => {
  for (const dir of madeDirs) rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "sync-test-"));
  madeDirs.push(dir);
  return dir;
}

// Backup rotation scheme (picked here, implemented exactly in lib/sync.js):
// .bak holds the previous version, .bak.1 the one before, .bak.2 the
// oldest kept generation. A fourth overwrite drops the oldest.
// Single-generation .bak alone FAILS this test (F-B6 evidence: VERSION-A
// was lost after the second sync).
test("writeSafe is atomic", () => {
  const dir = tempDir();
  const abs = join(dir, "CLAUDE.md");

  let r = writeSafe(abs, "VERSION-A");
  assert.deepEqual(r, { written: true, backup: false });
  assert.equal(readFileSync(abs, "utf8"), "VERSION-A");
  assert.equal(existsSync(abs + ".tmp"), false, "no .tmp left behind");

  r = writeSafe(abs, "VERSION-B");
  assert.deepEqual(r, { written: true, backup: true });
  assert.equal(readFileSync(abs, "utf8"), "VERSION-B");
  assert.equal(readFileSync(abs + ".bak", "utf8"), "VERSION-A");
  assert.equal(existsSync(abs + ".tmp"), false);

  writeSafe(abs, "VERSION-C");
  assert.equal(readFileSync(abs + ".bak", "utf8"), "VERSION-B");
  assert.equal(readFileSync(abs + ".bak.1", "utf8"), "VERSION-A");

  writeSafe(abs, "VERSION-D");
  assert.equal(readFileSync(abs + ".bak", "utf8"), "VERSION-C");
  assert.equal(readFileSync(abs + ".bak.1", "utf8"), "VERSION-B");
  assert.equal(readFileSync(abs + ".bak.2", "utf8"), "VERSION-A");

  // Fourth overwrite: the oldest generation (.bak.2 = VERSION-A) is dropped.
  writeSafe(abs, "VERSION-E");
  assert.equal(readFileSync(abs, "utf8"), "VERSION-E");
  assert.equal(readFileSync(abs + ".bak", "utf8"), "VERSION-D");
  assert.equal(readFileSync(abs + ".bak.1", "utf8"), "VERSION-C");
  assert.equal(readFileSync(abs + ".bak.2", "utf8"), "VERSION-B");
  assert.equal(existsSync(abs + ".bak.3"), false);
  assert.deepEqual(
    readdirSync(dir).filter((f) => f.endsWith(".tmp")),
    [],
    "no .tmp files remain after any write"
  );

  // Unchanged content is a no-op (same return shape as before).
  assert.deepEqual(writeSafe(abs, "VERSION-E"), { unchanged: true });
  // Dry-run writes nothing and keeps the same return shape.
  assert.deepEqual(writeSafe(abs, "VERSION-F", true), { dryRun: true, changed: true });
  assert.equal(readFileSync(abs, "utf8"), "VERSION-E");
});

test("writeSafe writes via temp file + rename + fsync", () => {
  // Source-level pin: the atomic mechanism must be visible in
  // lib/write-safe.js (writeSafe's home since the S-8 extraction from
  // lib/sync.js), not just behaviourally implied. A direct
  // writeFileSync(abs) fails this.
  const src = readFileSync(new URL("../lib/write-safe.js", import.meta.url), "utf8");
  assert.match(src, /\.tmp/);
  assert.match(src, /renameSync/);
  assert.match(src, /fsyncSync/);
  assert.match(src, /\.bak\.1/);
  assert.match(src, /\.bak\.2/);
  assert.doesNotMatch(src, /writeFileSync\(abs, content\)/);
});

// --- Task 7: sync is a transaction (F-B5) ---

function makeProject({ runtimes = ["claude", "gemini", "qoder"], skills = ["debug-first"] } = {}) {
  const dir = tempDir();
  writeFileSync(
    join(dir, "harness.config.json"),
    JSON.stringify(
      { name: "t", problem: "Test problem.", rules: ["Do x."], runtimes, skills },
      null,
      2
    )
  );
  mkdirSync(join(dir, "skills"), { recursive: true });
  for (const s of skills) {
    writeFileSync(
      join(dir, "skills", `${s}.md`),
      `---\ndescription: Test skill ${s}.\n---\n\nBody of ${s}.\n`
    );
  }
  return dir;
}

function allOutcomes(results) {
  const out = [];
  for (const r of results) {
    if (r.skillCommands) out.push(...r.skillCommands);
    if (r.skillBundles) out.push(...r.skillBundles);
    if (r.file) out.push(r);
  }
  return out;
}

test("a failure mid-sync leaves no mixed state and reports what changed", () => {
  const dir = makeProject();
  // Audit repro: block .qoder/skills with a file instead of a directory.
  mkdirSync(join(dir, ".qoder"), { recursive: true });
  writeFileSync(join(dir, ".qoder", "skills"), "I am a file, not a directory");

  const logged = [];
  const origError = console.error;
  console.error = (...a) => logged.push(a.join(" "));
  let err;
  try {
    sync({ targetDir: dir });
  } catch (e) {
    err = e;
  } finally {
    console.error = origError;
  }

  assert.ok(err, "sync throws when a target path is blocked");
  assert.match(err.message, /CLAUDE\.md/, "error names a staged file");
  assert.match(err.message, /GEMINI\.md/, "error names a staged file");
  assert.match(err.message, /\.qoder\/skills\/debug-first\/SKILL\.md/, "error names the failed file");
  assert.equal(existsSync(join(dir, "CLAUDE.md")), false, "nothing committed on failure");
  assert.equal(existsSync(join(dir, "GEMINI.md")), false, "nothing committed on failure");
  assert.match(logged.join("\n"), /CLAUDE\.md/, "partial results printed before throwing");
});

test("a second sync after a failed first sync heals cleanly", () => {
  const dir = makeProject();
  mkdirSync(join(dir, ".qoder"), { recursive: true });
  writeFileSync(join(dir, ".qoder", "skills"), "I am a file, not a directory");
  assert.throws(() => sync({ targetDir: dir }));

  rmSync(join(dir, ".qoder", "skills"));
  const results = sync({ targetDir: dir });
  assert.equal(existsSync(join(dir, "CLAUDE.md")), true);
  assert.equal(existsSync(join(dir, "GEMINI.md")), true);
  assert.equal(existsSync(join(dir, ".qoder", "skills", "debug-first", "SKILL.md")), true);

  // Second run is a true no-op: 0 files written.
  const second = sync({ targetDir: dir });
  const outcomes = allOutcomes(second);
  assert.ok(outcomes.length > 0, "second run still reports every file");
  assert.equal(outcomes.filter((o) => o.written).length, 0, "second run writes nothing");
  assert.ok(outcomes.every((o) => o.unchanged), "every file unchanged on second run");
});

// --- Task 8: secret-scan skill bodies + delete orphaned outputs (F-B2, F-W14) ---

test("a secret in a skill body blocks the sync", () => {
  const dir = makeProject();
  // An example-looking key blocks too (Review Focus #2): the scanner
  // cannot tell an example from a live key — the user removes/redacts it.
  writeFileSync(
    join(dir, "skills", "debug-first.md"),
    `---\ndescription: Test skill.\n---\n\nBody with key sk-ant-abcdefghij123456 inside.\n`
  );
  let err;
  try {
    sync({ targetDir: dir });
  } catch (e) {
    err = e;
  }
  assert.ok(err, "sync throws on a secret in a skill body");
  assert.match(err.message, /debug-first/, "error names the skill");
  assert.match(err.message, /sk-a••••/, "error shows only the redacted match");
  assert.doesNotMatch(err.message, /sk-ant-abcdefghij123456/, "error never leaks the full secret");
  assert.equal(existsSync(join(dir, "CLAUDE.md")), false, "nothing written before the block");
});

test("removing a skill deletes its generated files", () => {
  const dir = makeProject({ runtimes: ["claude", "freebuff", "qoder"], skills: ["debug-first"] });
  sync({ targetDir: dir });
  assert.equal(existsSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md")), true);
  assert.equal(existsSync(join(dir, ".opencode", "commands", "debug-first.md")), true);
  assert.equal(existsSync(join(dir, ".claude", "commands", "debug-first.md")), true);

  // A hand-written command that sync never generated must survive.
  writeFileSync(join(dir, ".claude", "commands", "explain.md"), "# Explain\n\nHand-written.\n");
  // Backups of the removed skill go with it.
  writeFileSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md.bak"), "OLD BACKUP");
  writeFileSync(join(dir, ".opencode", "commands", "debug-first.md.bak"), "OLD BACKUP");

  const cfg = JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8"));
  cfg.skills = [];
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(cfg, null, 2));

  const results = sync({ targetDir: dir });
  assert.equal(existsSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md")), false);
  assert.equal(existsSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md.bak")), false);
  assert.equal(existsSync(join(dir, ".opencode", "commands", "debug-first.md")), false);
  assert.equal(existsSync(join(dir, ".opencode", "commands", "debug-first.md.bak")), false);
  assert.equal(existsSync(join(dir, ".claude", "commands", "debug-first.md")), false);
  assert.equal(existsSync(join(dir, ".claude", "commands", "explain.md")), true, "non-generated files survive");
  assert.match(JSON.stringify(results), /deleted orphan/, "deletions are reported in the sync output");
  assert.match(JSON.stringify(results), /debug-first/);
});

test("backups of enabled skills survive a sync", () => {
  const dir = makeProject({ runtimes: ["freebuff"], skills: ["debug-first"] });
  sync({ targetDir: dir });
  // A backup of a still-enabled skill is writeSafe's rescue copy,
  // not an orphan — the sweep must never delete it (regression: the
  // first orphan sweep deleted every SKILL.md.bak on every sync).
  writeFileSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md.bak"), "OLD BACKUP");
  const results = sync({ targetDir: dir });
  assert.equal(
    readFileSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md.bak"), "utf8"),
    "OLD BACKUP"
  );
  assert.doesNotMatch(JSON.stringify(results), /SKILL\.md\.bak/);
});

test("removing a runtime deletes its orphaned instruction file", () => {
  const dir = makeProject({ runtimes: ["claude", "cline"], skills: ["debug-first"] });
  sync({ targetDir: dir });
  assert.equal(existsSync(join(dir, ".clinerules")), true);

  const cfg = JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8"));
  cfg.runtimes = ["claude"];
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(cfg, null, 2));

  const results = sync({ targetDir: dir });
  assert.equal(existsSync(join(dir, ".clinerules")), false);
  assert.match(JSON.stringify(results), /\.clinerules/);
});

// --- Task 9: F-W17 scale limit — memoize + dedupe + document ---

test("each skill body is built once per sync", () => {
  // Behavioural: with three bundle runtimes + slash commands, every
  // bundle/command output for a skill is byte-identical — one build,
  // not five (F-S17: 110 rebuilds per sync at 22 skills).
  const dir = makeProject({
    runtimes: ["freebuff", "antigravity", "copilot"],
    skills: ["debug-first", "safe-editing"],
  });
  sync({ targetDir: dir });
  for (const skill of ["debug-first", "safe-editing"]) {
    const agents = readFileSync(join(dir, ".agents", "skills", skill, "SKILL.md"), "utf8");
    const github = readFileSync(join(dir, ".github", "skills", skill, "SKILL.md"), "utf8");
    assert.equal(agents, github, `${skill} bundle identical across runtimes`);
    const opencode = readFileSync(join(dir, ".opencode", "commands", `${skill}.md`), "utf8");
    const claude = readFileSync(join(dir, ".claude", "commands", `${skill}.md`), "utf8");
    assert.equal(opencode, claude, `${skill} command identical across runtimes`);
  }
  // Pin: the builders are reached only through the memo helpers —
  // the staging loops call bundleContent()/commandContent(), never
  // the builders directly (today they do — this fails before the fix).
  // Memoization is performance-only (pure builders, identical output),
  // so the call-site pin + the identity assertions above are the guard.
  const src = readFileSync(new URL("../lib/sync.js", import.meta.url), "utf8");
  assert.equal(src.match(/skillBundleContent\(/g)?.length, 1, "skillBundleContent has one call site (memoized)");
  assert.equal(src.match(/skillCommandContent\(/g)?.length, 1, "skillCommandContent has one call site (memoized)");
  assert.match(src, /bundleCache/, "bundle memo cache exists");
  assert.match(src, /commandCache/, "command memo cache exists");
  assert.match(src, /bundleContent\(skill\)/, "bundle loop uses the memoized helper");
  assert.match(src, /commandContent\(skill\)/, "command loop uses the memoized helper");
});

test("freebuff and antigravity do not write the same bundle dir twice", () => {
  const dir = makeProject({ runtimes: ["freebuff", "antigravity"], skills: ["debug-first"] });
  const results = sync({ targetDir: dir });
  const rel = ".agents/skills/debug-first/SKILL.md";
  const listing = results.filter((r) => r.skillBundles?.some((f) => f.file === rel));
  assert.equal(listing.length, 1, "bundle file listed by exactly one runtime");
  assert.equal(listing[0].skillBundles.find((f) => f.file === rel).written, true);
  const deduped = results.find((r) => r.deduped === true);
  assert.ok(deduped, "second runtime reports the shared dir as deduped");
  assert.equal(deduped.runtime, "antigravity");

  // Order-independent: reversed runtime order writes identical bytes.
  const dir2 = makeProject({ runtimes: ["antigravity", "freebuff"], skills: ["debug-first"] });
  sync({ targetDir: dir2 });
  assert.equal(
    readFileSync(join(dir2, ".agents", "skills", "debug-first", "SKILL.md"), "utf8"),
    readFileSync(join(dir, ".agents", "skills", "debug-first", "SKILL.md"), "utf8")
  );
});

test("the scale limit is documented with the measured numbers", () => {
  for (const doc of ["../README.md", "../CONTRIBUTING.md"]) {
    const text = readFileSync(new URL(doc, import.meta.url), "utf8");
    assert.match(text, /266,198/, `${doc} states the measured skill source size`);
    assert.match(text, /2,660,559/, `${doc} states the measured generated output`);
    assert.match(text, /262,243/, `${doc} states the measured CLAUDE.md size`);
    assert.match(text, /10×/, `${doc} states the 10x amplification`);
    assert.match(text, /ceiling/i, `${doc} states the target ceiling`);
    assert.match(text, /out of scope/i, `${doc} says a re-architecture is out of scope`);
  }
});
