import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isValidName, scanSecrets, validateConfig } from "../lib/validate.js";

// The installed tool version, read from package.json — never a
// hardcoded literal — so a version bump cannot stale this test.
const PKG_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
).version;

test("validateConfig warns when config version differs from package version", () => {
  const { warnings } = validateConfig({
    name: "t",
    rules: ["Do x."],
    version: "1.0.0",
  });
  const joined = warnings.join("\n");
  assert.match(joined, /1\.0\.0/);
  assert.match(joined, new RegExp(PKG_VERSION.replace(/\./g, "\\.")));
});

test("scanSecrets is exported and flags a key in arbitrary text", () => {
  const errors = [];
  scanSecrets("skill body", "key sk-ant-abcdefghij123456", errors);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /sk-a••••/);
  assert.doesNotMatch(errors[0], /sk-ant-abcdefghij123456/);
});

test("validateConfig rejects bad types and duplicate runtimes", () => {
  const { errors, ok } = validateConfig({
    name: "t",
    rules: ["Do x."],
    runtimes: ["claude", "claude"],
    skills: ["nonl", 42],
  });
  assert.equal(ok, false);
  const joined = errors.join("\n");
  assert.match(joined, /42/);
  assert.match(joined, /not a string/);
  assert.match(joined, /claude/);
  assert.match(joined, /twice|duplicate/i);
});

test("isValidName rejects traversal and non-strings", () => {
  assert.equal(isValidName("../../../evil"), false);
  assert.equal(isValidName("../README"), false);
  assert.equal(isValidName("a/b"), false);
  assert.equal(isValidName(""), false);
  assert.equal(isValidName(42), false);
  assert.equal(isValidName("safe-editing"), true);
  assert.equal(isValidName("rea"), true);
});
