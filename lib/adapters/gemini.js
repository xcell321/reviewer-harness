// lib/adapters/gemini.js — ADAPTER for Gemini CLI.
//
// Gemini CLI reads GEMINI.md in the project root.
// Note the shared interface with the other adapters (targetFile +
// renderInstructions) — only the target file and a little flavor
// differ. That is the power of the adapter pattern.

import { renderInstructions as renderShared } from "./render.js";

export function targetFile() {
  return "GEMINI.md";
}

export function renderInstructions(config) {
  return renderShared(config, { numbered: false });
}
