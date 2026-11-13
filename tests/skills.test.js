// tests/skills.test.js — Tasks 10–12 (agent 6, backend).
// Built-in node:test only, zero dependencies. Run: node --test tests/skills.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSkills,
  addSkill,
  removeSkill,
  loadBundledSkills,
  listBundledSkills,
  skillCommandContent,
  skillBundleContent,
  yamlQuote,
} from "../lib/skills.js";
import { addAgent, listBundledAgents } from "../lib/agents.js";
import { addCommand, listBundledCommands } from "../lib/commands.js";

function makeTempDir() {
  return mkdtempSync(join(tmpdir(), "harness-skills-"));
}

// Repo root (this test file lives in <root>/tests/).
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function writeConfig(dir, skills = []) {
  const config = { name: "t", rules: ["Do x."], runtimes: [], skills };
  writeFileSync(join(dir, "harness.config.json"), JSON.stringify(config, null, 2));
  return config;
}

// Capture console.warn output while fn runs; returns the joined warnings.
function captureWarnings(fn) {
  const seen = [];
  const orig = console.warn;
  console.warn = (...args) => seen.push(args.join(" "));
  try {
    fn();
  } finally {
    console.warn = orig;
  }
  return seen.join("\n");
}

// ---------- Task 10: name allowlist + containment (F-B3, F-W1) ----------

test("traversal names are rejected everywhere", () => {
  const root = makeTempDir();
  const proj = join(root, "proj");
  mkdirSync(proj, { recursive: true });
  writeConfig(proj, []);

  // loadSkills must not read outside the project: a victim file sits
  // one level above the project, reachable via "../../evil.md".
  writeFileSync(join(root, "evil.md"), "VICTIM CONTENT — must never be read\n");
  assert.throws(
    () => loadSkills(proj, { skills: ["../../evil"] }),
    /Invalid skill name "\.\.\/\.\.\/evil"/
  );
  assert.equal(readFileSync(join(root, "evil.md"), "utf8"), "VICTIM CONTENT — must never be read\n");

  // addSkill / addAgent / addCommand: the bad name itself is the error,
  // not "No bundled skill named ..." (the pre-fix message).
  assert.throws(() => addSkill("../../../evil", proj), /Invalid skill name/);
  assert.throws(() => addAgent("../x", proj), /Invalid agent name/);
  assert.throws(() => addCommand("../x", proj), /Invalid command name/);

  // removeSkill must not delete outside the project.
  writeFileSync(join(root, "victim.md"), "VICTIM — must survive\n");
  assert.throws(() => removeSkill("../../victim", proj), /Invalid skill name/);
  assert.equal(existsSync(join(root, "victim.md")), true);
  assert.equal(readFileSync(join(root, "victim.md"), "utf8"), "VICTIM — must survive\n");
});

test("remove requires the skill to be enabled and rewrites config after the delete", () => {
  const dir = makeTempDir();
  const skillsDir = join(dir, "skills");
  mkdirSync(skillsDir, { recursive: true });

  // Not enabled: the file must survive, the config must be untouched.
  writeConfig(dir, []);
  writeFileSync(join(skillsDir, "debug-first.md"), "MY INSTALLED COPY\n");
  const notEnabled = removeSkill("debug-first", dir);
  assert.deepEqual(notEnabled, { wasEnabled: false, removedFile: false });
  assert.equal(existsSync(join(skillsDir, "debug-first.md")), true);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8")).skills, []);

  // Enabled: the file is deleted first, then the config is rewritten.
  writeConfig(dir, ["debug-first"]);
  const removed = removeSkill("debug-first", dir);
  assert.deepEqual(removed, { wasEnabled: true, removedFile: true });
  assert.equal(existsSync(join(skillsDir, "debug-first.md")), false);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8")).skills, []);

  // Delete throws: the config must still list the skill (delete first,
  // rewrite after). A non-empty directory named <name>.md makes rmSync throw.
  writeConfig(dir, ["debug-first"]);
  const blocked = join(skillsDir, "debug-first.md");
  mkdirSync(blocked);
  writeFileSync(join(blocked, "inner.txt"), "blocks the delete\n");
  assert.throws(() => removeSkill("debug-first", dir), /EISDIR/);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "harness.config.json"), "utf8")).skills, [
    "debug-first",
  ]);
});

test("empty, Unicode, and 300-char names are rejected", () => {
  const dir = makeTempDir();
  for (const name of ["", "café", "a".repeat(300)]) {
    assert.throws(() => loadSkills(dir, { skills: [name] }), /Invalid skill name/);
    assert.throws(() => addSkill(name, dir), /Invalid skill name/);
  }
});

// ---------- Task 11: installers reuse writeSafe, warn on modified files (F-B4) ----------

test("add preserves a user-edited skill file", () => {
  const dir = makeTempDir();
  const dest = join(dir, "skills", "quality", "safe-editing.md");
  mkdirSync(join(dir, "skills", "quality"), { recursive: true });
  writeFileSync(dest, "MY CUSTOM EDIT\nplus the bundled text\n");

  let warnings;
  warnings = captureWarnings(() => addSkill("safe-editing", dir));

  // The custom edit survives in the .bak; the warn names the file.
  assert.equal(existsSync(dest + ".bak"), true);
  assert.match(readFileSync(dest + ".bak", "utf8"), /MY CUSTOM EDIT/);
  assert.match(warnings, /locally modified/i);
  assert.match(warnings, /safe-editing\.md/);
  // The destination is now the bundled copy (the install still happens).
  assert.equal(
    readFileSync(dest, "utf8"),
    readFileSync(join(REPO_ROOT, "skills", "quality", "safe-editing.md"), "utf8")
  );
});

test("add preserves a user-edited agent file", () => {
  const dir = makeTempDir();
  const dest = join(dir, ".claude", "agents", "reviewer.md");
  mkdirSync(join(dir, ".claude", "agents"), { recursive: true });
  writeFileSync(dest, "MY CUSTOM EDIT\n");

  const warnings = captureWarnings(() => addAgent("reviewer", dir));

  assert.equal(existsSync(dest + ".bak"), true);
  assert.match(readFileSync(dest + ".bak", "utf8"), /MY CUSTOM EDIT/);
  assert.match(warnings, /locally modified/i);
  assert.match(warnings, /reviewer\.md/);
});

test("add preserves a user-edited command file", () => {
  const dir = makeTempDir();
  const dest = join(dir, ".claude", "commands", "review.md");
  mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
  writeFileSync(dest, "MY CUSTOM EDIT\n");

  const warnings = captureWarnings(() => addCommand("review", dir));

  assert.equal(existsSync(dest + ".bak"), true);
  assert.match(readFileSync(dest + ".bak", "utf8"), /MY CUSTOM EDIT/);
  assert.match(warnings, /locally modified/i);
  assert.match(warnings, /review\.md/);
});

test("add of an unchanged file writes nothing and warns nothing", () => {
  const dir = makeTempDir();
  addSkill("safe-editing", dir);
  const dest = join(dir, "skills", "quality", "safe-editing.md");
  const before = readFileSync(dest, "utf8");
  const warnings = captureWarnings(() => addSkill("safe-editing", dir));
  assert.equal(readFileSync(dest, "utf8"), before);
  assert.equal(existsSync(dest + ".bak"), false);
  assert.equal(warnings, "");
});

// ---------- Task 12: quoted frontmatter + one bundled-listing loop (F-W19, F-W21) ----------

// Strict-YAML check for a generated frontmatter block (no YAML parser in
// this zero-dependency repo): the description line must be one
// single-quoted YAML string — an unquoted value containing ": " is what
// strict parsers reject ("mapping values are not allowed here").
function assertQuotedDescription(content, skill) {
  const block = content.split("---\n")[1];
  assert.ok(block !== undefined, "frontmatter block exists");
  const line = block.split("\n").find((l) => l.startsWith("description:"));
  const flat = skill.description.replace(/\r\n?/g, " ").replace(/\n/g, " ");
  const expected = `description: '${flat.replace(/'/g, "''")}'`;
  assert.equal(line, expected);
}

test("generated frontmatter parses as strict YAML", () => {
  const bundled = loadBundledSkills();
  assert.equal(bundled.length, 40);
  // rea + ub-mode are the two the audit proved unparseable (their
  // descriptions contain ": " — rea col 73, ub-mode col 97).
  for (const name of ["rea", "ub-mode"]) {
    const skill = bundled.find((s) => s.name === name);
    assert.match(skill.description, /: /);
    assertQuotedDescription(skillCommandContent(skill, bundled), skill);
  }
  // All 40 bundled skills, command + bundle form.
  for (const skill of bundled) {
    assertQuotedDescription(skillCommandContent(skill, bundled), skill);
    const bundle = skillBundleContent(skill, bundled);
    assertQuotedDescription(bundle, skill);
    assert.match(bundle, new RegExp(`^---\\nname: ${skill.name}\\ndescription: `));
  }
});

// ---------- Verification catch (agent 11): no dead isValidName fallback (F-B3) ----------
// Agent 6 built to the pinned contract while Task 1's export had not
// landed yet, so lib/skills.js kept a namespace import + a duplicate
// regex fallback. The export has landed (lib/validate.js:36), so the
// merged code must use the real export directly — one implementation,
// no dead duplicate.

test("skills.js uses the real isValidName export (no dead fallback)", () => {
  const source = readFileSync(join(REPO_ROOT, "lib", "skills.js"), "utf8");
  assert.match(source, /import \{ isValidName \} from "\.\/validate\.js"/);
  assert.doesNotMatch(source, /validateModule/, "no namespace import + fallback indirection");
  assert.doesNotMatch(
    source,
    /validateModule\.isValidName \?\?/,
    "no fallback to a duplicate regex when the export exists"
  );
  // Behavioural half (the real export has identical semantics): the
  // traversal tests above already prove it rejects the same names.
});

// ---------- Verification catch (agent 11): agents/commands frontmatter (F-W19 class) ----------
// Agent 6 flagged that lib/agents.js / lib/commands.js may have the SAME
// unquoted-description defect as F-W19, outside its plan scope. They do:
// `description: ${description}` unquoted at agents.js:52,62 and
// commands.js:44. No bundled agent/command description currently contains
// ": " (checked: all 5 are plain sentences), so no live parse failure
// exists today — the defect is latent, same class, fixed the same way.
// The test pins the quoting function on a colon case AND the call sites
// on the real bundled agents/commands, so a future ": " description
// cannot silently break strict YAML parsing.

test("agent and command frontmatter quotes descriptions", () => {
  // The quoting helper itself: colon, single quote, and newline cases.
  assert.equal(yamlQuote("reviews: hunting breakage"), "'reviews: hunting breakage'");
  assert.equal(yamlQuote("it's: a test"), "'it''s: a test'");
  assert.equal(yamlQuote("line one\nline two"), "'line one line two'");

  // The call sites: every generated agent/command file quotes its
  // description line, exactly like the skill files do after Task 12.
  const dir = makeTempDir();
  addAgent("reviewer", dir);
  addCommand("review", dir);
  for (const file of [
    join(dir, ".opencode", "agents", "reviewer.md"),
    join(dir, ".claude", "agents", "reviewer.md"),
    join(dir, ".opencode", "commands", "review.md"),
    join(dir, ".claude", "commands", "review.md"),
  ]) {
    const content = readFileSync(file, "utf8");
    const line = content
      .split("---\n")[1]
      .split("\n")
      .find((l) => l.startsWith("description:"));
    assert.ok(line, `${file} has a description line`);
    assert.match(line, /^description: '.*'$/, `${file}: description must be single-quoted, got: ${line}`);
  }
  // And the quoted value is the real bundled description, unchanged.
  const agentDesc = listBundledAgents().find((a) => a.name === "reviewer").description;
  const cmdDesc = listBundledCommands().find((c) => c.name === "review").description;
  assert.match(
    readFileSync(join(dir, ".claude", "agents", "reviewer.md"), "utf8"),
    new RegExp(`description: '${agentDesc.replace(/'/g, "''")}'`)
  );
  assert.match(
    readFileSync(join(dir, ".claude", "commands", "review.md"), "utf8"),
    new RegExp(`description: '${cmdDesc.replace(/'/g, "''")}'`)
  );
});

test("bundled listing has one loop", () => {
  // Behavioural guard against divergence: both listings return the same
  // names, in the same order, with the same descriptions. The structural
  // dedupe (one shared loop) is verified by inspection in the commit log.
  const loaded = loadBundledSkills();
  const listed = listBundledSkills();
  assert.deepEqual(
    listed.map((s) => s.name),
    loaded.map((s) => s.name)
  );
  assert.deepEqual(
    listed,
    loaded.map(({ name, description }) => ({ name, description }))
  );
});
