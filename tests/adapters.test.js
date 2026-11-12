// tests/adapters.test.js — Task 19 (F-W21, adapters half).
// One shared instruction-file renderer; claude/gemini/opencode are thin wrappers.
// Built-in node:test only, zero dependencies.

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderInstructions as renderShared } from "../lib/adapters/render.js";
import * as claude from "../lib/adapters/claude.js";
import * as gemini from "../lib/adapters/gemini.js";
import * as opencode from "../lib/adapters/opencode.js";

const config = {
  name: "test-harness",
  problem: "Rules keep getting broken.",
  rules: ["Never break a rule.", "Verify before claiming done."],
  skillSections: ["## Skill: test-skill\n\nDo the thing."],
};

test("adapters render identically except target file and list marker", () => {
  const claudeOut = claude.renderInstructions(config);
  const geminiOut = gemini.renderInstructions(config);
  const opencodeOut = opencode.renderInstructions(config);

  // Claude numbers rules, Gemini bullets them, with identical rule text.
  assert.match(claudeOut, /^1\. Never break a rule\.$/m);
  assert.match(claudeOut, /^2\. Verify before claiming done\.$/m);
  assert.match(geminiOut, /^- Never break a rule\.$/m);
  assert.match(geminiOut, /^- Verify before claiming done\.$/m);
  assert.doesNotMatch(geminiOut, /^\d+\. /m);

  // Same config, same content otherwise: strip only the list marker.
  const stripMarker = (text) =>
    text.replace(/^(\d+)\. /gm, "- ").replace(/^- /gm, "- ");
  assert.equal(stripMarker(claudeOut), stripMarker(geminiOut));
  assert.equal(stripMarker(claudeOut), stripMarker(opencodeOut));

  // OpenCode numbers like Claude — byte-identical output for the same config.
  assert.equal(opencodeOut, claudeOut);

  // Header, problem section and skill sections survive in all three.
  for (const out of [claudeOut, geminiOut, opencodeOut]) {
    assert.match(out, /^# test-harness — harness instructions$/m);
    assert.match(out, /^## The problem this solves$/m);
    assert.match(out, /Rules keep getting broken\./);
    assert.match(out, /## Skill: test-skill/);
  }

  // targetFile() values unchanged.
  assert.equal(claude.targetFile(), "CLAUDE.md");
  assert.equal(gemini.targetFile(), "GEMINI.md");
  assert.equal(opencode.targetFile(), ".opencode/instructions.md");
});

test("shared renderer is parameterised by numbered", () => {
  const numbered = renderShared(config, { numbered: true });
  const bulleted = renderShared(config, { numbered: false });

  assert.match(numbered, /^1\. Never break a rule\.$/m);
  assert.match(numbered, /^2\. Verify before claiming done\.$/m);
  assert.match(bulleted, /^- Never break a rule\.$/m);
  assert.match(bulleted, /^- Verify before claiming done\.$/m);
  assert.equal(numbered, claude.renderInstructions(config));
  assert.equal(bulleted, gemini.renderInstructions(config));
});

test("shared renderer handles a config with no problem and no skills", () => {
  const minimal = { name: "bare", rules: ["Only rule."] };
  const numbered = renderShared(minimal, { numbered: true });
  const bulleted = renderShared(minimal, { numbered: false });

  assert.match(numbered, /^# bare — harness instructions$/m);
  assert.match(numbered, /^1\. Only rule\.$/m);
  assert.match(bulleted, /^- Only rule\.$/m);
  assert.doesNotMatch(numbered, /The problem this solves/);
  assert.equal(numbered, claude.renderInstructions(minimal));
  assert.equal(bulleted, gemini.renderInstructions(minimal));
});
