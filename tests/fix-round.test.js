// tests/fix-round.test.js — regression tests for the audit fix round
// (Blockers B-1…B-6, Warnings W-9, W-11, W-15, W-16).
//
// One file for the round on purpose: the findings cross-cut sync,
// skills, init, graph, and the atomic writer, and the repo already
// organizes its suites by fix task / finding ID (see the section
// banners in tests/sync.test.js and tests/skills.test.js). Each test
// below names its finding and pins the exact pre-fix failure it
// guards against.
//
// S-30: every temp dir created here is registered and removed by the
// after() hook at the bottom of the setup section — no leaks.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sync } from "../lib/sync.js";
import { writeSafe } from "../lib/write-safe.js";
import { addSkill, removeSkill, listBundledSkills } from "../lib/skills.js";
import { initFull } from "../lib/init.js";
import { buildCodebaseGraph } from "../lib/graph.js";

// --- temp-dir registry + cleanup (S-30) ---

const madeDirs = [];
function tempDir(prefix = "rh-fix-round-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  madeDirs.push(dir);
  return dir;
}
after(() => {
  for (const dir of madeDirs) rmSync(dir, { recursive: true, force: true });
});

// A minimal sync-able project, same shape as tests/sync.test.js uses.
function makeProject({ runtimes = ["claude"], skills = ["debug-first"] } = {}) {
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

function setConfigSkills(dir, skills) {
  const cfg = JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8"));
  cfg.skills = skills;
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(cfg, null, 2));
}

function write(dir, rel, text) {
  const file = join(dir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, "utf8");
}

// Run fn with console.error/console.warn captured (sync prints its
// partial-results report on failure — expected noise in these tests).
function captured(fn) {
  const origError = console.error;
  const origWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    return { result: fn(), error: null };
  } catch (error) {
    return { result: null, error };
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
}

// ---------- B-1: symlink containment ----------
// Pre-fix evidence: containment was lexical only (the resolved path
// string was compared, symlinks never resolved), so a runtime dir or
// the skills/ base symlinked out of the project let sync / skills add
// create and modify files OUTSIDE the project without any error.

test("B-1: sync refuses to write through a runtime-dir symlink that escapes the project", () => {
  const dir = makeProject();
  const outside = tempDir("rh-fix-round-outside-");
  symlinkSync(outside, join(dir, ".claude"), "dir");

  const { error } = captured(() => sync({ targetDir: dir }));
  assert.ok(error, "sync must refuse when a target path resolves outside the project");
  assert.match(error.message, /outside the target directory/);
  assert.deepEqual(readdirSync(outside), [], "nothing was created outside the project");
  assert.equal(existsSync(join(dir, "CLAUDE.md")), false, "preflight failure commits nothing");
});

test("B-1: skills add refuses when the project skills/ base is a symlink out of the project", () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, "harness.config.json"),
    JSON.stringify({ name: "t", rules: ["Do x."], runtimes: [], skills: [] }, null, 2)
  );
  const outside = tempDir("rh-fix-round-outside-");
  symlinkSync(outside, join(dir, "skills"), "dir");

  assert.throws(() => addSkill("debug-first", dir), /resolves outside/);
  assert.deepEqual(readdirSync(outside), [], "no skill file was installed outside the project");
});

// ---------- B-2: orphan sweep must never delete hand-written files ----------
// Pre-fix evidence: the sweep deleted any on-disk file NAMED after a
// bundled skill once the skill left the config — content was never
// checked — so a hand-written .claude/commands/<skill>.md was deleted
// by the next sync.

test("B-2: a hand-written command file survives the orphan sweep; a generated orphan is swept", () => {
  // Generated orphan: still exactly what sync generated → swept.
  const genDir = makeProject();
  sync({ targetDir: genDir });
  const genFile = join(genDir, ".claude", "commands", "debug-first.md");
  assert.equal(existsSync(genFile), true);
  setConfigSkills(genDir, []);
  const genResults = sync({ targetDir: genDir });
  assert.equal(existsSync(genFile), false, "a generated orphan is deleted");
  assert.match(JSON.stringify(genResults), /deleted orphan/);

  // Hand-written file with a bundled skill's name: custom content, no
  // generated marker → the user's file, kept byte-identical forever.
  const dir = makeProject();
  sync({ targetDir: dir });
  const file = join(dir, ".claude", "commands", "debug-first.md");
  const handWritten = "# My own debug-first notes\n\nHand-written, not harness output.\n";
  writeFileSync(file, handWritten);
  setConfigSkills(dir, []);

  const first = sync({ targetDir: dir });
  assert.equal(readFileSync(file, "utf8"), handWritten, "hand-written file survives the first sweep");
  assert.match(JSON.stringify(first), /kept-foreign/, "the keep is reported in the sync output");
  sync({ targetDir: dir });
  assert.equal(readFileSync(file, "utf8"), handWritten, "hand-written file survives the second sweep");
});

// ---------- B-3 + B-4: graph.html escaping and offline visualizer ----------
// Pre-fix evidence: the graph payload was interpolated into the page
// raw, so a scanned path containing markup (e.g. a directory named
// "<svg onload=alert(1)>") broke out of the data block / injected
// markup; and the visualizer loaded vis-network from a CDN URL, so
// the page contained https:// references and needed the network.

function graphHtmlFor(dir) {
  buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
  return readFileSync(join(dir, "out", "graph.html"), "utf8");
}

test("B-3: graph.html escapes scanned paths — no markup or </script> breakout in the payload", () => {
  // NTFS forbids < and > in file names, so on Windows the payload rides
  // on "&" instead: the graph escaper maps & to \u0026 through the same
  // code path as < and > (lib/graph.js), so the escape is still proven
  // against a real scanned path on every platform.
  const onWindows = process.platform === "win32";
  const payloadDir = onWindows ? "svg&onload=alert(1)" : "<svg onload=alert(1)>";
  const escapedDir = onWindows ? "svg\\u0026onload=alert(1)" : "\\u003csvg onload=alert(1)\\u003e";
  const dir = tempDir("rh-graph-xss-");
  write(dir, `${payloadDir}/payload.ts`, "export const payload = 1;\n");
  write(dir, "src/plain.ts", "export const plain = 1;\n");
  const html = graphHtmlFor(dir);

  assert.ok(!html.includes(payloadDir), "the raw payload string never appears unescaped");
  // The inline data block: exactly the text of the `const payload = …;` line.
  const marker = "const payload = ";
  const start = html.indexOf(marker);
  assert.ok(start !== -1, "the payload block exists");
  const payloadLine = html.slice(start + marker.length, html.indexOf("\n", start));
  assert.ok(!payloadLine.includes("</script>"), "no literal </script> inside the inline JSON block");
  assert.ok(
    payloadLine.includes(escapedDir),
    "the directory name is present, script-escaped"
  );

  // Every literal </script> in the evil fixture's page is a legitimate
  // template closer: the count matches a benign fixture's page exactly.
  const benign = tempDir("rh-graph-benign-");
  write(benign, "src/plain.ts", "export const plain = 1;\n");
  const benignHtml = graphHtmlFor(benign);
  const closers = (s) => s.split("</script>").length - 1;
  assert.equal(closers(html), closers(benignHtml), "no extra </script> was smuggled in by the payload");
});

test("B-4: generated graph.html contains no http(s) references at all (fully offline)", () => {
  const dir = tempDir("rh-graph-offline-");
  write(dir, "src/app.ts", "export const app = 1;\n");
  write(dir, "src/util.ts", 'import { app } from "./app.js";\nexport const util = app;\n');
  const html = graphHtmlFor(dir);
  assert.ok(html.includes("vis-network"), "the visualizer library is still present (vendored inline)");
  assert.deepEqual(html.match(/https?:\/\//g) ?? [], [], "zero http(s):// matches in graph.html");
});

// ---------- B-5: init refresh must not resurrect a removed skill ----------
// Pre-fix evidence: re-running init over an existing project
// re-installed AND re-enabled every bundled skill, silently undoing
// `skills remove` (the refresh path called addSkill for all of them).

test("B-5: init refresh keeps a removed skill removed and names it available-but-not-installed", () => {
  const dir = tempDir();
  initFull(dir);
  assert.ok(
    JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8")).skills.includes("debug-first"),
    "full init enables every bundled skill"
  );

  const removed = removeSkill("debug-first", dir);
  assert.equal(removed.wasEnabled, true);
  assert.equal(existsSync(join(dir, "skills", "quality", "debug-first", "SKILL.md")), false);

  const receipt = initFull(dir);
  const after = JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8"));
  assert.ok(!after.skills.includes("debug-first"), "the refresh does not re-enable the removed skill");
  assert.equal(
    existsSync(join(dir, "skills", "quality", "debug-first", "SKILL.md")),
    false,
    "the refresh does not reinstall the removed skill's file"
  );
  // The receipt (the structured result the CLI prints from) names it.
  assert.ok(
    receipt.skills.availableButNotInstalled.includes("debug-first"),
    "receipt names the skill as available but not installed"
  );
  assert.ok(receipt.skills.notInstalled.includes("debug-first"));
  assert.equal(receipt.skills.installed, listBundledSkills().length - 1);
});

// ---------- B-6: graph build must not go quadratic on minified-style files ----------
// Pre-fix evidence: the import regex rescanned unbounded text from
// every `export` position (lazy [\s\S]*?), so a ~4 MB export-only
// file took ~30 s; there was also no per-file size guard. The fix
// bounds the regex span and skips extraction over MAX_FILE_BYTES
// (the node is still produced, listed in skippedFiles).

test("B-6: graph build over a ~4 MB export-only file completes fast and still yields its node", () => {
  const dir = tempDir("rh-graph-big-");
  // ~4 MB of export-only statements (the audit's repro shape).
  let big = "";
  for (let i = 0; i < 190000; i++) big += `export const x${i}=${i};`;
  assert.ok(big.length > 4 * 1024 * 1024, "fixture really is over 4 MB");
  write(dir, "src/big.js", big);
  // Just under the per-file cap: extraction must still run on it —
  // this is the file that exercises the bounded regex.
  let mid = "";
  for (let i = 0; i < 50000; i++) mid += `export const f${i}=()=>${i};`;
  write(dir, "src/mid.js", mid);

  const started = Date.now();
  const result = buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 15000, `build must finish well under the pre-fix ~30 s (took ${elapsed} ms)`);
  const bigNode = result.nodes.find((n) => n.id === "src/big.js");
  assert.ok(bigNode, "the oversized file still produces its node");
  assert.ok(result.skippedFiles.includes("src/big.js"), "the oversized file is reported as skipped");
  const midNode = result.nodes.find((n) => n.id === "src/mid.js");
  assert.ok(midNode, "the under-cap file produces its node");
  assert.ok(midNode.functions.includes("f0"), "extraction ran on the large export-only file");
  assert.ok(midNode.functions.includes("f49999"), "extraction reached the end of the file");
});

// ---------- W-9: concurrent writeSafe calls must not collide on a shared temp ----------
// Pre-fix evidence: every writer used the same deterministic temp
// path (<file>.tmp), so two processes writing the same target raced
// on rename — one renamed the other's temp away and the loser threw
// ENOENT. writeSafe is synchronous, so in-process "concurrency"
// cannot interleave; this test uses two real child processes (the
// honest version of the race), each hammering the same target.

test("W-9: two processes writing the same file concurrently never collide on a shared temp", async () => {
  const dir = tempDir();
  const target = join(dir, "shared.txt");
  const libUrl = new URL("../lib/write-safe.js", import.meta.url).href;
  const child = join(dir, "writer.mjs");
  writeFileSync(
    child,
    `import { writeSafe } from ${JSON.stringify(libUrl)};\n` +
      `const [target, tag, rounds] = process.argv.slice(2);\n` +
      `const content = tag + " " + "x".repeat(128 * 1024) + " " + tag;\n` +
      `let errors = 0;\n` +
      `const seen = [];\n` +
      `for (let i = 0; i < Number(rounds); i++) {\n` +
      `  try { writeSafe(target, content); } catch (e) { errors++; if (seen.length < 3) seen.push(String(e.code || e.message)); }\n` +
      `}\n` +
      `console.log("errors=" + errors + (seen.length ? " [" + seen.join(" | ") + "]" : ""));\n`
  );

  const runWriter = (tag) =>
    new Promise((resolvePromise, rejectPromise) => {
      const proc = spawn(process.execPath, [child, target, tag, "30"], { encoding: "utf8" });
      let out = "";
      proc.stdout.on("data", (d) => (out += d));
      proc.on("error", rejectPromise);
      proc.on("close", (status) => resolvePromise({ status, out }));
    });

  const [a, b] = await Promise.all([runWriter("AAAA"), runWriter("BBBB")]);
  assert.equal(a.status, 0, `writer A exited cleanly (${a.out})`);
  assert.equal(b.status, 0, `writer B exited cleanly (${b.out})`);
  assert.match(a.out, /errors=0/, "writer A saw no ENOENT from a shared temp");
  assert.match(b.out, /errors=0/, "writer B saw no ENOENT from a shared temp");

  // The final file is one writer's COMPLETE value — never a torn mix.
  const contentA = `AAAA ${"x".repeat(128 * 1024)} AAAA`;
  const contentB = `BBBB ${"x".repeat(128 * 1024)} BBBB`;
  const final = readFileSync(target, "utf8");
  assert.ok(final === contentA || final === contentB, "final content is one complete write");
  assert.deepEqual(
    readdirSync(dir).filter((f) => f.includes(".tmp")),
    [],
    "no temp litter remains"
  );

  // Sequential integrity still holds after the race.
  writeSafe(target, "FINAL");
  assert.equal(readFileSync(target, "utf8"), "FINAL");
});

// ---------- W-11: an in-process rebuild must not serve stale tsconfig aliases ----------
// Pre-fix evidence: the alias/workspace/resolution caches were
// module-level and never cleared, so a second buildCodebaseGraph in
// the same process kept resolving through the FIRST tsconfig it read
// — editing tsconfig between builds changed nothing.

test("W-11: rebuilding after a tsconfig paths edit follows the new alias target", () => {
  const dir = tempDir("rh-graph-cache-");
  const tsconfig = (target) =>
    JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": [`./${target}/*`] } } });
  write(dir, "tsconfig.json", tsconfig("src-a"));
  write(dir, "src/main.ts", 'import { lib } from "@/lib";\nexport const main = lib;\n');
  write(dir, "src-a/lib.ts", "export const lib = 1;\n");
  write(dir, "src-b/lib.ts", "export const lib = 2;\n");

  const first = buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
  assert.deepEqual(
    first.edges.map((e) => `${e.source} -> ${e.target}`),
    ["src/main.ts -> src-a/lib.ts"],
    "first build resolves through src-a"
  );

  writeFileSync(join(dir, "tsconfig.json"), tsconfig("src-b"));
  const second = buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
  assert.deepEqual(
    second.edges.map((e) => `${e.source} -> ${e.target}`),
    ["src/main.ts -> src-b/lib.ts"],
    "second build in the same process follows the edited tsconfig"
  );
});

// ---------- W-15: addSkill on a malformed config must fail before copying ----------
// Pre-fix evidence: addSkill copied the skill file FIRST and parsed
// the config afterwards with a bare JSON.parse — a malformed config
// produced a raw SyntaxError AND left a half-applied install behind.

test("W-15: skills add on a malformed config errors contextually and copies nothing", () => {
  const dir = tempDir();
  writeFileSync(join(dir, "harness.config.json"), "{ not json");

  let error;
  try {
    addSkill("debug-first", dir);
  } catch (e) {
    error = e;
  }
  assert.ok(error, "add must fail on a malformed config");
  assert.ok(!(error instanceof SyntaxError), "the error is contextual, not a raw SyntaxError");
  assert.match(error.message, /Config is not valid JSON/);
  assert.match(error.message, /harness\.config\.json/);
  assert.equal(existsSync(join(dir, "skills")), false, "no skill file was copied before the failure");
});

// ---------- W-16: removeSkill must delete only the file it installed ----------
// Pre-fix evidence: removing a folder-form skill rmSync'd the whole
// <name>/ directory, deleting any user files kept beside SKILL.md.

test("W-16: removing a folder-form skill keeps user files beside SKILL.md", () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, "harness.config.json"),
    JSON.stringify({ name: "t", rules: ["Do x."], runtimes: [], skills: [] }, null, 2)
  );
  addSkill("sqlite-principles", dir); // folder form: skills/database/sqlite-principles/SKILL.md
  const skillDir = join(dir, "skills", "database", "sqlite-principles");
  assert.equal(existsSync(join(skillDir, "SKILL.md")), true);
  writeFileSync(join(skillDir, "my-notes.md"), "MY NOTES — keep me\n");

  const result = removeSkill("sqlite-principles", dir);
  assert.equal(result.wasEnabled, true);
  assert.equal(result.removedFile, true);
  assert.equal(result.keptDirectory, true, "the result says the directory was kept");
  assert.equal(existsSync(join(skillDir, "SKILL.md")), false, "the installed SKILL.md is gone");
  assert.equal(
    readFileSync(join(skillDir, "my-notes.md"), "utf8"),
    "MY NOTES — keep me\n",
    "the user's file beside it survives, byte-identical"
  );
  assert.deepEqual(
    JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8")).skills,
    [],
    "the skill is disabled in the config"
  );
});
