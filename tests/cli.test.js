import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));

// The expected tool version comes from package.json — never a
// hardcoded literal — so a version bump cannot stale these tests.
const PKG_VERSION = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")
).version;
const PKG_VERSION_PATTERN = new RegExp(PKG_VERSION.replace(/\./g, "\\."));

function runCli(args, cwd) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function tempDir() {
  return mkdtempSync(join(tmpdir(), "rh-cli-"));
}

function writeConfig(dir, config) {
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(config, null, 2));
}

function writeSkill(dir, name = "safe-editing") {
  mkdirSync(join(dir, "skills"), { recursive: true });
  writeFileSync(
    join(dir, "skills", `${name}.md`),
    `---\ndescription: Test skill\n---\n\nTest skill body.\n`
  );
}

// --- Task 3: CLI flags and exit codes (F-B1, F-W5, F-W6) ---

test("help and version flags work", () => {
  const dir = tempDir();
  for (const args of [["--help"], ["-h"], ["sync", "--help"]]) {
    const r = runCli(args, dir);
    assert.equal(r.status, 0, `${args.join(" ")} should exit 0 (got ${r.status}): ${r.stderr}`);
    assert.match(r.stdout, /Usage/, `${args.join(" ")} should print usage`);
  }
  const v = runCli(["--version"], dir);
  assert.equal(v.status, 0, `--version should exit 0 (got ${v.status}): ${v.stderr}`);
  assert.match(v.stdout, PKG_VERSION_PATTERN, "--version should print the tool version");
});

test("unknown command exits 1", () => {
  const dir = tempDir();
  for (const cmd of ["boguscmd", "syncc"]) {
    const r = runCli([cmd], dir);
    assert.equal(r.status, 1, `"${cmd}" should exit 1 (got ${r.status})`);
    assert.match(r.stderr, new RegExp(`Unknown command "${cmd}"`), "stderr should name the unknown command");
    assert.match(r.stdout + r.stderr, /Usage/, "help text should be printed");
  }
  // The explicit `help` subcommand keeps working.
  const h = runCli(["help"], dir);
  assert.equal(h.status, 0, "`help` should exit 0");
  assert.match(h.stdout, /Usage/, "`help` should print usage");
});

test("missing subcommand exits 1", () => {
  const dir = tempDir();
  for (const args of [["skills"], ["skills", "add"], ["memory"], ["agents"], ["commands"]]) {
    const r = runCli(args, dir);
    assert.equal(r.status, 1, `"${args.join(" ")}" should exit 1 (got ${r.status})`);
    assert.match(r.stderr, /Usage/, `"${args.join(" ")}" should print usage on stderr`);
  }
});

// --- Task 4: honest messages (F-W7, F-W13, F-W11 CLI half) ---

test("global --dry-run does not claim success", () => {
  const dir = tempDir();
  const r = runCli(["global", "--dry-run"], dir);
  assert.equal(r.status, 0, `global --dry-run should exit 0 (got ${r.status}): ${r.stderr}`);
  assert.match(
    r.stdout,
    /Dry run complete — nothing was written\. Run without --dry-run to install\./,
    "dry-run should print the honest closing line"
  );
  assert.doesNotMatch(r.stdout, /Done:/, "dry-run must not print a Done: line claiming the install happened");
});

test("empty config sync reports nothing to sync", () => {
  const dir = tempDir();
  writeConfig(dir, { name: "t", rules: ["Do x."], runtimes: [], skills: [] });
  const r = runCli(["sync", "--dry-run"], dir);
  assert.equal(r.status, 0, `sync --dry-run should exit 0 (got ${r.status}): ${r.stderr}`);
  assert.match(
    r.stdout,
    /Nothing to sync — no runtimes and no skills are enabled\./,
    "empty sync should say explicitly that there is nothing to sync"
  );
  assert.match(r.stdout, /skills add <name>/, "empty sync should hint at the next action");
  // status: empty runtimes prints (none), matching the existing skills line.
  const s = runCli(["status"], dir);
  assert.equal(s.status, 0, `status should exit 0 (got ${s.status}): ${s.stderr}`);
  assert.match(s.stdout, /Runtimes:\n  \(none\)/, "status should print (none) under Runtimes:");
});

// --- Task 5: sync lifecycle (F-W3, F-W16 CLI half) ---

test("memory-index failure does not fail a successful sync", () => {
  const dir = tempDir();
  writeConfig(dir, { name: "t", rules: ["Do x."], runtimes: ["claude"], skills: ["safe-editing"] });
  writeSkill(dir);
  // Block the memory index write: INDEX.md as a directory makes
  // buildIndex throw EISDIR after sync itself already succeeded.
  mkdirSync(join(dir, "memory", "INDEX.md"), { recursive: true });
  const r = runCli(["sync"], dir);
  const out = r.stdout + r.stderr;
  assert.equal(r.status, 0, `sync should exit 0 despite the memory failure (got ${r.status}): ${r.stderr}`);
  assert.match(r.stdout, /claude → CLAUDE\.md: WRITTEN/, "per-runtime success lines should still print");
  assert.match(out, /Warning: memory index could not be updated/, "failure should be reported as a warning");
  assert.match(out, /EISDIR/, "warning should name the underlying error");
});

test("SIGTERM handler exists and exits cleanly", () => {
  // Static assertion: a real kill-mid-write test is impractical in
  // node:test — timing a SIGTERM to land inside a synchronous write
  // is inherently flaky, and the CLI finishes in milliseconds. What
  // this pins is that the handlers are registered at all (zero
  // handlers existed repo-wide before this fix).
  const source = readFileSync(CLI, "utf8");
  assert.match(source, /process\.on\("SIGTERM"/, "CLI should register a SIGTERM handler");
  assert.match(source, /process\.on\("SIGINT"/, "CLI should register a SIGINT handler");
});

// --- Verification catch (agent 11): typo'd flags must not crash (F-B1, full fix) ---
// The audit's F-B1 fix direction named typo'd flags explicitly ("any
// typo'd flag (--targt)") and allowed "wrap the top-level parse in
// try/catch". Task 3 only declared help/version, so `--targt` still
// crashed with a raw ERR_PARSE_ARGS_UNKNOWN_OPTION stack trace.

test("unknown flag prints a clean error, not a stack trace", () => {
  const dir = tempDir();
  for (const args of [["--targt"], ["sync", "--bogus"], ["--target"]]) {
    const r = runCli(args, dir);
    assert.equal(r.status, 1, `"${args.join(" ")}" should exit 1 (got ${r.status})`);
    assert.match(r.stderr, /Error: Unknown option|Error: .*option/i, "stderr should name the bad option cleanly");
    assert.doesNotMatch(r.stderr, /ERR_PARSE_ARGS_UNKNOWN_OPTION/, "no raw Node parse error code");
    assert.doesNotMatch(r.stderr, /node:internal/, "no raw Node stack trace");
    assert.doesNotMatch(r.stderr, /\n\s+at parseArgs/, "no parseArgs stack frame");
    assert.match(r.stderr, /Usage/, "help text should be printed so the user sees the real flags");
  }
});

test("unexpected errors keep their stack with --verbose only", () => {
  const dir = tempDir();
  writeConfig(dir, { name: "t", rules: ["Do x."], runtimes: ["claude"], skills: ["safe-editing"] });
  writeSkill(dir);
  // Block the instruction-file write: CLAUDE.md as a directory makes
  // sync throw (a wrapped "Sync failed — partial results" error).
  mkdirSync(join(dir, "CLAUDE.md"));
  const plain = runCli(["sync"], dir);
  assert.equal(plain.status, 1, `sync should exit 1 (got ${plain.status})`);
  assert.match(plain.stderr, /Sync failed/, "plain error should name the failure");
  assert.doesNotMatch(plain.stderr, /\n\s+at\s/, "plain error should stay a friendly one-liner, no stack");
  const verbose = runCli(["sync", "--verbose"], dir);
  assert.equal(verbose.status, 1, `sync --verbose should exit 1 (got ${verbose.status})`);
  assert.match(verbose.stderr, /Sync failed/, "verbose error should name the failure");
  assert.match(verbose.stderr, /\n\s+at sync \(/, "verbose error should include the stack trace");
});

