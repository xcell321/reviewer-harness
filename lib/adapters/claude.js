// lib/adapters/claude.js — ADAPTER for Claude Code.
//
// Claude Code reads CLAUDE.md in the project root at every session.
// It is the best-known instruction file among AI coding tools.

import { renderInstructions as renderShared } from "./render.js";

export function targetFile() {
  return "CLAUDE.md";
}

export function renderInstructions(config) {
  return renderShared(config, { numbered: true });
}
