// lib/detect.js — project detection for `init` (v1.17).
//
// Modeled on GitHub Spec Kit's `specify init`: before installing
// anything, READ the project and adapt to it. Detection is read-only
// and never throws on a broken manifest — a manifest that cannot be
// parsed simply yields no detection for that stack, and init falls
// back to the generic setup. Whatever the project is — a React app,
// a Laravel API, a Go CLI, an empty folder — init meets it where
// it is, from evidence in the project itself, never from a guess.

import { existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readTextSafe(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// The first plain line of the README: skip headings, badges, images,
// HTML, and blank lines — the first real sentence a human wrote
// about the project is usually its goal.
function readmeGoal(dir) {
  const text = readTextSafe(join(dir, "README.md"));
  if (!text) return null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (
      line.startsWith("#") ||
      line.startsWith("!") ||
      line.startsWith("[![") ||
      line.startsWith("<")
    )
      continue;
    return line.length > 200 ? line.slice(0, 197).trimEnd() + "…" : line;
  }
  return null;
}

const NODE_FRAMEWORKS = [
  ["next", "Next.js"],
  ["react", "React"],
  ["vue", "Vue"],
  ["@angular/core", "Angular"],
  ["svelte", "Svelte"],
  ["@nestjs/core", "NestJS"],
  ["express", "Express"],
  ["fastify", "Fastify"],
];

function detectNode(dir, pkg) {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  let framework = null;
  for (const [key, label] of NODE_FRAMEWORKS) {
    if (key in deps) {
      framework = label;
      break;
    }
  }
  const language =
    "typescript" in deps || existsSync(join(dir, "tsconfig.json"))
      ? "TypeScript"
      : "JavaScript";

  let packageManager = "npm";
  if (typeof pkg.packageManager === "string" && pkg.packageManager.includes("@")) {
    packageManager = pkg.packageManager.split("@")[0];
  } else if (existsSync(join(dir, "pnpm-lock.yaml"))) packageManager = "pnpm";
  else if (existsSync(join(dir, "yarn.lock"))) packageManager = "yarn";
  else if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bun.lockb")))
    packageManager = "bun";

  // The project's REAL validation commands, from its own scripts —
  // so the harness's "run the tests" rule can name them exactly.
  const validation = {};
  const scripts = pkg.scripts ?? {};
  if (scripts.test) validation.test = `${packageManager} test`;
  if (scripts.lint) validation.lint = `${packageManager} run lint`;
  if (scripts.build) validation.build = `${packageManager} run build`;

  return { language, framework, packageManager, validation };
}

function detectPhp(composer) {
  const req = composer.require ?? {};
  const framework =
    "laravel/framework" in req
      ? "Laravel"
      : "symfony/framework-bundle" in req || "symfony/console" in req
        ? "Symfony"
        : null;
  const validation = {};
  const scripts = composer.scripts ?? {};
  if (scripts.test) validation.test = "composer test";
  if (scripts.lint) validation.lint = "composer lint";
  if (scripts.build) validation.build = "composer build";
  return { language: "PHP", framework, packageManager: "composer", validation };
}

function detectPython(dir) {
  const text = (
    (readTextSafe(join(dir, "requirements.txt")) ?? "") +
    "\n" +
    (readTextSafe(join(dir, "pyproject.toml")) ?? "")
  ).toLowerCase();
  const framework = text.includes("django")
    ? "Django"
    : text.includes("fastapi")
      ? "FastAPI"
      : text.includes("flask")
        ? "Flask"
        : null;
  const validation = {};
  if (text.includes("pytest")) validation.test = "pytest";
  return { language: "Python", framework, packageManager: "pip", validation };
}

// Detect what a project is, from its own files. Returns:
//   name            — manifest name, else the folder name
//   stack           — { language, framework, packageManager } (nulls allowed)
//   validation      — { test?, lint?, build? } real command strings
//   goal            — manifest description, else the README's first
//                     plain line, else null
//   runtimesPresent — runtime config traces already in the project
export function detectProject(dir) {
  const pkg = readJsonSafe(join(dir, "package.json"));
  const composer = readJsonSafe(join(dir, "composer.json"));

  let name = null;
  let stack = { language: null, framework: null, packageManager: null };
  let validation = {};

  if (pkg) {
    if (typeof pkg.name === "string" && pkg.name) name = pkg.name;
    const d = detectNode(dir, pkg);
    stack = {
      language: d.language,
      framework: d.framework,
      packageManager: d.packageManager,
    };
    validation = d.validation;
  } else if (composer) {
    const raw = typeof composer.name === "string" ? composer.name : null;
    if (raw) name = raw.split("/").pop();
    const d = detectPhp(composer);
    stack = {
      language: d.language,
      framework: d.framework,
      packageManager: d.packageManager,
    };
    validation = d.validation;
  } else if (
    existsSync(join(dir, "requirements.txt")) ||
    existsSync(join(dir, "pyproject.toml"))
  ) {
    const d = detectPython(dir);
    stack = {
      language: d.language,
      framework: d.framework,
      packageManager: d.packageManager,
    };
    validation = d.validation;
  } else if (existsSync(join(dir, "go.mod"))) {
    stack = { language: "Go", framework: null, packageManager: "go" };
    validation = { test: "go test ./..." };
  } else if (existsSync(join(dir, "Cargo.toml"))) {
    stack = { language: "Rust", framework: null, packageManager: "cargo" };
    validation = { test: "cargo test" };
  }

  if (!name) name = basename(dir);

  const goal =
    (pkg && typeof pkg.description === "string" && pkg.description) ||
    (composer && typeof composer.description === "string" && composer.description) ||
    readmeGoal(dir) ||
    null;

  const runtimesPresent = [];
  if (existsSync(join(dir, ".opencode"))) runtimesPresent.push("opencode");
  if (existsSync(join(dir, ".claude"))) runtimesPresent.push("claude");
  if (existsSync(join(dir, ".gemini"))) runtimesPresent.push("gemini");
  if (existsSync(join(dir, ".github", "copilot-instructions.md")))
    runtimesPresent.push("copilot");

  return { name, stack, validation, goal, runtimesPresent };
}
