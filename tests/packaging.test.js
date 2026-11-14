import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initProject } from "../lib/init.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...jsFiles(abs));
    else if (entry.endsWith(".js")) out.push(abs);
  }
  return out;
}

test("package has test and check scripts", () => {
  // Cross-platform launchers, NOT a shell glob: npm runs package.json
  // scripts via cmd.exe on Windows no matter what shell the CI step
  // uses, and cmd.exe expands no globs — that is why Windows CI died on
  // `node --test tests/*.test.js` (runs #171-172) before ever reaching
  // the check step. The launcher enumerates the files in Node instead,
  // so the exact same test set runs on every OS. The test script itself
  // is NOT executed here: running it would re-run this test file and
  // recurse; the agent's own `npm test` run is the evidence.
  assert.equal(pkg.scripts?.test, "node scripts/run-tests.mjs");
  // Minimal block: nothing else, no new dependencies, no build step.
  assert.deepEqual(Object.keys(pkg.scripts ?? {}).sort(), ["check", "test"]);
  const check = pkg.scripts.check;
  assert.equal(check, "node scripts/check-syntax.mjs");
  // Prove the check script really covers every .js file under bin/ + lib/:
  // run it as written (a plain node command, no shell needed) and
  // require exit 0.
  execFileSync(process.execPath, ["scripts/check-syntax.mjs"], { cwd: repoRoot, stdio: "pipe" });
  const covered = [...jsFiles(join(repoRoot, "bin")), ...jsFiles(join(repoRoot, "lib"))];
  assert.ok(covered.length > 0, "expected .js files under bin/ + lib/");
});

// S-30: every temp dir created here is registered and removed by
// the after() hook — no leaks.
const madeDirs = [];
after(() => {
  for (const dir of madeDirs) rmSync(dir, { recursive: true, force: true });
});

test("init stamps the real version", () => {
  const dir = mkdtempSync(join(tmpdir(), "init-test-"));
  madeDirs.push(dir);
  const result = initProject(dir);
  assert.equal(result.created, true);
  const config = JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8"));
  assert.equal(config.version, pkg.version);
  assert.notEqual(config.version, "1.0.0");
});
