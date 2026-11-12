// lib/adapters/opencode.js — ADAPTER for OpenCode.
//
// The adapter pattern is the heart of a universal harness: the master
// spec is ONE, but every runtime (OpenCode, Claude, Gemini, ...) has
// its own instruction-file format. The adapter translates from the
// master spec into the runtime's format.
//
// OpenCode reads `.opencode/instructions.md` in your project.

import { renderInstructions as renderShared } from "./render.js";

export function targetFile() {
  return ".opencode/instructions.md";
}

export function renderInstructions(config) {
  return renderShared(config, { numbered: true });
}
