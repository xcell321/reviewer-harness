import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIndex, parseFrontmatter, validateInferred, detectCommunities, queryContext, tokenizeQuery, initMemory, readNotes, readVaultNotes } from "../lib/memory.js";

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

test("validateInferred keeps valid proposals and rejects the rest with reasons", () => {
  const notes = [{ id: "auth" }, { id: "deploy" }, { id: "hosting" }];
  const extracted = [{ from: "auth", to: "deploy", type: "link", tag: "EXTRACTED" }];
  const { edges, rejected } = validateInferred(
    notes,
    [
      { from: "auth", to: "hosting", confidence: 0.8, rationale: "Same TLS setup." },
      { from: "auth", to: "ghost", confidence: 0.9, rationale: "Unknown note." },
      { from: "auth", to: "auth", confidence: 0.9, rationale: "Self link." },
      { from: "deploy", to: "hosting", confidence: 1.5, rationale: "Out of range." },
      { from: "deploy", to: "hosting", confidence: 0.5, rationale: "  " },
      { from: "auth", to: "deploy", confidence: 0.7, rationale: "Duplicates the link." },
      { from: "deploy", to: "auth", confidence: 0.4, rationale: "Weaker duplicate." },
      { from: "deploy", to: "auth", confidence: 0.9, rationale: "Stronger duplicate wins.", relation: "depends-on" },
    ],
    extracted
  );
  // The valid proposal + the stronger duplicate survive.
  assert.equal(edges.length, 2);
  const kept = edges.find((e) => e.from === "deploy" && e.to === "auth");
  assert.equal(kept.tag, "INFERRED");
  assert.equal(kept.confidence, 0.9);
  assert.equal(kept.relation, "depends-on");
  // Unknown note, self-link, out-of-range confidence, blank
  // rationale, extracted duplicate, weaker duplicate = 6 rejections.
  assert.equal(rejected.length, 6);
  assert.ok(rejected.every((r) => typeof r.reason === "string" && r.reason.length > 0));

  // A non-array payload is one file-level rejection, not a crash.
  const bad = validateInferred(notes, { nope: true }, extracted);
  assert.equal(bad.edges.length, 0);
  assert.equal(bad.rejected.length, 1);
});

test("inferred edges land in graph.json and REPORT.md, distinct from EXTRACTED", () => {
  const dir = tempDir();
  const mem = join(dir, "memory");
  mkdirSync(mem, { recursive: true });
  // Two tight clusters of three (fully linked), nothing between them.
  const cluster = (a, b, c) => {
    writeFileSync(join(mem, `${a}.md`), `# ${a}\n\nLinks [[${b}]] and [[${c}]].\n`);
    writeFileSync(join(mem, `${b}.md`), `# ${b}\n\nLinks [[${a}]] and [[${c}]].\n`);
    writeFileSync(join(mem, `${c}.md`), `# ${c}\n\nLinks [[${a}]] and [[${b}]].\n`);
  };
  cluster("auth", "session", "tokens");
  cluster("deploy", "hosting", "dns");
  writeFileSync(
    join(mem, "inferred.json"),
    JSON.stringify([
      { from: "auth", to: "deploy", confidence: 0.8, rationale: "Both describe the production login check." },
      { from: "auth", to: "nowhere", confidence: 0.9, rationale: "Points at a note that does not exist." },
    ])
  );

  const stats = buildIndex(dir);
  assert.equal(stats.notes, 6);
  assert.equal(stats.inferred, 1);
  assert.equal(stats.rejected, 1);
  assert.equal(stats.edges, 13); // 12 extracted + 1 inferred

  const graph = JSON.parse(readFileSync(join(mem, "graph.json"), "utf8"));
  const inferredEdge = graph.edges.find((e) => e.tag === "INFERRED");
  assert.equal(inferredEdge.from, "auth");
  assert.equal(inferredEdge.to, "deploy");
  assert.equal(inferredEdge.confidence, 0.8);
  assert.match(inferredEdge.rationale, /production login check/);
  assert.equal(graph.edges.filter((e) => e.tag === "EXTRACTED").length, 12);
  // The bridge does not merge the clusters: two communities of 3.
  const multi = graph.communities.filter((c) => c.members.length > 1);
  assert.equal(multi.length, 2);
  assert.ok(multi.every((c) => c.members.length === 3));

  const report = readFileSync(join(mem, "REPORT.md"), "utf8");
  assert.match(report, /12 EXTRACTED/);
  assert.match(report, /1 INFERRED/);
  assert.match(report, /## Communities/);
  assert.match(report, /## Inferred connections/);
  assert.match(report, /## Surprising connections/);
  assert.match(report, /## Needs review — rejected inferred edges/);
  assert.match(report, /auth.*→.*nowhere|nowhere/);
});

test("detectCommunities is deterministic and separates unlinked clusters", () => {
  const notes = ["a", "b", "c", "x", "y", "z", "solo"].map((id) => ({ id }));
  const link = (from, to) => ({ from, to, type: "link", tag: "EXTRACTED" });
  const edges = [
    link("a", "b"), link("b", "c"), link("a", "c"),
    link("x", "y"), link("y", "z"), link("x", "z"),
  ];
  const first = detectCommunities(notes, edges);
  const second = detectCommunities(notes, edges);
  assert.deepEqual(first, second);
  const multi = first.filter((c) => c.members.length > 1);
  assert.deepEqual(
    multi.map((c) => c.members),
    [["a", "b", "c"], ["x", "y", "z"]]
  );
});

test("tokenizeQuery drops stopwords and short words, dedupes", () => {
  assert.deepEqual(tokenizeQuery("How does the auth flow work?"), ["auth", "flow", "work"]);
  assert.deepEqual(tokenizeQuery("auth auth AUTH"), ["auth"]);
});

function seedVault(dir) {
  const mem = join(dir, "memory");
  mkdirSync(mem, { recursive: true });
  const notes = {
    "project.md": "# Project\n\nHub note. Auth lives in [[auth-flow]]; deploys in [[deploy-guide]].\n",
    "auth-flow.md": "---\ntags: [auth, security]\nsummary: How login sessions and JWT auth work.\n---\n# Auth Flow\n\nThe auth session uses JWT tokens. See [[session-notes]] and [[token-refresh]].\n",
    "session-notes.md": "# Session Notes\n\nSession storage for the auth flow. Back to [[auth-flow]].\n",
    "token-refresh.md": "# Token Refresh\n\nRefresh token rotation for auth sessions. See [[auth-flow]].\n",
    "deploy-guide.md": "# Deploy Guide\n\nDeploy steps and hosting setup. See [[hosting-setup]] and [[dns-records]].\n",
    "hosting-setup.md": "# Hosting Setup\n\nHosting provider configuration. See [[deploy-guide]].\n",
    "dns-records.md": "# DNS Records\n\nDNS records for the hosted domain. See [[deploy-guide]].\n",
    "changelog.md": "# Changelog\n\nRelease history, dates and version numbers only.\n",
  };
  for (const [file, text] of Object.entries(notes)) writeFileSync(join(mem, file), text);
  buildIndex(dir);
  return mem;
}

test("queryContext returns the matching cluster, not the whole memory", () => {
  const dir = tempDir();
  seedVault(dir);
  // hops: 1 — seeds + direct neighbors only. (The project hub note
  // mentions auth, so it is itself a seed; at 2 hops its deploy
  // links would legitimately pull the second cluster in.)
  const r = queryContext(dir, "how does auth session work", { hops: 1 });
  const ids = r.notes.map((n) => n.id);
  assert.equal(ids[0], "auth-flow");
  assert.ok(ids.includes("session-notes"), "seed neighbor included");
  assert.ok(ids.includes("token-refresh"), "seed neighbor included");
  assert.ok(!ids.includes("dns-records"), "distant cluster excluded");
  assert.ok(!ids.includes("hosting-setup"), "distant cluster excluded");
  assert.ok(!ids.includes("changelog"), "unrelated note excluded");
  assert.ok(r.notes.length <= 5, `expected ~5 notes, got ${r.notes.length}`);
  assert.ok(r.notes.length < 8, "not the whole memory");
});

test("queryContext respects the token budget and is deterministic", () => {
  const dir = tempDir();
  seedVault(dir);
  const small = queryContext(dir, "auth session", { budget: 60 });
  assert.ok(small.notes.length >= 1, "at least the best note is emitted");
  assert.ok(small.notes.length < 3, "budget cut the result down");
  const a = queryContext(dir, "auth session");
  const b = queryContext(dir, "auth session");
  assert.deepEqual(a, b);
});

test("queryContext with no matching terms returns no notes", () => {
  const dir = tempDir();
  seedVault(dir);
  const r = queryContext(dir, "quantum blockchain synergy");
  assert.deepEqual(r.seeds, []);
  assert.deepEqual(r.notes, []);
});

test("initMemory seeds the ICM stage folders with CONTEXT.md contracts", () => {
  const dir = tempDir();
  const r = initMemory(dir);
  for (const stage of ["00-inbox", "01-active", "02-decisions", "03-archive"]) {
    const ctx = join(dir, "memory", stage, "CONTEXT.md");
    assert.equal(existsSync(ctx), true, `${stage}/CONTEXT.md exists`);
    assert.ok(r.created.includes(`${stage}/CONTEXT.md`));
    assert.match(readFileSync(ctx, "utf8"), /## Inputs/);
  }
  // CONTEXT.md files are contracts, not notes: only the 2 starters count.
  assert.equal(r.notes, 2);
  // Re-init never overwrites a project's own edit to a contract.
  const ctx = join(dir, "memory", "00-inbox", "CONTEXT.md");
  writeFileSync(ctx, "# My own contract\n");
  initMemory(dir);
  assert.equal(readFileSync(ctx, "utf8"), "# My own contract\n");
});

test("staged notes join the graph with their stage; root notes have none", () => {
  const dir = tempDir();
  initMemory(dir);
  writeFileSync(
    join(dir, "memory", "01-active", "auth-work.md"),
    "# Auth Work\n\nIn progress; relates to [[project]].\n"
  );
  const stats = buildIndex(dir);
  assert.equal(stats.notes, 3);
  const graph = JSON.parse(readFileSync(join(dir, "memory", "graph.json"), "utf8"));
  const staged = graph.nodes.find((n) => n.id === "auth-work");
  assert.equal(staged.stage, "01-active");
  assert.equal(staged.file, "01-active/auth-work.md");
  const root = graph.nodes.find((n) => n.id === "project");
  assert.equal("stage" in root, false);
  assert.ok(graph.edges.some((e) => e.from === "auth-work" && e.to === "project"));
  const index = readFileSync(join(dir, "memory", "INDEX.md"), "utf8");
  assert.match(index, /auth-work.*stage: 01-active/);
  const notes = readNotes(dir);
  assert.equal(notes.find((n) => n.id === "auth-work").stage, "01-active");
});

test("readVaultNotes walks nested folders, skips dot-folders, first basename wins", () => {
  const vault = tempDir();
  mkdirSync(join(vault, "Projects", "Deep"), { recursive: true });
  mkdirSync(join(vault, ".obsidian"), { recursive: true });
  writeFileSync(join(vault, ".obsidian", "hidden.md"), "# Hidden\n");
  writeFileSync(join(vault, "Projects", "auth-vault.md"), "# Vault Auth\n\nVault note about JWT auth.\n");
  writeFileSync(join(vault, "Projects", "Deep", "auth-vault.md"), "# Duplicate\n");
  writeFileSync(join(vault, "top.md"), "# Top\n\nLinks [[auth-vault]].\n");
  const notes = readVaultNotes(vault);
  assert.deepEqual(notes.map((n) => n.id).sort(), ["auth-vault", "top"]);
  assert.equal(notes.find((n) => n.id === "auth-vault").file, "Projects/auth-vault.md");
  assert.equal(notes.find((n) => n.id === "auth-vault").source, "vault");
  assert.deepEqual(readVaultNotes(join(vault, "does-not-exist")), []);
});

test("queryContext bridges into the vault read-only; project notes shadow vault notes", () => {
  const dir = tempDir();
  initMemory(dir); // project + decisions
  writeFileSync(
    join(dir, "memory", "auth-flow.md"),
    "# Auth Flow (project)\n\nProject-side auth session notes.\n"
  );
  buildIndex(dir);
  const vault = tempDir();
  mkdirSync(join(vault, "Areas"), { recursive: true });
  writeFileSync(join(vault, "Areas", "jwt-deep-dive.md"), "# JWT Deep Dive\n\nEverything about JWT token signing and auth verification.\n");
  writeFileSync(join(vault, "auth-flow.md"), "# Auth Flow (vault copy)\n\nVault-side shadowed note.\n");
  writeFileSync(join(vault, "gardening.md"), "# Gardening\n\nTomatoes and watering schedules.\n");
  const before = readdirSync(vault).sort();
  const r = queryContext(dir, "jwt auth token", { vaultDir: vault });
  const jwt = r.notes.find((n) => n.id === "jwt-deep-dive");
  assert.ok(jwt, "vault note retrieved");
  assert.equal(jwt.source, "vault");
  assert.equal(jwt.path, "Areas/jwt-deep-dive.md");
  const auth = r.notes.find((n) => n.id === "auth-flow");
  assert.equal(auth.title, "Auth Flow (project)", "project note shadows the vault copy");
  assert.equal(auth.source, undefined);
  assert.ok(!r.notes.some((n) => n.id === "gardening"), "unrelated vault note excluded");
  // Read-only: nothing was written into the vault.
  assert.deepEqual(readdirSync(vault).sort(), before);
});
