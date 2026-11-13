import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REQUIRED_SKILL_SECTIONS,
  validateBundledSkills,
  validateSkillTemplate,
} from "../lib/validate.js";
import { loadBundledSkills } from "../lib/skills.js";

// The bundled-skill template gate (sauron-grade roadmap, Phase 2).
// Fixtures are synthetic skills — the gate's unit behavior never depends
// on the real store. The last test is the gate itself: the real bundled
// store, held to the template by CI.

function sectionsBody({ omit = [], whenToUseExtra = "" } = {}) {
  const parts = ["## Skill: Fixture (fixture-skill)"];
  for (const section of REQUIRED_SKILL_SECTIONS) {
    if (omit.includes(section)) continue;
    parts.push(`### ${section}`);
    parts.push(
      section === "When to use"
        ? `Use when the fixture job comes up.${whenToUseExtra}`
        : `Body of the ${section} section.`
    );
  }
  return parts.join("\n\n");
}

function fixture(overrides = {}) {
  return {
    name: "fixture-skill",
    description: "A fixture skill used to test the template gate.",
    version: "1.0.0",
    body: sectionsBody(),
    ...overrides,
  };
}

const ROSTER = ["fixture-skill", "other-skill"];

test("a template-compliant skill passes the gate", () => {
  assert.deepEqual(validateSkillTemplate(fixture(), { roster: ROSTER }), []);
});

test("a missing version fails the gate", () => {
  const errors = validateSkillTemplate(fixture({ version: null }), { roster: ROSTER });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no "version"/);
});

test("a non-SemVer version fails the gate", () => {
  const errors = validateSkillTemplate(fixture({ version: "1.0" }), { roster: ROSTER });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not SemVer/);
});

test("a missing required section fails the gate", () => {
  const errors = validateSkillTemplate(fixture({ body: sectionsBody({ omit: ["Changelog"] }) }), {
    roster: ROSTER,
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing the required "Changelog" section/);
});

test("a missing name or description fails the gate", () => {
  const errors = validateSkillTemplate(fixture({ name: "", description: " " }), {
    roster: ROSTER,
  });
  assert.equal(errors.length, 2);
  assert.match(errors.join("\n"), /no "name"/);
  assert.match(errors.join("\n"), /no "description"/);
});

test("a dangling cross-reference in When to use fails the gate", () => {
  const body = sectionsBody({
    whenToUseExtra: " Endpoint work belongs to `no-such-skill` instead.",
  });
  const errors = validateSkillTemplate(fixture({ body }), { roster: ROSTER });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /cross-references `no-such-skill`/);
});

test("a cross-reference to a real bundled skill passes the gate", () => {
  const body = sectionsBody({
    whenToUseExtra: " Endpoint work belongs to `other-skill` instead.",
  });
  assert.deepEqual(validateSkillTemplate(fixture({ body }), { roster: ROSTER }), []);
});

test("validateBundledSkills holds the whole set to one roster", () => {
  const good = fixture();
  const bad = fixture({ name: "bad-skill", version: null });
  const { errors, ok } = validateBundledSkills([good, bad]);
  assert.equal(ok, false);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Skill "bad-skill"/);
});

test("the bundled store is template-compliant (the Phase 2 gate)", () => {
  const bundled = loadBundledSkills();
  const { errors, ok } = validateBundledSkills(bundled);
  assert.equal(ok, true, `Bundled store must pass the template gate:\n${errors.join("\n")}`);
});
