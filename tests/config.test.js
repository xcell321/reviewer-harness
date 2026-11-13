// tests/config.test.js — Task 13, config half (F-W11, F-W20).
// Built-in node:test only, zero dependencies. Run: node --test tests/config.test.js
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../lib/config.js";

// S-30: every temp dir created here is registered and removed by
// the after() hook — no leaks.
const madeDirs = [];
after(() => {
  for (const dir of madeDirs) rmSync(dir, { recursive: true, force: true });
});

function dirWithConfig(content) {
  const dir = mkdtempSync(join(tmpdir(), "harness-config-"));
  madeDirs.push(dir);
  writeFileSync(join(dir, "harness.config.json"), content);
  return dir;
}

test("bad JSON keeps its position and hint", () => {
  const dir = dirWithConfig("{bad json");
  assert.throws(
    () => loadConfig(dir),
    (err) => {
      assert.match(err.message, /position 1/);
      assert.match(err.message, /Check for a trailing comma/);
      return true;
    }
  );
});

test("null and non-object configs fail clearly", () => {
  for (const raw of ["null", "[]", '"x"']) {
    const dir = dirWithConfig(raw);
    assert.throws(() => loadConfig(dir), /config must be an object/i);
  }
});
