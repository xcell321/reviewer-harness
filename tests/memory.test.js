import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIndex } from "../lib/memory.js";

// S-30: every temp dir created here is registered and removed by
// the after() hook — no leaks.
const madeDirs = [];
after(() => {
  for (const dir of madeDirs) rmSync(dir, { recursive: true, force: true });
});

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "memory-test-"));
  madeDirs.push(dir);
  return dir;
}

test("memory index writes are atomic", () => {
  const dir = tempDir();
  const mem = join(dir, "memory");
  mkdirSync(mem, { recursive: true });
  writeFileSync(join(mem, "project.md"), "# Project\n\nSee [[decisions]].\n");
  writeFileSync(join(mem, "decisions.md"), "# Decisions\n\nLinked back to [[project]].\n");

  const stats = buildIndex(dir);
  assert.equal(stats.notes, 2);
  assert.equal(stats.edges, 2);

  const graph = join(mem, "graph.json");
  const index = join(mem, "INDEX.md");
  assert.equal(existsSync(graph), true);
  assert.equal(existsSync(index), true);
  assert.match(readFileSync(index, "utf8"), /Memory Index/);
  assert.deepEqual(
    readdirSync(mem).filter((f) => f.endsWith(".tmp")),
    [],
    "no .tmp files remain in memory/"
  );

  // A second buildIndex after a change rotates a backup of graph.json
  // (memory writes go through writeSafe — F-W16 memory half).
  const before = readFileSync(graph, "utf8");
  writeFileSync(join(mem, "project.md"), "# Project\n\nNo links now.\n");
  buildIndex(dir);
  assert.equal(readFileSync(graph + ".bak", "utf8"), before);
  assert.deepEqual(
    readdirSync(mem).filter((f) => f.endsWith(".tmp")),
    []
  );
});
