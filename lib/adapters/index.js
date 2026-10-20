// lib/adapters/index.js — REGISTRY sa tanang adapters.
//
// Imbis nga mag if/else kada runtime, irehistro lang ang matag adapter
// dinhi. Ang sync engine mo-loop lang sa registry — mao ni ang
// "Open/Closed Principle": open for extension (dugang adapter),
// closed for modification (ayaw hilabti ang sync engine).

import * as opencode from "./opencode.js";
import * as claude from "./claude.js";
import * as gemini from "./gemini.js";
import * as cline from "./cline.js";

export const adapters = { opencode, claude, gemini, cline };

export const supportedRuntimes = Object.keys(adapters);
