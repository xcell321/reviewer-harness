import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCodebaseGraph, computeGalaxyLayout, scanSourceFiles } from "../lib/graph.js";

// Ported from iging/sauron's graph tests (MIT): tests/unit/
// graph-generator.test.mjs, tests/unit/graph-galaxy-layout.test.mjs,
// and tests/e2e/graph-workflow.test.mjs — rewritten in this repo's
// node:test conventions (one self-contained fixture per test).

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));

function tempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function write(dir, rel, text) {
  const file = join(dir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, "utf8");
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

// The polyglot fixture from sauron's graph-generator test: a TS cycle
// (service-a <-> service-b) plus Python, Go, and Rust modules.
function makePolyglotWorkspace() {
  const dir = tempDir("rh-graph-unit-");
  write(dir, "src/service-a.ts", `import { helperFunction } from "./service-b.js";
export class ServiceA {
  public execute(): void {
    helperFunction();
  }
}
export function runServiceA(): void {}
`);
  write(dir, "src/service-b.ts", `import { runServiceA } from "./service-a.js";
export function helperFunction(): string {
  runServiceA();
  return "ok";
}
export interface ConfigOptions {
  timeout: number;
}
`);
  write(dir, "src/pipeline.py", `class DataPipeline:
    def process(self):
        pass

def calculate_metrics():
    return 42
`);
  write(dir, "src/server.go", `package main
type ServerConfig struct {}
func StartServer() {}
`);
  write(dir, "src/engine.rs", `pub struct ComputeEngine;
pub fn compute() {}
`);
  return dir;
}

test("graph: extracts polyglot symbols across TS, Python, Go, and Rust", () => {
  const dir = makePolyglotWorkspace();
  try {
    const result = buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
    assert.ok(result.nodes.length >= 5, "Should find at least 5 source files");

    const nodeA = result.nodes.find((n) => n.id.includes("service-a.ts"));
    assert.ok(nodeA, "service-a.ts node must exist");
    assert.ok(nodeA.classes.includes("ServiceA"), "Must extract ServiceA class");
    assert.ok(nodeA.functions.includes("runServiceA"), "Must extract runServiceA function");

    const nodePy = result.nodes.find((n) => n.id.includes("pipeline.py"));
    assert.ok(nodePy, "pipeline.py node must exist");
    assert.ok(nodePy.classes.includes("DataPipeline"), "Must extract DataPipeline class");
    assert.ok(nodePy.functions.includes("calculate_metrics"), "Must extract calculate_metrics function");

    const nodeGo = result.nodes.find((n) => n.id.includes("server.go"));
    assert.ok(nodeGo, "server.go node must exist");
    assert.ok(nodeGo.functions.includes("StartServer"), "Must extract StartServer func");
    assert.ok(nodeGo.types.includes("ServerConfig"), "Must extract ServerConfig type");

    const nodeRs = result.nodes.find((n) => n.id.includes("engine.rs"));
    assert.ok(nodeRs, "engine.rs node must exist");
    assert.ok(nodeRs.functions.includes("compute"), "Must extract compute fn");
    assert.ok(nodeRs.classes.includes("ComputeEngine"), "Must extract ComputeEngine struct");
  } finally {
    cleanup(dir);
  }
});

test("graph: detects circular import dependency cycles deterministically", () => {
  const dir = makePolyglotWorkspace();
  try {
    const result = buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
    assert.ok(result.cycles.length > 0, "Must detect circular cycle");
    const cycle = result.cycles[0];
    const hasServiceA = cycle.some((file) => file.includes("service-a.ts"));
    const hasServiceB = cycle.some((file) => file.includes("service-b.ts"));
    assert.ok(hasServiceA && hasServiceB, "Cycle must record both interdependent modules");
  } finally {
    cleanup(dir);
  }
});

test("graph: generates graph.json, graph-report.md, and graph.html artifacts", () => {
  const dir = makePolyglotWorkspace();
  const outputDir = join(dir, "out");
  try {
    buildCodebaseGraph(dir, { outputDir });

    const jsonPath = join(outputDir, "graph.json");
    const reportPath = join(outputDir, "graph-report.md");
    const htmlPath = join(outputDir, "graph.html");
    assert.ok(existsSync(jsonPath), "graph.json must exist");
    assert.ok(existsSync(reportPath), "graph-report.md must exist");
    assert.ok(existsSync(htmlPath), "graph.html must exist");

    const parsedJson = JSON.parse(readFileSync(jsonPath, "utf8"));
    assert.ok(Array.isArray(parsedJson.nodes), "JSON nodes must be an array");
    assert.ok(Array.isArray(parsedJson.edges), "JSON edges must be an array");
    assert.ok(Array.isArray(parsedJson.cycles), "JSON cycles must be an array");

    const htmlContent = readFileSync(htmlPath, "utf8");
    assert.ok(htmlContent.includes("vis-network"), "HTML visualizer must bundle vis-network");
    assert.ok(htmlContent.includes("#010102"), "HTML visualizer must enforce Linear dark theme");
    assert.ok(htmlContent.includes("Physics Active"), "HTML visualizer must feature physics toggle");
  } finally {
    cleanup(dir);
  }
});

// --- Galaxy layout (from sauron's graph-galaxy-layout test) ---

const makeLayoutNodes = (category, count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${category}/file${i}.ts`,
    category,
    inDegree: i % 5,
    outDegree: i % 3,
  }));

const layoutFixture = () => [
  ...makeLayoutNodes("backend", 360),
  ...makeLayoutNodes("frontend", 300),
  ...makeLayoutNodes("packages", 160),
  ...makeLayoutNodes("root", 15),
];

test("graph: galaxy layout gives every node a position and one galaxy per category", () => {
  const nodes = layoutFixture();
  const { positions, galaxies } = computeGalaxyLayout(nodes);
  assert.equal(positions.size, nodes.length);
  assert.deepEqual(galaxies.map((g) => g.category), ["backend", "frontend", "packages", "root"]);
});

test("graph: galaxy layout is deterministic", () => {
  const nodes = layoutFixture();
  const a = computeGalaxyLayout(nodes);
  const b = computeGalaxyLayout(nodes);
  assert.deepEqual([...a.positions.entries()], [...b.positions.entries()]);
});

test("graph: galaxy layout keeps galaxies apart instead of one round blob", () => {
  const { galaxies } = computeGalaxyLayout(layoutFixture());
  for (let i = 0; i < galaxies.length; i++) {
    for (let j = i + 1; j < galaxies.length; j++) {
      const a = galaxies[i];
      const b = galaxies[j];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      assert.ok(gap > a.radius + b.radius, `${a.category} and ${b.category} overlap`);
    }
  }
});

test("graph: galaxy layout places each node near its own galaxy", () => {
  const nodes = layoutFixture();
  const { positions, galaxies } = computeGalaxyLayout(nodes);
  const byName = new Map(galaxies.map((g) => [g.category, g]));
  for (const node of nodes) {
    const g = byName.get(node.category);
    const p = positions.get(node.id);
    assert.ok(g && p);
    assert.ok(Math.hypot(p.x - g.x, p.y - g.y) < g.radius * 1.4, `${node.id} drifted out of its galaxy`);
  }
});

test("graph: scanner skips framework build output such as .next", () => {
  const dir = tempDir("rh-graph-next-");
  try {
    write(dir, "frontend/src/page.tsx", "export default 1;\n");
    write(dir, "frontend/.next/server/page.js", "module.exports = 1;\n");
    const files = scanSourceFiles(dir).map((f) =>
      f.slice(dir.length + 1).split("\\").join("/"),
    );
    assert.deepEqual(files, ["frontend/src/page.tsx"]);
  } finally {
    cleanup(dir);
  }
});

test("graph: scanner skips .claude/worktrees copies", () => {
  const dir = tempDir("rh-graph-wt-");
  try {
    write(dir, "src/a.ts", "export const a = 1;\n");
    write(dir, ".claude/worktrees/copy/src/a.ts", "export const a = 1;\n");
    const files = scanSourceFiles(dir).map((f) =>
      f.slice(dir.length + 1).split("\\").join("/"),
    );
    assert.deepEqual(files, ["src/a.ts"]);
  } finally {
    cleanup(dir);
  }
});

test("graph: resolves tsconfig path aliases and workspace package imports", () => {
  const dir = tempDir("rh-graph-alias-");
  try {
    write(dir, "frontend/tsconfig.json", '{\n  // comment\n  "compilerOptions": { "paths": { "@/*": ["./src/*"] }, },\n}\n');
    write(dir, "frontend/src/app/page.tsx", 'import { Button } from "@/components/button";\nexport default 1;\n');
    write(dir, "frontend/src/components/button.tsx", "export const Button = 1;\n");
    write(dir, "packages/shared/package.json", '{ "name": "@acme/shared" }\n');
    write(dir, "packages/shared/src/index.ts", "export const shared = 1;\n");
    write(dir, "backend/src/main.ts", 'import { shared } from "@acme/shared";\nexport const main = shared;\n');
    const { edges } = buildCodebaseGraph(dir, { outputDir: join(dir, "out") });
    const pairs = edges.map((e) => `${e.source} -> ${e.target}`).sort();
    assert.deepEqual(pairs, [
      "backend/src/main.ts -> packages/shared/src/index.ts",
      "frontend/src/app/page.tsx -> frontend/src/components/button.tsx",
    ]);
  } finally {
    cleanup(dir);
  }
});

test("graph: metrics — hub fan-in, isolated orphan, directory index resolution", () => {
  const dir = tempDir("rh-graph-metrics-");
  const outputDir = join(dir, "out");
  try {
    write(dir, "src/hub.ts", "export const hub = 1;\n");
    write(dir, "src/one.ts", 'import { hub } from "./hub.js";\nexport const one = hub;\n');
    write(dir, "src/two.ts", 'import { hub } from "./hub.js";\nexport const two = hub;\n');
    write(dir, "src/three.ts", 'import { hub } from "./hub.js";\nexport const three = hub;\n');
    write(dir, "src/lonely.ts", "export const lonely = 1;\n");
    write(dir, "src/entry.ts", 'import { feature } from "./feature";\nexport const entry = feature;\n');
    write(dir, "src/feature/index.ts", "export const feature = 1;\n");

    const { nodes, edges } = buildCodebaseGraph(dir, { outputDir });

    const hub = nodes.find((n) => n.id === "src/hub.ts");
    assert.ok(hub, "hub node must exist");
    assert.equal(hub.inDegree, 3, "hub must have fan-in 3");
    assert.equal(hub.outDegree, 0, "hub imports nothing");

    const lonely = nodes.find((n) => n.id === "src/lonely.ts");
    assert.ok(lonely, "lonely node must exist");
    assert.equal(lonely.inDegree, 0, "orphan has no inbound edges");
    assert.equal(lonely.outDegree, 0, "orphan has no outbound edges");

    assert.ok(
      edges.some((e) => e.source === "src/entry.ts" && e.target === "src/feature/index.ts"),
      "directory import must resolve to its index file",
    );

    const report = readFileSync(join(outputDir, "graph-report.md"), "utf8");
    assert.ok(report.includes("`src/hub.ts`"), "report must list the hub in the top-hubs table");
    assert.ok(report.includes("**Isolated Modules**: 1"), "report must count the isolated module");
  } finally {
    cleanup(dir);
  }
});

// --- CLI workflow (from sauron's graph-workflow e2e test) ---

test("graph: CLI generates all 3 artifacts into .reviewer-harness/graph", () => {
  const dir = tempDir("rh-graph-e2e-");
  try {
    write(dir, "src/app.ts", `export class Application {
  public start(): void {}
}
`);
    write(dir, "src/worker.py", `class BackgroundWorker:
    def process_jobs(self):
        pass
`);

    const result = spawnSync(process.execPath, [CLI, "graph", "."], {
      cwd: dir,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `CLI must exit 0 (stderr: ${result.stderr})`);
    assert.ok(result.stdout.includes("[COMPLETE]"), "Must log graph generation completion");
    assert.ok(result.stdout.includes("graph.json"), "Must mention graph.json");
    assert.ok(result.stdout.includes("graph-report.md"), "Must mention graph-report.md");
    assert.ok(result.stdout.includes("graph.html"), "Must mention graph.html");

    const graphDir = join(dir, ".reviewer-harness", "graph");
    const jsonPath = join(graphDir, "graph.json");
    assert.ok(existsSync(jsonPath), "graph.json must exist on disk");
    assert.ok(existsSync(join(graphDir, "graph-report.md")), "graph-report.md must exist on disk");
    assert.ok(existsSync(join(graphDir, "graph.html")), "graph.html must exist on disk");

    const graphData = JSON.parse(readFileSync(jsonPath, "utf8"));
    assert.ok(graphData.nodes.length >= 2, "Must contain at least 2 AST nodes");

    const appNode = graphData.nodes.find((n) => n.id.includes("app.ts"));
    assert.ok(appNode && appNode.classes.includes("Application"), "Must detect Application class in app.ts");

    const workerNode = graphData.nodes.find((n) => n.id.includes("worker.py"));
    assert.ok(workerNode && workerNode.classes.includes("BackgroundWorker"), "Must detect BackgroundWorker class in worker.py");

    const htmlContent = readFileSync(join(graphDir, "graph.html"), "utf8");
    assert.ok(htmlContent.includes("<!DOCTYPE html>"), "Must be a valid HTML document");
    assert.ok(htmlContent.includes("vis-network"), "Must embed vis-network library");
    assert.ok(htmlContent.includes("Fit View"), "Must have accessible control buttons");
  } finally {
    cleanup(dir);
  }
});
