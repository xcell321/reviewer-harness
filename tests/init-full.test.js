// tests/init-full.test.js — init v2 (v1.17): one command, everything
// installed, adapted to the project (modeled on GitHub Spec Kit's
// `specify init`). Fixtures live in temp dirs, never in the repo.
// No version literal is hardcoded anywhere in this file — a version
// bump must never be able to stale these tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { detectProject } from "../lib/detect.js";
import { initFull, initProject } from "../lib/init.js";
import { listBundledSkills } from "../lib/skills.js";
import { listBundledAgents } from "../lib/agents.js";
import { listBundledCommands } from "../lib/commands.js";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));

function tempDir() {
  return mkdtempSync(join(tmpdir(), "rh-init-full-"));
}

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

  // Skill files on disk — one per bundled skill, fix-team included.
  const skillFiles = readdirSync(join(dir, "skills")).filter((f) => f.endsWith(".md"));
  assert.equal(skillFiles.length, bundledSkills.length);
  assert.ok(existsSync(join(dir, "skills", "fix-team.md")));

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
  assert.ok(existsSync(join(dir, "skills", "fix-team.md")));
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
  assert.equal(after.skills.length, listBundledSkills().length);
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

test("CLI init: full setup in one command, with a receipt", () => {
  const dir = tempDir();
  writeReactFixture(dir);
  const res = runCli(["init"], dir);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /Project: demo-app/);
  assert.match(res.stdout, /Skills : \d+ installed/);
  assert.match(res.stdout, /Done — everything is installed/);
  assert.ok(existsSync(join(dir, "skills", "fix-team.md")));
  assert.equal(readConfig(dir).skills.length, listBundledSkills().length);
});
