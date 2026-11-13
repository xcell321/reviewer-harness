// lib/graph.js — Codebase Knowledge Graph Generator for reviewer-harness.
//
// Extracts symbols, functions, classes, interfaces, and module import
// dependencies. Generates graph.json, graph-report.md, and a standalone
// interactive graph.html.
//
// Adapted from iging/sauron's graph engine (MIT) — ported 2026-11-13 for
// reviewer-harness. Source: scripts/graph/generate-graph.mjs in
// https://github.com/iging/sauron. The extraction, import resolution,
// cycle detection, metrics, report, and visualizer behavior are sauron's,
// unchanged except:
//   - artifacts land in .reviewer-harness/graph/ (was .sauron/graph/) and
//     the scan ignore-list names .reviewer-harness (was .sauron);
//   - branding strings (HTML title and brand mark, report credit line)
//     say reviewer-harness;
//   - cluster wording says "directory": clusters were always the target
//     project's top-level directories — sauron calls them departments.
//
// Reviewer-harness divergences from sauron (2026-11-13) — deliberate fixes
// where sauron's design is defective; do not "restore" sauron behavior here:
//   - output escaping: the JSON payload is script-escaped and every string
//     interpolated into innerHTML in the generated page passes escapeHtml;
//   - vendored vis-network: vis-network 10.1.5 is vendored under
//     lib/assets/ and inlined at generation time (no CDN, zero network
//     requests from graph.html);
//   - bounded import regex: the import/export-from match is window-bounded
//     and cannot cross a statement boundary (no quadratic backtracking);
//   - iterative traversals: cycle detection uses an explicit stack instead
//     of recursion, so deep import chains cannot overflow the call stack;
//   - size guards: per-file cap (MAX_FILE_BYTES) plus total file/byte
//     guards (MAX_TOTAL_FILES / MAX_TOTAL_BYTES) with named limits;
//   - per-run caches: alias/workspace/resolution caches are cleared at the
//     start of every buildCodebaseGraph run (no stale cross-run edges);
//   - resolved-edge dedupe: edges are deduped by resolved (from, to) pair
//     before degree metrics are computed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeSafe } from "./write-safe.js";

/**
 * @typedef {Object} GraphNode
 * @property {string} id - Canonical relative file path.
 * @property {string} label - File basename.
 * @property {string} category - Top-level directory category.
 * @property {number} lineCount - Lines of code in file.
 * @property {string[]} functions - Exported or declared function names.
 * @property {string[]} classes - Exported or declared class names.
 * @property {string[]} types - Interfaces or type aliases.
 * @property {number} inDegree - Number of incoming import references.
 * @property {number} outDegree - Number of outgoing imports.
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} source - Importer file relative path.
 * @property {string} target - Imported file relative path.
 * @property {string} importPath - Raw import path literal.
 */

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".reviewer-harness",
  "coverage",
  ".nyc_output",
  // Framework build output and caches (generated code, not source).
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".output",
  ".vercel",
  ".netlify",
  ".turbo",
  ".expo",
  ".angular",
  ".parcel-cache",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  ".pytest_cache",
  ".mypy_cache",
  ".gradle",
  "target",
]);

const SUPPORTED_EXTENSIONS = new Set([
  // JavaScript & TypeScript
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  // Python
  ".py",
  // Go
  ".go",
  // Rust
  ".rs",
  // Java & Kotlin
  ".java",
  ".kt",
  // PHP
  ".php",
  // Ruby
  ".rb",
  // C & C++
  ".c",
  ".cpp",
  ".cc",
  ".h",
  ".hpp",
  // C#
  ".cs",
]);

// Size guards (W-10 / B-6): a single oversized (usually minified or
// generated) file must not hang or OOM the run, and a huge tree must fail
// with a clear "project too large" error naming the limit instead of dying.
/** Per-file cap: files larger than this are skipped for symbol/import extraction (counted in the output). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
/** Total source-file count cap for one run. */
export const MAX_TOTAL_FILES = 100000;
/** Total source-bytes cap for one run. */
export const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Recursively find all supported code files in target directory.
 * @param {string} directory
 * @param {string} rootDir
 * @returns {string[]}
 */
export function scanSourceFiles(directory, rootDir = directory, results = []) {
  // Accumulate into one shared array: spreading child results into push()
  // passes every element as an argument and overflows on huge subtrees.
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Agent worktrees (.claude/worktrees) are full repository copies and would duplicate every module.
      const isAgentWorktrees =
        entry.name === "worktrees" && path.basename(directory) === ".claude";
      if (!IGNORED_DIRECTORIES.has(entry.name) && !isAgentWorktrees) {
        scanSourceFiles(path.join(directory, entry.name), rootDir, results);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        results.push(path.join(directory, entry.name));
      }
    }
  }

  return results;
}

/**
 * Polyglot AST symbol & dependency extractor.
 * Supports TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, PHP, Ruby, C/C++, and C#.
 * @param {string} filePath
 * @param {string} rootDir
 * @returns {{ node: GraphNode, rawImports: string[] }}
 */
function parseFileSymbols(filePath, rootDir) {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const ext = path.extname(filePath).toLowerCase();

  // Per-file size guard (B-6 / W-10): never read a file over MAX_FILE_BYTES
  // into memory for extraction; the caller counts the skip in the output.
  let fileSize = 0;
  try {
    fileSize = fs.statSync(filePath).size;
  } catch {
    fileSize = 0;
  }
  if (fileSize > MAX_FILE_BYTES) {
    const skipParts = relativePath.split("/");
    return {
      node: {
        id: relativePath,
        label: path.basename(relativePath),
        category: skipParts.length > 1 ? skipParts[0] : "root",
        lineCount: 0,
        functions: [],
        classes: [],
        types: [],
        inDegree: 0,
        outDegree: 0,
      },
      rawImports: [],
      skipped: true,
    };
  }

  const content = fs.readFileSync(filePath, "utf8");
  // Count lines by counting newline characters — split("\n") would
  // materialize one array entry per line just to count them (W-10).
  let lineCount = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lineCount++;
  }
  if (content.length === 0) lineCount = 1;

  /** @type {string[]} */
  const rawImports = [];
  /** @type {string[]} */
  const functions = [];
  /** @type {string[]} */
  const classes = [];
  /** @type {string[]} */
  const types = [];

  let match;

  if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    // === JavaScript & TypeScript ===
    // Bounded (B-6): the from-clause span is capped at 500 chars and may not
    // cross a statement boundary (;) or a quote, so a match attempt can
    // never rescan unbounded text. The old lazy [\s\S]*? rescanned from
    // every export position — quadratic on minified files. Multi-line
    // imports still match: newlines are allowed inside the window.
    const importRegex =
      /(?:import\s+(?:[^;"']{0,500}?from\s+)?|export\s+(?:[^;"']{0,500}?from\s+))["']([^"']+)["']/g;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const functionRegex =
      /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
    while ((match = functionRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
    const arrowFuncRegex =
      /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g;
    while ((match = arrowFuncRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
    const classRegex =
      /(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
    const interfaceRegex = /(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      if (match[1]) types.push(match[1]);
    }
    const typeRegex = /(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/g;
    while ((match = typeRegex.exec(content)) !== null) {
      if (match[1]) types.push(match[1]);
    }
  } else if (ext === ".py") {
    // === Python ===
    const pyImportRegex =
      /^(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/gm;
    while ((match = pyImportRegex.exec(content)) !== null) {
      const mod = match[1] || match[2];
      if (mod) rawImports.push(mod);
    }
    const pyDefRegex = /^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/gm;
    while ((match = pyDefRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
    const pyClassRegex = /^\s*class\s+([a-zA-Z0-9_]+)(?:\s*\(|\s*:)/gm;
    while ((match = pyClassRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
  } else if (ext === ".go") {
    // === Go ===
    const goImportRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
    while ((match = goImportRegex.exec(content)) !== null) {
      if (match[2]) {
        rawImports.push(match[2]);
      } else if (match[1]) {
        const lines = match[1].split("\n");
        for (const line of lines) {
          const m = line.match(/"([^"]+)"/);
          if (m && m[1]) rawImports.push(m[1]);
        }
      }
    }
    const goFuncRegex = /^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/gm;
    while ((match = goFuncRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
    const goTypeRegex = /^type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface)/gm;
    while ((match = goTypeRegex.exec(content)) !== null) {
      if (match[1]) types.push(match[1]);
    }
  } else if (ext === ".rs") {
    // === Rust ===
    const rsUseRegex = /^\s*use\s+([a-zA-Z0-9_:]+)/gm;
    while ((match = rsUseRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const rsFnRegex = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/gm;
    while ((match = rsFnRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
    const rsStructRegex = /^\s*(?:pub\s+)?(?:struct|enum)\s+([a-zA-Z0-9_]+)/gm;
    while ((match = rsStructRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
    const rsTraitRegex = /^\s*(?:pub\s+)?trait\s+([a-zA-Z0-9_]+)/gm;
    while ((match = rsTraitRegex.exec(content)) !== null) {
      if (match[1]) types.push(match[1]);
    }
  } else if (ext === ".java" || ext === ".kt" || ext === ".cs") {
    // === Java / Kotlin / C# ===
    const javaImportRegex = /^\s*(?:import|using)\s+([a-zA-Z0-9_.]+);?/gm;
    while ((match = javaImportRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const javaClassRegex =
      /(?:public\s+|private\s+|protected\s+)?(?:class|interface|record|enum)\s+([a-zA-Z0-9_]+)/g;
    while ((match = javaClassRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
    const javaMethodRegex =
      /(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/g;
    while ((match = javaMethodRegex.exec(content)) !== null) {
      if (
        match[1] &&
        !["if", "for", "while", "switch", "catch"].includes(match[1])
      ) {
        functions.push(match[1]);
      }
    }
  } else if (ext === ".php") {
    // === PHP ===
    const phpUseRegex = /^\s*use\s+([a-zA-Z0-9_\\]+);/gm;
    while ((match = phpUseRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const phpClassRegex = /(?:class|trait|interface)\s+([a-zA-Z0-9_]+)/g;
    while ((match = phpClassRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
    const phpFuncRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    while ((match = phpFuncRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
  } else if ([".c", ".cpp", ".cc", ".h", ".hpp"].includes(ext)) {
    // === C & C++ ===
    const cIncludeRegex = /#include\s+["<]([^">]+)[">]/g;
    while ((match = cIncludeRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const cClassRegex = /(?:class|struct)\s+([a-zA-Z0-9_]+)\s*[{:]/g;
    while ((match = cClassRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
    const cFuncRegex =
      /^\s*(?:[a-zA-Z0-9_*&<>]+\s+)+([a-zA-Z0-9_]+)\s*\([^;{)]*\)\s*\{/gm;
    while ((match = cFuncRegex.exec(content)) !== null) {
      if (match[1] && !["if", "for", "while", "switch"].includes(match[1])) {
        functions.push(match[1]);
      }
    }
  } else if (ext === ".rb") {
    // === Ruby ===
    const rbRequireRegex =
      /^\s*(?:require|require_relative)\s+["']([^"']+)["']/gm;
    while ((match = rbRequireRegex.exec(content)) !== null) {
      if (match[1]) rawImports.push(match[1]);
    }
    const rbDefRegex = /^\s*def\s+([a-zA-Z0-9_!?]+)/gm;
    while ((match = rbDefRegex.exec(content)) !== null) {
      if (match[1]) functions.push(match[1]);
    }
    const rbClassRegex = /^\s*(?:class|module)\s+([a-zA-Z0-9_:]+)/gm;
    while ((match = rbClassRegex.exec(content)) !== null) {
      if (match[1]) classes.push(match[1]);
    }
  }

  const parts = relativePath.split("/");
  const category = parts.length > 1 ? parts[0] : "root";

  return {
    node: {
      id: relativePath,
      label: path.basename(relativePath),
      category,
      lineCount,
      functions: [...new Set(functions)],
      classes: [...new Set(classes)],
      types: [...new Set(types)],
      inDegree: 0,
      outDegree: 0,
    },
    rawImports: [...new Set(rawImports)],
    skipped: false,
  };
}

/**
 * Resolve relative import paths to known node IDs.
 * @param {string} sourceId
 * @param {string} importLiteral
 * @param {Map<string, GraphNode>} nodeMap
 * @param {string} rootDir
 * @returns {string | null}
 */
function resolveImport(sourceId, importLiteral, nodeMap, rootDir) {
  // Per-run memoization (S-24): resolution is deterministic for a fixed
  // nodeMap, so repeat (source, literal) pairs are answered from the cache
  // instead of re-walking every alias/package x 27 candidates.
  const cacheKey = sourceId + "\0" + importLiteral;
  if (resolveCache.has(cacheKey)) return resolveCache.get(cacheKey);
  const resolved = resolveImportUncached(sourceId, importLiteral, nodeMap, rootDir);
  resolveCache.set(cacheKey, resolved);
  return resolved;
}

function resolveImportUncached(sourceId, importLiteral, nodeMap, rootDir) {
  const sourceAbsDir = path.dirname(path.join(rootDir, sourceId));

  if (!importLiteral.startsWith(".")) {
    // Path aliases from tsconfig/jsconfig (for example "@/components/x"), then
    // workspace packages by name (for example "@acme/ui"). Anything else is external.
    for (const candidateBase of aliasCandidates(sourceAbsDir, importLiteral, rootDir)) {
      const hit = matchCandidate(candidateBase, nodeMap, rootDir);
      if (hit) return hit;
    }
    if (importLiteral.includes(".") && !importLiteral.includes("/")) {
      const pyPathCandidate = importLiteral.replace(/\./g, "/") + ".py";
      if (nodeMap.has(pyPathCandidate)) return pyPathCandidate;
    }
    return null;
  }

  return matchCandidate(path.resolve(sourceAbsDir, importLiteral), nodeMap, rootDir);
}

/** Per-run cache of import resolution results, keyed by (sourceId, literal). */
const resolveCache = new Map();
/** Cache of path aliases per directory, so each tsconfig is read once. */
const aliasCache = new Map();
/** Cache of workspace packages (name to folder) per repository root. */
const workspaceCache = new Map();

/**
 * Reads JSON that may contain comments and trailing commas (tsconfig style).
 * @param {string} file
 * @returns {any}
 */
function readLooseJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const noComments = raw.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_match, str) => str ?? "");
    return JSON.parse(noComments.replace(/,(\s*[}\]])/g, "$1"));
  } catch {
    return null;
  }
}

/**
 * Finds the nearest tsconfig.json or jsconfig.json at or above `dir` (inside the root)
 * and returns its `paths` aliases as absolute target patterns.
 * @param {string} dir
 * @param {string} rootDir
 * @returns {Array<{ pattern: string, targets: string[] }>}
 */
function aliasesFor(dir, rootDir) {
  if (aliasCache.has(dir)) return aliasCache.get(dir);
  /** @type {Array<{ pattern: string, targets: string[] }>} */
  let result = [];
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const config = readLooseJson(path.join(dir, name));
    const options = config?.compilerOptions;
    if (options?.paths && typeof options.paths === "object") {
      const base = path.resolve(dir, options.baseUrl ?? ".");
      result = Object.entries(options.paths).map(([pattern, targets]) => ({
        pattern,
        targets: (Array.isArray(targets) ? targets : []).map((t) => path.resolve(base, String(t))),
      }));
      break;
    }
  }
  if (result.length === 0) {
    const parent = path.dirname(dir);
    const insideRoot = path.relative(rootDir, parent) === "" || !path.relative(rootDir, parent).startsWith("..");
    if (parent !== dir && insideRoot && path.resolve(dir) !== path.resolve(rootDir)) {
      result = aliasesFor(parent, rootDir);
    }
  }
  aliasCache.set(dir, result);
  return result;
}

/**
 * Maps workspace package names to their folders by reading package.json files
 * one and two levels below the root (apps/*, packages/*, backend, frontend, and so on).
 * @param {string} rootDir
 * @returns {Map<string, string>}
 */
function workspacePackages(rootDir) {
  if (workspaceCache.has(rootDir)) return workspaceCache.get(rootDir);
  /** @type {Map<string, string>} */
  const packages = new Map();
  /** @param {string} dir @param {number} depth */
  const visit = (dir, depth) => {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".")) continue;
      const child = path.join(dir, entry.name);
      const pkg = readLooseJson(path.join(child, "package.json"));
      if (pkg && typeof pkg.name === "string") packages.set(pkg.name, child);
      if (depth < 2) visit(child, depth + 1);
    }
  };
  visit(rootDir, 1);
  workspaceCache.set(rootDir, packages);
  return packages;
}

/**
 * Candidate absolute base paths for a bare import (alias or workspace package).
 * @param {string} sourceAbsDir
 * @param {string} importLiteral
 * @param {string} rootDir
 * @returns {string[]}
 */
function aliasCandidates(sourceAbsDir, importLiteral, rootDir) {
  /** @type {string[]} */
  const candidates = [];
  for (const { pattern, targets } of aliasesFor(sourceAbsDir, rootDir)) {
    const star = pattern.indexOf("*");
    if (star === -1) {
      if (importLiteral === pattern) candidates.push(...targets);
      continue;
    }
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    if (importLiteral.startsWith(prefix) && importLiteral.endsWith(suffix)) {
      const rest = importLiteral.slice(prefix.length, importLiteral.length - suffix.length);
      candidates.push(...targets.map((t) => t.replace("*", rest)));
    }
  }
  for (const [name, folder] of workspacePackages(rootDir)) {
    if (importLiteral === name) {
      candidates.push(path.join(folder, "src", "index"), path.join(folder, "index"));
    } else if (importLiteral.startsWith(`${name}/`)) {
      const sub = importLiteral.slice(name.length + 1);
      candidates.push(path.join(folder, "src", sub), path.join(folder, sub));
    }
  }
  return candidates;
}

/**
 * Matches an absolute base path against known nodes, trying the usual extensions.
 * @param {string} candidateBase
 * @param {Map<string, GraphNode>} nodeMap
 * @param {string} rootDir
 * @returns {string | null}
 */
function matchCandidate(candidateBase, nodeMap, rootDir) {
  const candidateExtensions = [
    "",
    ".ts",
    ".js",
    ".mjs",
    ".cjs",
    ".tsx",
    ".jsx",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".php",
    ".rb",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/index.jsx",
    "/index.mjs",
    "/__init__.py",
    "/mod.rs",
  ];

  for (const ext of candidateExtensions) {
    const checkPath = candidateBase + ext;
    // Replace .js with .ts or .tsx if the source is TypeScript
    if (ext === "" && candidateBase.endsWith(".js")) {
      for (const tsExt of [".ts", ".tsx"]) {
        const tsAlt = candidateBase.slice(0, -3) + tsExt;
        const relTsAlt = path.relative(rootDir, tsAlt).replace(/\\/g, "/");
        if (nodeMap.has(relTsAlt)) return relTsAlt;
      }
    }
    const relPath = path.relative(rootDir, checkPath).replace(/\\/g, "/");
    if (nodeMap.has(relPath)) {
      return relPath;
    }
  }

  return null;
}

/**
 * Detect cycles in graph edges using DFS.
 * @param {Map<string, GraphNode>} nodeMap
 * @param {GraphEdge[]} edges
 * @returns {string[][]}
 */
function detectCycles(nodeMap, edges) {
  const adj = new Map();
  for (const id of nodeMap.keys()) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
  }

  const visited = new Set();
  const recStack = new Set();
  /** @type {string[][]} */
  const cycles = [];

  // Iterative DFS with an explicit stack (W-1): the recursive version
  // overflowed the call stack on ~5k-deep import chains and lost the run.
  // Frame order and neighbor order are identical to the recursive version,
  // so the reported cycles are unchanged.
  for (const startId of nodeMap.keys()) {
    if (visited.has(startId)) continue;
    /** @type {string[]} */
    const pathStack = [startId];
    visited.add(startId);
    recStack.add(startId);
    const frames = [{ id: startId, next: 0 }];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      const neighbors = adj.get(frame.id) || [];
      if (frame.next < neighbors.length) {
        const neighbor = neighbors[frame.next++];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          recStack.add(neighbor);
          pathStack.push(neighbor);
          frames.push({ id: neighbor, next: 0 });
        } else if (recStack.has(neighbor)) {
          const cycleStartIndex = pathStack.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            cycles.push(pathStack.slice(cycleStartIndex).concat(neighbor));
          }
        }
      } else {
        frames.pop();
        pathStack.pop();
        recStack.delete(frame.id);
      }
    }
  }

  return cycles;
}

/** Extra galaxy colors for directories without a fixed color (backend, frontend, packages, and so on). */
const GALAXY_PALETTE = [
  { bg: "#22d3ee", border: "#67e8f9", highlight: "#cffafe" },
  { bg: "#f472b6", border: "#f9a8d4", highlight: "#fce7f3" },
  { bg: "#34d399", border: "#6ee7b7", highlight: "#d1fae5" },
  { bg: "#fb923c", border: "#fdba74", highlight: "#ffedd5" },
  { bg: "#818cf8", border: "#a5b4fc", highlight: "#e0e7ff" },
  { bg: "#facc15", border: "#fde047", highlight: "#fef9c3" },
  { bg: "#c084fc", border: "#d8b4fe", highlight: "#f3e8ff" },
  { bg: "#2dd4bf", border: "#5eead4", highlight: "#ccfbf1" },
];

/**
 * Small deterministic string hash (FNV-1a), so layouts and colors are stable between runs.
 * @param {string} text
 * @returns {number} Unsigned 32-bit hash.
 */
function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Places every top-level directory in its own spiral galaxy, and spreads the galaxies across a
 * wide "multiverse" so a large codebase never collapses into one round blob.
 * Hubs (high fan-in plus fan-out) sit in the bright core and the rest trail out on spiral arms.
 * Deterministic: the same graph always gets the same layout.
 *
 * @param {Array<{ id: string, category: string, inDegree: number, outDegree: number }>} nodes
 * @returns {{ positions: Map<string, { x: number, y: number }>, galaxies: Array<{ category: string, x: number, y: number, radius: number, count: number }> }}
 */
export function computeGalaxyLayout(nodes) {
  /** @type {Map<string, typeof nodes>} */
  const byCategory = new Map();
  for (const node of nodes) {
    const list = byCategory.get(node.category) ?? [];
    list.push(node);
    byCategory.set(node.category, list);
  }
  const groups = [...byCategory.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  const radiusOf = (/** @type {number} */ count) => 70 + Math.sqrt(count) * 34;
  /** @type {Map<string, { x: number, y: number }>} */
  const positions = new Map();
  /** @type {Array<{ category: string, x: number, y: number, radius: number, count: number }>} */
  const galaxies = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  /** @type {number[]} */
  const placedThetas = [];
  let cumulativeCount = 0;

  groups.forEach(([category, members], index) => {
    const radius = radiusOf(members.length);
    const theta =
      index * goldenAngle +
      (hashString(category) % 360) * (Math.PI / 180) * 0.15;
    // Galaxy centers follow a golden-angle spiral (S-37): the spiral radius
    // grows with the square root of the cumulative node count of the
    // galaxies already placed (same 34-per-root-node scale as radiusOf),
    // plus this galaxy's own radius — not with the largest galaxy's radius
    // alone, which exiled single-node galaxies to the edge of the canvas.
    let distance =
      index === 0 ? 0 : (radius + 34 * Math.sqrt(cumulativeCount)) * 1.35;
    if (index > 0) {
      // Overlap guard: push this galaxy straight out along its own ray
      // until it clears every galaxy placed before it. The golden-angle
      // separation does most of the work, so this only fires when two
      // galaxies would otherwise overlap; it keeps the layout
      // deterministic and overlap-free for any mix of galaxy sizes.
      for (let j = 0; j < galaxies.length; j++) {
        const prev = galaxies[j];
        const prevDistance = Math.hypot(prev.x, prev.y);
        const sumRadii = prev.radius + radius;
        if (prevDistance === 0) {
          distance = Math.max(distance, sumRadii + 2);
          continue;
        }
        const delta = theta - placedThetas[j];
        const perpendicular = Math.abs(prevDistance * Math.sin(delta));
        if (perpendicular >= sumRadii) continue;
        const required =
          prevDistance * Math.cos(delta) +
          Math.sqrt(sumRadii * sumRadii - perpendicular * perpendicular);
        distance = Math.max(distance, required + 2);
      }
    }
    const cx = Math.cos(theta) * distance;
    const cy = Math.sin(theta) * distance;
    galaxies.push({ category, x: cx, y: cy, radius, count: members.length });
    placedThetas.push(theta);
    cumulativeCount += members.length;

    const ordered = [...members].sort(
      (a, b) =>
        b.inDegree + b.outDegree - (a.inDegree + a.outDegree) ||
        a.id.localeCompare(b.id),
    );
    const arms = members.length < 12 ? 2 : 3;
    const tilt = ((hashString(category) % 628) / 100) % (Math.PI * 2);
    ordered.forEach((node, k) => {
      const t = ordered.length === 1 ? 0 : k / (ordered.length - 1);
      const arm = k % arms;
      const h = hashString(node.id);
      // Spread each arm sideways (wider toward the rim) so arms look like dust lanes, not rings.
      const spread = (((h >>> 8) & 0xff) / 0xff - 0.5) * (0.35 + 0.9 * t);
      const angle =
        tilt + (arm * Math.PI * 2) / arms + t * Math.PI * 2.6 + spread;
      const r =
        radius *
        (0.08 + 0.92 * Math.sqrt(t)) *
        (0.9 + (((h >>> 24) & 0xff) / 0xff) * 0.2);
      const jitter = 8 + 30 * t;
      const jx = (((h & 0xffff) / 0xffff) * 2 - 1) * jitter;
      const jy = ((((h >>> 16) & 0xffff) / 0xffff) * 2 - 1) * jitter;
      positions.set(node.id, {
        x: Math.round(cx + Math.cos(angle) * r + jx),
        y: Math.round(cy + Math.sin(angle) * r * 0.78 + jy),
      });
    });
  });

  return { positions, galaxies };
}

/**
 * Generate the interactive HTML visualization (vis-network): one galaxy per top-level directory,
 * spread across a multiverse layout, in the Linear brand preset.
 * @param {GraphNode[]} nodes
 * @param {GraphEdge[]} edges
 * @returns {string}
 */
function generateHtmlVisualizer(nodes, edges) {
  // Linear-preset semantic node palette: intentional, restrained, software-craft aesthetic
  /** @type {Record<string, { bg: string, border: string, highlight: string }>} */
  const categoryColors = {
    adapters: { bg: "#5e6ad2", border: "#828fff", highlight: "#a5b4fc" }, // Signature Linear Lavender/Indigo
    core: { bg: "#27a644", border: "#4ade80", highlight: "#86efac" }, // Linear Semantic Success Green
    skills: { bg: "#38bdf8", border: "#7dd3fc", highlight: "#bae6fd" }, // Technical Cyan
    scripts: { bg: "#a855f7", border: "#c084fc", highlight: "#e9d5ff" }, // Runtime Purple
    tests: { bg: "#f59e0b", border: "#fbbf24", highlight: "#fef3c7" }, // Test Gold
    commands: { bg: "#f43f5e", border: "#fb7185", highlight: "#ffe4e6" }, // Command Coral
    bin: { bg: "#e11d48", border: "#f43f5e", highlight: "#fda4af" }, // Bin Crimson
    root: { bg: "#62666d", border: "#8a8f98", highlight: "#d0d6e0" }, // Linear Muted Slate
  };

  const { positions, galaxies } = computeGalaxyLayout(nodes);

  // Directories without a fixed color get the next unused palette color (largest galaxy first),
  // so neighbors never share a look-alike color and nothing falls back to gray.
  const usedColors = new Set(
    galaxies.map((g) => categoryColors[g.category]?.bg).filter(Boolean),
  );
  const freePalette = GALAXY_PALETTE.filter((c) => !usedColors.has(c.bg));
  /** @type {Map<string, { bg: string, border: string, highlight: string }>} */
  const assigned = new Map();
  galaxies
    .filter((g) => !categoryColors[g.category])
    .forEach((g, i) => {
      const pool = freePalette.length > 0 ? freePalette : GALAXY_PALETTE;
      assigned.set(g.category, pool[i % pool.length] ?? GALAXY_PALETTE[0]);
    });
  /** @param {string} category */
  const colorOf = (category) =>
    categoryColors[category] ?? assigned.get(category) ?? GALAXY_PALETTE[0];
  const categoryOf = new Map(nodes.map((n) => [n.id, n.category]));

  const visNodes = nodes.map((n) => {
    const col = colorOf(n.category);
    const degree = n.inDegree + n.outDegree;
    const size = Math.max(6, Math.min(30, 6 + degree * 1.6));
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      x: pos.x,
      y: pos.y,
      label: n.label,
      title: `${n.id}\nLines: ${n.lineCount} | In: ${n.inDegree} | Out: ${n.outDegree}`,
      category: n.category,
      value: degree + 1,
      size,
      color: {
        background: col.bg,
        border: col.border,
        highlight: {
          background: col.highlight,
          border: "#ffffff",
        },
      },
      font: {
        color: "#d0d6e0",
        size: 11,
        face: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      // Each star glows in its galaxy color.
      shadow: {
        enabled: true,
        color: `${col.bg}99`,
        size: 10 + Math.min(degree, 20),
        x: 0,
        y: 0,
      },
      raw: n,
    };
  });

  // Edges inside a galaxy are faint star lanes. Edges between galaxies are amber
  // "timeline branches" (TVA style) that arc across the multiverse.
  const visEdges = edges.map((e, idx) => {
    const crossGalaxy = categoryOf.get(e.source) !== categoryOf.get(e.target);
    return {
      id: `e-${idx}`,
      from: e.source,
      to: e.target,
      // The raw import literal that created this edge, so the inspector can
      // show it on an edge click (W-27). One literal per resolved edge: the
      // engine dedupes resolved (from, to) pairs before this point.
      importPath: e.importPath,
      crossGalaxy,
      arrows: { to: { enabled: true, scaleFactor: crossGalaxy ? 0.5 : 0.45 } },
      // Import lines inside a galaxy take the galaxy color so connections stay easy to follow.
      color: crossGalaxy
        ? {
            color: "#f59e0b",
            highlight: "#fde68a",
            hover: "#fbbf24",
            opacity: 0.7,
          }
        : {
            color: colorOf(categoryOf.get(e.source) ?? "root").bg,
            highlight: "#ffffff",
            hover: colorOf(categoryOf.get(e.source) ?? "root").highlight,
            opacity: 0.45,
          },
      dashes: crossGalaxy ? [6, 6] : false,
      smooth: crossGalaxy
        ? { enabled: true, type: "curvedCW", roundness: 0.25 }
        : { enabled: true, type: "continuous", roundness: 0.15 },
      width: crossGalaxy ? 1.4 : 1.2,
      hoverWidth: 0.8,
      selectionWidth: 1.2,
    };
  });

  const galaxyPayload = galaxies.map((g) => ({
    ...g,
    color: colorOf(g.category).bg,
  }));
  // Script-safe payload (B-3): escape <, >, &, U+2028/U+2029 in the
  // serialized JSON so a scanned path containing "</script>" (or any markup)
  // can never break out of the inline data block. JSON.parse semantics are
  // unchanged — these are valid JSON string escapes.
  const dataPayload = JSON.stringify({
    nodes: visNodes,
    edges: visEdges,
    galaxies: galaxyPayload,
  })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  // Vendored vis-network 10.1.5 (B-4): read the pinned standalone UMD build
  // and stylesheet from lib/assets/ (shipped in the package) and inline them
  // below, so graph.html is truly standalone — zero network requests. The
  // only "http(s)://" strings in the library are non-functional license /
  // metadata URLs; they are stripped from the inlined copy so the generated
  // file contains no network references at all. Any "</script" sequence is
  // neutralized for the same reason as the payload above.
  const assetsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "assets");
  const visNetworkJs = fs
    .readFileSync(path.join(assetsDir, "vis-network.min.js"), "utf8")
    .replace(/https?:\/\//g, "")
    .replace(/<\/script/gi, "<\\/script");
  const visNetworkCss = fs
    .readFileSync(path.join(assetsDir, "vis-network.min.css"), "utf8")
    .replace(/https?:\/\//g, "");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>reviewer-harness — Codebase Knowledge Graph</title>
  <!-- vis-network 10.1.5 vendored (lib/assets/), inlined: no CDN, no webfonts, zero network requests. -->
  <style>/* vis-network 10.1.5 (vendored) */
${visNetworkCss}</style>
  <script>/* vis-network 10.1.5 (vendored) */
${visNetworkJs}</script>
  <style>
    /* Linear Brand Preset Tokens */
    :root {
      --canvas: #010102;
      --surface-1: #0f1011;
      --surface-2: #141516;
      --surface-3: #18191a;
      --hairline: #23252a;
      --hairline-strong: #34343a;
      --primary: #5e6ad2;
      --primary-hover: #828fff;
      --ink: #f7f8f8;
      --ink-muted: #d0d6e0;
      --ink-subtle: #8a8f98;
      --ink-tertiary: #82868e;
      --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      --sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--canvas);
      color: var(--ink-muted);
      font-family: var(--sans);
      height: 100vh;
      overflow: hidden;
      display: flex;
      -webkit-font-smoothing: antialiased;
    }

    #network-canvas {
      flex: 1;
      height: 100vh;
      outline: none;
    }

    /* Linear Engineering Sidebar */
    #sidebar {
      width: 380px;
      height: 100vh;
      background: var(--surface-1);
      border-right: 1px solid var(--hairline);
      display: flex;
      flex-direction: column;
      z-index: 10;
    }

    .panel-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--hairline);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-mark {
      width: 24px;
      height: 24px;
      background: var(--primary);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px rgba(94, 106, 210, 0.3);
    }

    .brand-mark svg {
      width: 14px;
      height: 14px;
      fill: #fff;
    }

    .brand-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--ink);
      letter-spacing: -0.4px;
    }

    .badge-linear {
      font-size: 0.65rem;
      font-weight: 500;
      font-family: var(--mono);
      background: var(--surface-2);
      border: 1px solid var(--hairline);
      color: var(--ink-subtle);
      padding: 3px 8px;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }

    .panel-content {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Linear-Style Search Input */
    .search-wrapper {
      position: relative;
    }

    .search-input {
      width: 100%;
      background: var(--surface-2);
      border: 1px solid var(--hairline);
      border-radius: 8px;
      padding: 10px 14px 10px 36px;
      color: var(--ink);
      font-family: var(--sans);
      font-size: 0.82rem;
      outline: none;
      transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
    }

    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(94, 106, 210, 0.25);
    }

    /* Zero-match search feedback (W-28) */
    .search-feedback {
      display: none;
      margin-top: 8px;
      font-size: 0.75rem;
      line-height: 1.4;
      color: var(--ink-subtle);
    }

    .search-wrapper svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      fill: var(--ink-tertiary);
    }

    /* Metric Counters */
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .metric-card {
      background: var(--surface-2);
      border: 1px solid var(--hairline);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-num {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--ink);
      font-family: var(--mono);
      letter-spacing: -0.5px;
    }

    .metric-label {
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--ink-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Category Clusters */
    .section-title {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-subtle);
      margin-bottom: 12px;
    }

    .cluster-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .cluster-chip {
      background: var(--surface-2);
      border: 1px solid var(--hairline);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ink-muted);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      transition: transform 160ms var(--ease-out), border-color 160ms var(--ease-out);
    }

    .cluster-chip:hover {
      border-color: var(--hairline-strong);
      color: var(--ink);
    }

    .cluster-chip:active {
      transform: scale(0.97);
    }

    .chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: box-shadow 160ms var(--ease-out);
    }

    .chip-count {
      font-family: var(--mono);
      font-size: 0.68rem;
      color: var(--ink-tertiary);
    }

    /* Active directory: tinted fill, galaxy-colored border, glowing dot */
    .cluster-chip[aria-pressed="true"] {
      background: color-mix(in srgb, var(--chip-color) 16%, var(--surface-2));
      border-color: var(--chip-color);
      color: var(--ink);
    }

    .cluster-chip[aria-pressed="true"] .chip-dot {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--chip-color) 30%, transparent), 0 0 10px var(--chip-color);
    }

    .cluster-chip[aria-pressed="true"] .chip-count {
      color: var(--ink-muted);
    }

    .cluster-chip:focus-visible {
      outline: 2px solid var(--primary-hover);
      outline-offset: 2px;
    }

    /* AST Node Inspector Panel */
    .inspector-card {
      background: var(--surface-2);
      border: 1px solid var(--hairline);
      border-radius: 8px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .node-header {
      font-family: var(--mono);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ink);
      word-break: break-all;
      line-height: 1.4;
    }

    .node-meta-row {
      display: flex;
      gap: 16px;
      font-size: 0.75rem;
      color: var(--ink-subtle);
      border-bottom: 1px solid var(--hairline);
      padding-bottom: 12px;
    }

    .meta-item strong {
      color: var(--ink);
      font-family: var(--mono);
      font-weight: 500;
    }

    .symbol-category-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-subtle);
      margin-bottom: 6px;
    }

    .symbol-tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .symbol-tag {
      background: var(--surface-3);
      border: 1px solid var(--hairline);
      padding: 3px 8px;
      border-radius: 4px;
      font-family: var(--mono);
      font-size: 0.72rem;
      color: var(--ink-muted);
    }

    .symbol-tag.class {
      border-color: rgba(94, 106, 210, 0.4);
      color: var(--primary-hover);
    }

    .symbol-tag.type {
      border-color: rgba(168, 85, 247, 0.4);
      color: #d8b4fe;
    }

    /* Floating Canvas Command Bar (Linear / Raycast Style) */
    .canvas-viewport {
      flex: 1;
      position: relative;
      height: 100vh;
      overflow: hidden;
    }

    /* Deep-space starfield: three layers of stars at different sizes and densities */
    #network-canvas {
      width: 100%;
      height: 100%;
      outline: none;
      background-color: #020208;
      background-image:
        radial-gradient(1px 1px at 12% 18%, rgba(255, 255, 255, 0.55), transparent 60%),
        radial-gradient(1px 1px at 68% 42%, rgba(255, 255, 255, 0.4), transparent 60%),
        radial-gradient(1.5px 1.5px at 37% 77%, rgba(196, 210, 255, 0.5), transparent 60%),
        radial-gradient(1px 1px at 88% 12%, rgba(255, 236, 200, 0.45), transparent 60%),
        radial-gradient(1px 1px at 54% 91%, rgba(255, 255, 255, 0.35), transparent 60%),
        radial-gradient(ellipse 60% 45% at 50% 50%, rgba(94, 106, 210, 0.08), transparent 70%);
      background-size: 240px 240px, 310px 310px, 420px 420px, 530px 530px, 190px 190px, 100% 100%;
    }

    .floating-toolbar {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 16, 17, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--hairline-strong);
      border-radius: 9999px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      z-index: 50;
      transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out);
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--hairline-strong);
      margin: 0 2px;
    }

    .btn-tool {
      background: transparent;
      border: 1px solid transparent;
      color: var(--ink-muted);
      padding: 8px 14px;
      height: 36px;
      border-radius: 9999px;
      font-family: var(--sans);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      transition: all 160ms var(--ease-out);
    }

    .btn-tool:hover {
      background: var(--surface-3);
      color: var(--ink);
      border-color: var(--hairline);
    }

    .btn-tool:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .btn-tool:active {
      transform: scale(0.96);
    }

    .btn-tool.primary {
      background: var(--primary);
      color: #ffffff;
    }

    .btn-tool.primary:hover {
      background: var(--primary-hover);
      color: #ffffff;
    }

    /* Active toggle state in pill bar */
    .btn-tool[aria-pressed="true"] {
      background: rgba(94, 106, 210, 0.2);
      border-color: rgba(94, 106, 210, 0.5);
      color: var(--ink);
    }

    .btn-tool[aria-pressed="false"] {
      color: var(--ink-subtle);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ink-tertiary);
      transition: background-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
    }

    .btn-tool[aria-pressed="true"] .status-dot {
      background: #27a644;
      box-shadow: 0 0 8px rgba(39, 166, 68, 0.8);
    }

    .btn-tool[aria-pressed="false"] .status-dot {
      background: var(--ink-tertiary);
    }

    .kbd-shortcut {
      font-family: var(--mono);
      font-size: 0.65rem;
      background: var(--surface-3);
      border: 1px solid var(--hairline);
      padding: 1px 5px;
      border-radius: 4px;
      color: var(--ink-subtle);
    }

    /* Reduced motion (W-31): still every CSS transition/animation in the
       chrome; camera flights and physics are gated in the script below. */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    }
  </style>
</head>
<body>

  <aside id="sidebar" aria-label="Graph Navigation Sidebar">
    <div class="panel-header">
      <div class="brand-group">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h1 class="brand-title" style="margin: 0; font-size: 0.95rem;">reviewer-harness Graph</h1>
      </div>
      <span class="badge-linear">Linear Craft</span>
    </div>

    <div class="panel-content">
      <div class="search-wrapper">
        <label for="search-input" class="visually-hidden" style="position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0);">Search Codebase Modules</label>
        <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.98 6 6 0 0 1 8.98 7.922l3.255 3.254a.75.75 0 1 1-1.06 1.06l-3.253-3.256zM11 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0z"/></svg>
        <input type="search" id="search-input" class="search-input" placeholder="Search module, function, or class..." autocomplete="off" />
        <div id="search-feedback" class="search-feedback" role="status" aria-live="polite"></div>
      </div>

      <div class="metric-grid">
        <div class="metric-card">
          <span class="metric-num">${nodes.length}</span>
          <span class="metric-label">Source Nodes</span>
        </div>
        <div class="metric-card">
          <span class="metric-num">${edges.length}</span>
          <span class="metric-label">Dependencies</span>
        </div>
      </div>

      <div>
        <h2 class="section-title">Directory Clusters</h2>
        <div class="cluster-chips" id="legend-container" role="toolbar" aria-label="Directory Clusters"></div>
      </div>

      <section class="inspector-card" id="inspector" aria-live="polite" aria-label="AST Inspector">
        <h2 class="section-title" style="margin-bottom:0;">AST Inspector</h2>
        <div id="inspector-body" style="color: var(--ink-subtle); font-size: 0.8rem; line-height: 1.5;">
          Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.
        </div>
      </section>
    </div>
  </aside>

  <div class="canvas-viewport">
    <main id="network-canvas" aria-label="Interactive Codebase Graph Canvas"></main>

    <!-- Linear / Raycast Floating Command Bar -->
    <nav class="floating-toolbar" role="toolbar" aria-label="Graph Canvas Controls">
      <button type="button" class="btn-tool primary" id="btn-fit" aria-label="Fit View to Screen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        <span>Fit View</span>
      </button>

      <button type="button" class="btn-tool" id="btn-physics" aria-pressed="false" aria-label="Toggle Physics Simulation">
        <span class="status-dot" aria-hidden="true"></span>
        <span id="physics-label">Physics Paused</span>
      </button>

      <div class="toolbar-divider" aria-hidden="true"></div>

      <button type="button" class="btn-tool" id="btn-reset" aria-label="Reset Selection and Zoom">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        <span>Reset</span>
        <span class="kbd-shortcut" aria-hidden="true">ESC</span>
      </button>
    </nav>
  </div>

  <script>
    const payload = ${dataPayload};
    // Escape every scanned-project string before it reaches innerHTML (B-3).
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }
    // Reduced motion (W-31): when the user prefers reduced motion, camera
    // flights (focus / fit / reset) are instant instead of animated, and
    // continuous physics stays off unless the user explicitly toggles it.
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Returns a vis-network animation option: instant (false) under
    // reduced motion, otherwise the requested flight unchanged.
    function cameraAnimation(duration, easingFunction) {
      return prefersReducedMotion ? false : { duration, easingFunction };
    }
    // Physics state lives here (before the network exists) so the
    // visibility handler (W-26) can pause/resume it without a TDZ hazard.
    let isPhysicsActive = false;
    let physicsPausedByVisibility = false;
    const nodes = new vis.DataSet(payload.nodes);
    const edges = new vis.DataSet(payload.edges);
    const container = document.getElementById("network-canvas");

    // Positions come precomputed from the galaxy layout, so physics starts paused.
    // Turning physics on uses Barnes-Hut with zero central gravity, so galaxies never merge into one blob.
    const options = {
      layout: { improvedLayout: false },
      nodes: {
        shape: "dot",
        borderWidth: 1,
        scaling: { label: { enabled: true, min: 9, max: 14, drawThreshold: 7 } }
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.4 } },
        selectionWidth: 1.5
      },
      physics: {
        enabled: false,
        solver: "barnesHut",
        barnesHut: {
          gravitationalConstant: -1800,
          centralGravity: 0,
          springLength: 70,
          springConstant: 0.02,
          damping: 0.6,
          avoidOverlap: 0.4
        },
        stabilization: false
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        hideEdgesOnDrag: false,
        navigationButtons: false,
        zoomView: true
      }
    };

    const network = new vis.Network(container, { nodes, edges }, options);
    network.once("afterDrawing", () => network.fit({ animation: false }));

    // Per-galaxy node membership, computed once (W-26): the draw hook used
    // to re-filter the full node list once per galaxy on every frame.
    const galaxyMembers = new Map(
      payload.galaxies.map(g => [
        g.category,
        payload.nodes.filter(n => n.category === g.category).map(n => n.id),
      ]),
    );

    // Live galaxy centers: the mean position of each directory's nodes, so halos follow dragging.
    function galaxyCenters() {
      const positions = network.getPositions();
      return payload.galaxies.map(g => {
        const ids = galaxyMembers.get(g.category) || [];
        let x = 0, y = 0;
        ids.forEach(id => { x += positions[id].x; y += positions[id].y; });
        return { ...g, x: ids.length ? x / ids.length : g.x, y: ids.length ? y / ids.length : g.y };
      });
    }

    // Cached halo gradients (W-26): a CanvasGradient is rebuilt only when
    // its galaxy's center, radius, color, or highlight state changes —
    // never merely because a new frame is being drawn.
    const gradientCache = new Map();
    function galaxyGlowGradient(ctx, g, isActive, isDimmed) {
      const state = isActive ? "active" : isDimmed ? "dimmed" : "normal";
      const cached = gradientCache.get(g.category);
      if (
        cached &&
        cached.state === state &&
        cached.color === g.color &&
        cached.radius === g.radius &&
        Math.abs(cached.x - g.x) < 0.5 &&
        Math.abs(cached.y - g.y) < 0.5
      ) {
        return cached.gradient;
      }
      const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius * 1.35);
      glow.addColorStop(0, g.color + (isActive ? "40" : isDimmed ? "08" : "22"));
      glow.addColorStop(0.55, g.color + (isActive ? "18" : isDimmed ? "03" : "0c"));
      glow.addColorStop(1, g.color + "00");
      gradientCache.set(g.category, { state, color: g.color, radius: g.radius, x: g.x, y: g.y, gradient: glow });
      return glow;
    }

    // Nebula halo and name label behind each galaxy. The active galaxy glows brighter.
    network.on("beforeDrawing", (ctx) => {
      // Hidden tab (W-26): skip the halo/label draw work entirely.
      if (document.hidden) return;
      galaxyCenters().forEach(g => {
        const isActive = activeCategory === g.category;
        const isDimmed = activeCategory !== null && !isActive;
        const glow = galaxyGlowGradient(ctx, g, isActive, isDimmed);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.radius * 1.35, g.radius * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "600 " + Math.max(14, g.radius * 0.16) + "px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = isDimmed ? "rgba(138, 143, 152, 0.35)" : "rgba(247, 248, 248, 0.85)";
        ctx.fillText(g.category.toUpperCase(), g.x, g.y - g.radius * 1.15);
        ctx.font = "500 " + Math.max(11, g.radius * 0.1) + "px 'JetBrains Mono', monospace";
        ctx.fillStyle = isDimmed ? "rgba(98, 102, 109, 0.35)" : "rgba(138, 143, 152, 0.9)";
        ctx.fillText(g.count + " modules", g.x, g.y - g.radius * 1.15 + Math.max(16, g.radius * 0.13));
      });
    });

    // Directory chips: one active galaxy at a time. Click again, Reset, or Esc to clear.
    let activeCategory = null;
    const legendContainer = document.getElementById("legend-container");
    const chipByCategory = new Map();

    function applyActiveCategory() {
      chipByCategory.forEach((chip, cat) => {
        chip.setAttribute("aria-pressed", cat === activeCategory ? "true" : "false");
      });
      nodes.update(payload.nodes.map(n => ({
        id: n.id,
        opacity: activeCategory === null || n.category === activeCategory ? 1 : 0.12
      })));
      const categoryById = new Map(payload.nodes.map(n => [n.id, n.category]));
      edges.update(payload.edges.map(e => {
        const touches = categoryById.get(e.from) === activeCategory || categoryById.get(e.to) === activeCategory;
        return { id: e.id, hidden: activeCategory !== null && !touches };
      }));
      if (activeCategory === null) {
        network.unselectAll();
        network.fit({ animation: cameraAnimation(500, "easeOutQuad") });
      } else {
        const ids = payload.nodes.filter(n => n.category === activeCategory).map(n => n.id);
        network.fit({ nodes: ids, animation: cameraAnimation(600, "easeInOutQuad") });
      }
    }

    payload.galaxies.forEach(g => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cluster-chip";
      chip.style.setProperty("--chip-color", g.color);
      chip.setAttribute("aria-pressed", "false");
      chip.setAttribute("aria-label", "Show the " + g.category + " galaxy (" + g.count + " modules)");
      chip.innerHTML = \`<span class="chip-dot" style="background:\${escapeHtml(g.color)}" aria-hidden="true"></span>\${escapeHtml(g.category)}<span class="chip-count">\${g.count}</span>\`;
      chip.onclick = () => {
        activeCategory = activeCategory === g.category ? null : g.category;
        applyActiveCategory();
      };
      chipByCategory.set(g.category, chip);
      legendContainer.appendChild(chip);
    });

    // Shareable deep link: graph.html#galaxy=backend opens with that galaxy active.
    const linked = decodeURIComponent((location.hash.match(/^#galaxy=(.+)$/) || [])[1] || "");
    if (chipByCategory.has(linked)) {
      network.once("afterDrawing", () => {
        activeCategory = linked;
        applyActiveCategory();
      });
    }

    // Inspector Click Handler
    network.on("click", (params) => {
      const body = document.getElementById("inspector-body");
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const item = payload.nodes.find(n => n.id === nodeId);
        if (!item) return;
        const raw = item.raw;

        body.innerHTML = \`
          <div class="node-header">\${escapeHtml(item.id)}</div>
          <div class="node-meta-row">
            <span class="meta-item">Lines: <strong>\${raw.lineCount}</strong></span>
            <span class="meta-item">Inbound: <strong>\${raw.inDegree}</strong></span>
            <span class="meta-item">Outbound: <strong>\${raw.outDegree}</strong></span>
          </div>

          <div>
            <div class="symbol-category-label">Classes (\${raw.classes.length})</div>
            <div class="symbol-tag-list">
              \${raw.classes.map(c => \`<span class="symbol-tag class">\${escapeHtml(c)}</span>\`).join("") || "<span style='color:var(--ink-tertiary); font-size:0.75rem;'>None</span>"}
            </div>
          </div>

          <div>
            <div class="symbol-category-label">Functions (\${raw.functions.length})</div>
            <div class="symbol-tag-list">
              \${raw.functions.slice(0, 8).map(f => \`<span class="symbol-tag">\${escapeHtml(f)}</span>\`).join("") || "<span style='color:var(--ink-tertiary); font-size:0.75rem;'>None</span>"}
              \${raw.functions.length > 8 ? \`<span style='color:var(--ink-tertiary); font-size:0.72rem; align-self:center;'>+\${raw.functions.length - 8} more</span>\` : ""}
            </div>
          </div>

          <div>
            <div class="symbol-category-label">Types & Interfaces (\${raw.types.length})</div>
            <div class="symbol-tag-list">
              \${raw.types.map(t => \`<span class="symbol-tag type">\${escapeHtml(t)}</span>\`).join("") || "<span style='color:var(--ink-tertiary); font-size:0.75rem;'>None</span>"}
            </div>
          </div>
        \`;
      } else if (params.edges && params.edges.length > 0) {
        // Edge inspection (W-27): show the dependency this edge represents —
        // its from -> to modules, direction, and the import literal that
        // created it (the payload carries one literal per resolved edge).
        const edge = payload.edges.find(e => e.id === params.edges[0]);
        if (!edge) {
          body.innerHTML = "Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.";
          return;
        }
        const fromNode = payload.nodes.find(n => n.id === edge.from);
        const toNode = payload.nodes.find(n => n.id === edge.to);
        const importLiteral = edge.importPath || edge.importLiteral || null;

        body.innerHTML = \`
          <div class="node-header">\${escapeHtml(edge.from)} &rarr; \${escapeHtml(edge.to)}</div>
          <div class="node-meta-row">
            <span class="meta-item">From: <strong>\${escapeHtml(fromNode ? fromNode.category : "unknown")}</strong></span>
            <span class="meta-item">To: <strong>\${escapeHtml(toNode ? toNode.category : "unknown")}</strong></span>
            <span class="meta-item">Scope: <strong>\${edge.crossGalaxy ? "Cross-galaxy" : "Same galaxy"}</strong></span>
          </div>

          <div>
            <div class="symbol-category-label">Dependency Direction</div>
            <div style="font-size:0.8rem; line-height:1.5; color:var(--ink-subtle);">
              \${escapeHtml(edge.from)} imports \${escapeHtml(edge.to)}
            </div>
          </div>

          \${importLiteral ? \`
          <div>
            <div class="symbol-category-label">Import</div>
            <div class="symbol-tag-list">
              <span class="symbol-tag">\${escapeHtml(importLiteral)}</span>
            </div>
          </div>\` : ""}
        \`;
      } else {
        body.innerHTML = "Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.";
      }
    });

    // Live Search with Defensive Input Debouncing (W-28): the scan + camera
    // focus runs once, 200ms after the last keystroke (debounce delay:
    // 200ms), instead of rescanning the payload and restarting a camera
    // flight on every keystroke. Zero matches get visible feedback.
    const searchInput = document.getElementById("search-input");
    const searchFeedback = document.getElementById("search-feedback");
    const SEARCH_DEBOUNCE_MS = 200;
    let searchDebounceTimer = null;

    function clearSearchFeedback() {
      searchFeedback.textContent = "";
      searchFeedback.style.display = "none";
    }

    function cancelPendingSearch() {
      if (searchDebounceTimer !== null) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }
      clearSearchFeedback();
    }

    searchInput.addEventListener("input", (e) => {
      const rawQuery = e.target.value;
      if (searchDebounceTimer !== null) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        searchDebounceTimer = null;
        const q = rawQuery.toLowerCase().trim();
        if (!q) {
          network.unselectAll();
          clearSearchFeedback();
          return;
        }
        const match = payload.nodes.filter(n =>
          n.id.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          n.raw.functions.some(f => f.toLowerCase().includes(q)) ||
          n.raw.classes.some(c => c.toLowerCase().includes(q))
        );
        if (match.length > 0) {
          clearSearchFeedback();
          network.selectNodes(match.map(n => n.id));
          network.focus(match[0].id, { scale: 1.15, animation: cameraAnimation(400, "easeInOutQuad") });
        } else {
          network.unselectAll();
          searchFeedback.textContent = "No module matches \\"" + rawQuery.trim() + "\\"";
          searchFeedback.style.display = "block";
        }
      }, SEARCH_DEBOUNCE_MS);
    });

    // Control Buttons: Fit View
    document.getElementById("btn-fit").onclick = () => {
      network.fit({ animation: cameraAnimation(500, "easeOutQuad") });
    };

    // Toggle Physics with Explicit Accessible Active State
    // (isPhysicsActive is declared above, before the network is created.)
    const physicsBtn = document.getElementById("btn-physics");
    const physicsLabel = document.getElementById("physics-label");

    function syncPhysicsToggleUi() {
      physicsBtn.setAttribute("aria-pressed", isPhysicsActive ? "true" : "false");
      physicsLabel.textContent = isPhysicsActive ? "Physics Active" : "Physics Paused";
    }

    // Stop physics and restore the toggle to its off state (S-36).
    function stopPhysics() {
      isPhysicsActive = false;
      physicsPausedByVisibility = false;
      network.setOptions({ physics: { enabled: false } });
      syncPhysicsToggleUi();
    }

    physicsBtn.onclick = () => {
      isPhysicsActive = !isPhysicsActive;
      network.setOptions({ physics: { enabled: isPhysicsActive } });
      syncPhysicsToggleUi();
    };

    // Hidden-tab pause (W-26): while the document is hidden, pause the
    // physics solver (which also pauses stabilization) and resume it on
    // return only if it was running and the user has not stopped it.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (isPhysicsActive) {
          physicsPausedByVisibility = true;
          network.setOptions({ physics: { enabled: false } });
        }
      } else if (physicsPausedByVisibility) {
        physicsPausedByVisibility = false;
        if (isPhysicsActive) {
          network.setOptions({ physics: { enabled: true } });
        }
      }
    });

    // Reset View & Form — also stops a running physics simulation (S-36)
    // and cancels any pending debounced search.
    document.getElementById("btn-reset").onclick = () => {
      stopPhysics();
      cancelPendingSearch();
      activeCategory = null;
      applyActiveCategory();
      searchInput.value = "";
      document.getElementById("inspector-body").innerHTML = "Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.";
    };

    // Keyboard Accessibility: Escape key clears selection (the Reset
    // button's ESC shortcut, so it shares Reset's physics stop — S-36)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        stopPhysics();
        cancelPendingSearch();
        if (activeCategory !== null) {
          activeCategory = null;
          applyActiveCategory();
        }
        network.unselectAll();
        searchInput.value = "";
        searchInput.blur();
        document.getElementById("inspector-body").innerHTML = "Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.";
      }
    });
  </script>
</body>
</html>
`;
}

/**
 * Generate Markdown report summary.
 * @param {GraphNode[]} nodes
 * @param {GraphEdge[]} edges
 * @param {string[][]} cycles
 * @returns {string}
 */
function generateMarkdownReport(nodes, edges, cycles, skippedFiles = []) {
  const sortedByDegree = [...nodes].sort(
    (a, b) => b.inDegree + b.outDegree - (a.inDegree + a.outDegree),
  );

  const topHubs = sortedByDegree.slice(0, 10);
  const isolated = nodes.filter((n) => n.inDegree === 0 && n.outDegree === 0);

  const totalLines = nodes.reduce((sum, n) => sum + n.lineCount, 0);

  return `# Codebase Knowledge Graph Report

> Generated by reviewer-harness Knowledge Graph Engine.
> Timestamp: ${new Date().toISOString()}

## System Overview

- **Total Analyzed Files (Nodes)**: ${nodes.length}
- **Total Dependencies (Edges)**: ${edges.length}
- **Total Lines of Code**: ${totalLines}
- **Detected Cycles**: ${cycles.length}
- **Isolated Modules**: ${isolated.length}
- **Files Skipped (over MAX_FILE_BYTES = ${MAX_FILE_BYTES} bytes, 2 MB per file)**: ${skippedFiles.length}${skippedFiles.length ? " — " + skippedFiles.map((f) => "`" + f + "`").join(", ") : ""}

---

## High-Connectivity Hub Nodes (Top 10)

Files with the highest fan-in and fan-out:

| Module Path | Category | Inbound | Outbound | Total Degree | Lines |
| :--- | :--- | :--- | :--- | :--- | :--- |
${topHubs
  .map(
    (n) =>
      `| \`${n.id}\` | ${n.category} | ${n.inDegree} | ${n.outDegree} | **${n.inDegree + n.outDegree}** | ${n.lineCount} |`,
  )
  .join("\n")}

---

## Architectural Health & Circular Dependencies

${
  cycles.length === 0
    ? nodes.length === 0
      ? "- **Circular Dependencies**: no files were analyzed — nothing to assess. (0 source files found; is this the right directory?)"
      : "- **Circular Dependencies**: 0 cycles detected. Clean acyclic hierarchy."
    : `### Detected Cycles (${cycles.length})\n\n` +
      cycles
        .map((c, i) => `${i + 1}. ${c.map((p) => `\`${p}\``).join(" -> ")}`)
        .join("\n")
}

---

## Interactive Visualization

Open the visual graph interface in any browser:

\`\`\`bash
# Open directly in browser
start .reviewer-harness/graph/graph.html
\`\`\`
`;
}

/**
 * Main execution routine for generating codebase knowledge graph.
 * @param {string} targetDir
 * @param {Object} options
 * @param {string} [options.outputDir]
 * @returns {{ nodes: GraphNode[], edges: GraphEdge[], cycles: string[][] }}
 */
export function buildCodebaseGraph(targetDir, options = {}) {
  const rootDir = path.resolve(targetDir);
  const outputDirectory = options.outputDir
    ? path.resolve(options.outputDir)
    : path.join(rootDir, ".reviewer-harness", "graph");

  // Per-run caches (W-11): rebuild alias/workspace/resolution caches on
  // every run so a tsconfig or package edit between in-process runs can
  // never leak stale edges into the next graph. Within-run reuse is kept.
  aliasCache.clear();
  workspaceCache.clear();
  resolveCache.clear();

  const filePaths = scanSourceFiles(rootDir, rootDir);

  // Total size/count guards (W-10): fail loudly and name the limit instead
  // of OOM-ing on projects far beyond what one run can hold.
  if (filePaths.length > MAX_TOTAL_FILES) {
    throw new Error(
      `Project too large: ${filePaths.length} source files exceeds the MAX_TOTAL_FILES limit of ${MAX_TOTAL_FILES}. Narrow the target directory and try again.`,
    );
  }
  let totalBytes = 0;
  for (const filePath of filePaths) {
    try {
      totalBytes += fs.statSync(filePath).size;
    } catch {
      // Unreadable files surface their error during parsing, as before.
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new Error(
        `Project too large: total source size exceeds the MAX_TOTAL_BYTES limit of ${MAX_TOTAL_BYTES} bytes (500 MB). Narrow the target directory and try again.`,
      );
    }
  }

  const nodeMap = new Map();
  const parsedFiles = [];
  /** @type {string[]} */
  const skippedFiles = [];

  for (const filePath of filePaths) {
    const parsed = parseFileSymbols(filePath, rootDir);
    if (parsed.skipped) skippedFiles.push(parsed.node.id);
    nodeMap.set(parsed.node.id, parsed.node);
    parsedFiles.push(parsed);
  }

  const edges = [];
  // Resolved-edge dedupe (S-27): two spellings of one target ("./b" and
  // "./b.js") are one logical dependency — one edge, one degree count.
  const seenEdgePairs = new Set();

  for (const { node, rawImports } of parsedFiles) {
    for (const rawImport of rawImports) {
      const resolvedTarget = resolveImport(
        node.id,
        rawImport,
        nodeMap,
        rootDir,
      );
      if (resolvedTarget && resolvedTarget !== node.id) {
        const pairKey = node.id + "\0" + resolvedTarget;
        if (seenEdgePairs.has(pairKey)) continue;
        seenEdgePairs.add(pairKey);
        edges.push({
          source: node.id,
          target: resolvedTarget,
          importPath: rawImport,
        });

        node.outDegree += 1;
        const targetNode = nodeMap.get(resolvedTarget);
        if (targetNode) {
          targetNode.inDegree += 1;
        }
      }
    }
  }

  const nodes = Array.from(nodeMap.values());
  const cycles = detectCycles(nodeMap, edges);

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  // Artifact writes go through writeSafe (W-12): temp file + fsync +
  // rename, so a failed run can never leave a truncated artifact behind.
  // 1. graph.json
  const graphJsonPath = path.join(outputDirectory, "graph.json");
  writeSafe(
    graphJsonPath,
    JSON.stringify(
      {
        nodes,
        edges,
        cycles,
        skippedFiles,
        skippedCount: skippedFiles.length,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // 2. graph-report.md
  const graphReportPath = path.join(outputDirectory, "graph-report.md");
  writeSafe(
    graphReportPath,
    generateMarkdownReport(nodes, edges, cycles, skippedFiles),
  );

  // 3. graph.html
  const graphHtmlPath = path.join(outputDirectory, "graph.html");
  writeSafe(graphHtmlPath, generateHtmlVisualizer(nodes, edges));

  return { nodes, edges, cycles, skippedFiles };
}
