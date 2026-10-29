// lib/adapters/index.js — REGISTRY of all adapters.
//
// Instead of an if/else per runtime, each adapter is simply registered
// here. The sync engine just loops over the registry — the
// "Open/Closed Principle": open for extension (add an adapter),
// closed for modification (never edit the sync engine).

import * as opencode from "./opencode.js";
import * as claude from "./claude.js";
import * as gemini from "./gemini.js";
import * as cline from "./cline.js";
import * as freebuff from "./freebuff.js";
import * as copilot from "./copilot.js";
import * as antigravity from "./antigravity.js";

export const adapters = {
  opencode,
  claude,
  gemini,
  cline,
  freebuff,
  copilot,
  antigravity,
};

export const supportedRuntimes = Object.keys(adapters);
