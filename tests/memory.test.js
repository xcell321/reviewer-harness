import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIndex, parseFrontmatter } from "../lib/memory.js";

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

test("parseFrontmatter reads scalars and every tag form", () => {
  const inline = parseFrontmatter(
    "---\ntype: decision\ntags: [auth, security]\nsummary: Why JWT won\n---\n# Auth\n"
  );
  assert.equal(inline.data.type, "decision");
  assert.deepEqual(inline.data.tags, ["auth", "security"]);
  assert.equal(inline.data.summary, "Why JWT won");
  assert.match(inline.body, /# Auth/);

  const comma = parseFrontmatter("---\ntags: auth, security\n---\nbody\n");
  assert.deepEqual(comma.data.tags, ["auth", "security"]);

  const block = parseFrontmatter("---\ntags:\n  - auth\n  - security\n---\nbody\n");
  assert.deepEqual(block.data.tags, ["auth", "security"]);

  const none = parseFrontmatter("# Plain\n\nNo frontmatter.\n");
  assert.deepEqual(none.data.tags, []);
  assert.equal(none.body, "# Plain\n\nNo frontmatter.\n");
});

test("memory graph carries frontmatter and EXTRACTED edge tags", () => {
  const dir = tempDir();
  const mem = join(dir, "memory");
  mkdirSync(mem, { recursive: true });
  // The [[not-a-link]] inside the summary is metadata, not an edge.
  writeFileSync(
    join(mem, "auth.md"),
    "---\ntype: decision\ntags: [auth, security]\nsummary: Login flow, see [[not-a-link]]\n---\n# Auth\n\nUses [[project]].\n"
  );
  writeFileSync(join(mem, "project.md"), "# Project\n\nBack to [[auth]].\n");
  writeFileSync(join(mem, "lonely.md"), "# Lonely\n\nNo links at all.\n");

  const stats = buildIndex(dir);
  assert.equal(stats.notes, 3);
  assert.equal(stats.edges, 2);

  const graph = JSON.parse(readFileSync(join(mem, "graph.json"), "utf8"));
  const auth = graph.nodes.find((n) => n.id === "auth");
  assert.deepEqual(auth.tags, ["auth", "security"]);
  assert.equal(auth.type, "decision");
  assert.equal(auth.summary, "Login flow, see [[not-a-link]]");
  const project = graph.nodes.find((n) => n.id === "project");
  assert.deepEqual(project.tags, []);
  assert.ok(graph.edges.every((e) => e.tag === "EXTRACTED"));
  assert.ok(!graph.edges.some((e) => e.to === "not-a-link"));

  const report = readFileSync(join(mem, "REPORT.md"), "utf8");
  assert.match(report, /# Memory Report/);
  assert.match(report, /## Most connected notes/);
  // auth and project tie at 2 connections; id order puts auth first.
  assert.ok(report.indexOf("[[auth]]") < report.indexOf("[[lonely]]"));
  assert.match(report, /`security` — \[\[auth\]\]/);
  assert.match(report, /## Isolated notes/);
  assert.match(report, /\[\[lonely\]\]/);

  // REPORT.md quotes [[links]] but is generated, not a note: a
  // rebuild must keep the same note count.
  const again = buildIndex(dir);
  assert.equal(again.notes, 3);
});
