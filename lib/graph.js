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

import fs from "node:fs";
import path from "node:path";

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

/**
 * Recursively find all supported code files in target directory.
 * @param {string} directory
 * @param {string} rootDir
 * @returns {string[]}
 */
export function scanSourceFiles(directory, rootDir = directory) {
  const results = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Agent worktrees (.claude/worktrees) are full repository copies and would duplicate every module.
      const isAgentWorktrees =
        entry.name === "worktrees" && path.basename(directory) === ".claude";
      if (!IGNORED_DIRECTORIES.has(entry.name) && !isAgentWorktrees) {
        results.push(
          ...scanSourceFiles(path.join(directory, entry.name), rootDir),
        );
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
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const lineCount = lines.length;
  const ext = path.extname(filePath).toLowerCase();

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
    const importRegex =
      /(?:import\s+(?:[\s\S]*?from\s+)?|export\s+(?:[\s\S]*?from\s+))["']([^"']+)["']/g;
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

  /**
   * @param {string} current
   * @param {string[]} pathStack
   */
  function dfs(current, pathStack) {
    visited.add(current);
    recStack.add(current);
    pathStack.push(current);

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, pathStack);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = pathStack.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          cycles.push(pathStack.slice(cycleStartIndex).concat(neighbor));
        }
      }
    }

    pathStack.pop();
    recStack.delete(current);
  }

  for (const id of nodeMap.keys()) {
    if (!visited.has(id)) {
      dfs(id, []);
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
  const largest = groups.length > 0 ? radiusOf(groups[0][1].length) : 0;
  /** @type {Map<string, { x: number, y: number }>} */
  const positions = new Map();
  /** @type {Array<{ category: string, x: number, y: number, radius: number, count: number }>} */
  const galaxies = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  groups.forEach(([category, members], index) => {
    const radius = radiusOf(members.length);
    // Galaxy centers follow a golden-angle spiral. Spacing grows with the largest galaxy so none overlap.
    const distance =
      index === 0 ? 0 : (largest + radius) * 1.35 * Math.sqrt(index);
    const theta =
      index * goldenAngle +
      (hashString(category) % 360) * (Math.PI / 180) * 0.15;
    const cx = Math.cos(theta) * distance;
    const cy = Math.sin(theta) * distance;
    galaxies.push({ category, x: cx, y: cy, radius, count: members.length });

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
  const dataPayload = JSON.stringify({
    nodes: visNodes,
    edges: visEdges,
    galaxies: galaxyPayload,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>reviewer-harness — Codebase Knowledge Graph</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/vis-network@10.1.5/styles/vis-network.min.css" />
  <script src="https://unpkg.com/vis-network@10.1.5/standalone/umd/vis-network.min.js"></script>
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
      --ink-tertiary: #62666d;
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

    // Live galaxy centers: the mean position of each directory's nodes, so halos follow dragging.
    function galaxyCenters() {
      const positions = network.getPositions();
      return payload.galaxies.map(g => {
        const ids = payload.nodes.filter(n => n.category === g.category).map(n => n.id);
        let x = 0, y = 0;
        ids.forEach(id => { x += positions[id].x; y += positions[id].y; });
        return { ...g, x: ids.length ? x / ids.length : g.x, y: ids.length ? y / ids.length : g.y };
      });
    }

    // Nebula halo and name label behind each galaxy. The active galaxy glows brighter.
    network.on("beforeDrawing", (ctx) => {
      galaxyCenters().forEach(g => {
        const isActive = activeCategory === g.category;
        const isDimmed = activeCategory !== null && !isActive;
        const glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius * 1.35);
        glow.addColorStop(0, g.color + (isActive ? "40" : isDimmed ? "08" : "22"));
        glow.addColorStop(0.55, g.color + (isActive ? "18" : isDimmed ? "03" : "0c"));
        glow.addColorStop(1, g.color + "00");
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
        network.fit({ animation: { duration: 500, easingFunction: "easeOutQuad" } });
      } else {
        const ids = payload.nodes.filter(n => n.category === activeCategory).map(n => n.id);
        network.fit({ nodes: ids, animation: { duration: 600, easingFunction: "easeInOutQuad" } });
      }
    }

    payload.galaxies.forEach(g => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cluster-chip";
      chip.style.setProperty("--chip-color", g.color);
      chip.setAttribute("aria-pressed", "false");
      chip.setAttribute("aria-label", "Show the " + g.category + " galaxy (" + g.count + " modules)");
      chip.innerHTML = \`<span class="chip-dot" style="background:\${g.color}" aria-hidden="true"></span>\${g.category}<span class="chip-count">\${g.count}</span>\`;
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
          <div class="node-header">\${item.id}</div>
          <div class="node-meta-row">
            <span class="meta-item">Lines: <strong>\${raw.lineCount}</strong></span>
            <span class="meta-item">Inbound: <strong>\${raw.inDegree}</strong></span>
            <span class="meta-item">Outbound: <strong>\${raw.outDegree}</strong></span>
          </div>

          <div>
            <div class="symbol-category-label">Classes (\${raw.classes.length})</div>
            <div class="symbol-tag-list">
              \${raw.classes.map(c => \`<span class="symbol-tag class">\${c}</span>\`).join("") || "<span style='color:var(--ink-tertiary); font-size:0.75rem;'>None</span>"}
            </div>
          </div>

          <div>
            <div class="symbol-category-label">Functions (\${raw.functions.length})</div>
            <div class="symbol-tag-list">
              \${raw.functions.slice(0, 8).map(f => \`<span class="symbol-tag">\${f}</span>\`).join("") || "<span style='color:var(--ink-tertiary); font-size:0.75rem;'>None</span>"}
              \${raw.functions.length > 8 ? \`<span style='color:var(--ink-tertiary); font-size:0.72rem; align-self:center;'>+\${raw.functions.length - 8} more</span>\` : ""}
            </div>
          </div>

          <div>
            <div class="symbol-category-label">Types & Interfaces (\${raw.types.length})</div>
            <div class="symbol-tag-list">
              \${raw.types.map(t => \`<span class="symbol-tag type">\${t}</span>\`).join("") || "<span style='color:var(--ink-tertiary); font-size:0.75rem;'>None</span>"}
            </div>
          </div>
        \`;
      } else {
        body.innerHTML = "Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.";
      }
    });

    // Live Search with Defensive Input Debouncing
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        network.unselectAll();
        return;
      }
      const match = payload.nodes.filter(n =>
        n.id.toLowerCase().includes(q) ||
        n.label.toLowerCase().includes(q) ||
        n.raw.functions.some(f => f.toLowerCase().includes(q)) ||
        n.raw.classes.some(c => c.toLowerCase().includes(q))
      );
      if (match.length > 0) {
        network.selectNodes(match.map(n => n.id));
        network.focus(match[0].id, { scale: 1.15, animation: { duration: 400, easingFunction: "easeInOutQuad" } });
      }
    });

    // Control Buttons: Fit View
    document.getElementById("btn-fit").onclick = () => {
      network.fit({ animation: { duration: 500, easingFunction: "easeOutQuad" } });
    };

    // Toggle Physics with Explicit Accessible Active State
    let isPhysicsActive = false;
    const physicsBtn = document.getElementById("btn-physics");
    const physicsLabel = document.getElementById("physics-label");

    physicsBtn.onclick = () => {
      isPhysicsActive = !isPhysicsActive;
      network.setOptions({ physics: { enabled: isPhysicsActive } });
      physicsBtn.setAttribute("aria-pressed", isPhysicsActive ? "true" : "false");
      physicsLabel.textContent = isPhysicsActive ? "Physics Active" : "Physics Paused";
    };

    // Reset View & Form
    document.getElementById("btn-reset").onclick = () => {
      activeCategory = null;
      applyActiveCategory();
      searchInput.value = "";
      document.getElementById("inspector-body").innerHTML = "Click any module node or directional edge in the canvas to inspect its AST declarations, fan-in, and fan-out.";
    };

    // Keyboard Accessibility: Escape key clears selection
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
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
function generateMarkdownReport(nodes, edges, cycles) {
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
    ? "- **Circular Dependencies**: 0 cycles detected. Clean acyclic hierarchy."
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

  const filePaths = scanSourceFiles(rootDir, rootDir);

  const nodeMap = new Map();
  const parsedFiles = [];

  for (const filePath of filePaths) {
    const parsed = parseFileSymbols(filePath, rootDir);
    nodeMap.set(parsed.node.id, parsed.node);
    parsedFiles.push(parsed);
  }

  const edges = [];

  for (const { node, rawImports } of parsedFiles) {
    for (const rawImport of rawImports) {
      const resolvedTarget = resolveImport(
        node.id,
        rawImport,
        nodeMap,
        rootDir,
      );
      if (resolvedTarget && resolvedTarget !== node.id) {
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

  // 1. graph.json
  const graphJsonPath = path.join(outputDirectory, "graph.json");
  fs.writeFileSync(
    graphJsonPath,
    JSON.stringify(
      { nodes, edges, cycles, timestamp: new Date().toISOString() },
      null,
      2,
    ),
    "utf8",
  );

  // 2. graph-report.md
  const graphReportPath = path.join(outputDirectory, "graph-report.md");
  fs.writeFileSync(
    graphReportPath,
    generateMarkdownReport(nodes, edges, cycles),
    "utf8",
  );

  // 3. graph.html
  const graphHtmlPath = path.join(outputDirectory, "graph.html");
  fs.writeFileSync(graphHtmlPath, generateHtmlVisualizer(nodes, edges), "utf8");

  return { nodes, edges, cycles };
}
