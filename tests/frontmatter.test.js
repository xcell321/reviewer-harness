// tests/frontmatter.test.js — Task 13, frontmatter half (F-W18).
// Built-in node:test only, zero dependencies. Run: node --test tests/frontmatter.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter } from "../lib/frontmatter.js";

test("frontmatter edge cases parse", () => {
  // Closing --- at EOF, with no trailing newline.
  assert.deepEqual(parseFrontmatter("---\nname: x\n---"), {
    data: { name: "x" },
    body: "",
  });
  // BOM-prefixed input parses.
  assert.deepEqual(parseFrontmatter("\uFEFF---\nname: x\n---\nbody\n"), {
    data: { name: "x" },
    body: "body\n",
  });
  // Empty frontmatter.
  assert.deepEqual(parseFrontmatter("---\n---\nbody\n"), { data: {}, body: "body\n" });
});

test("frontmatter without a closing delimiter warns instead of silently dropping", () => {
  const seen = [];
  const orig = console.warn;
  console.warn = (...args) => seen.push(args.join(" "));
  try {
    const out = parseFrontmatter("---\nname: x\nbody without closer\n");
    assert.deepEqual(out, { data: {}, body: "---\nname: x\nbody without closer\n" });
  } finally {
    console.warn = orig;
  }
  assert.match(seen.join("\n"), /no closing/i);
});

test("CRLF and CR-only line endings still parse (7d7d6f7 regression)", () => {
  assert.deepEqual(parseFrontmatter("---\r\nname: x\r\n---\r\nbody\r\n"), {
    data: { name: "x" },
    body: "body\n",
  });
  assert.deepEqual(parseFrontmatter("---\rname: x\r---\rbody\r"), {
    data: { name: "x" },
    body: "body\n",
  });
});
