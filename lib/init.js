// lib/init.js — `init` command: sugdi ang harness sa bag-ong project.
//
// Maghimo og harness.config.json gikan sa template kung wala pa.
// Dili mo-overwrite sa existing config — luwas gihapon.

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE = {
  name: "reviewer-harness",
  version: "1.0.0",
  problem:
    "Ang problema — ang AI nga walay guardrails: usahay moguba kini sa existing nga code nga wala gisugo usbon, ug mag-hallucinate — mag-imbento og functions, libraries, o output nga wala diay nag-exist. Kini nga rules mao ang guardrails batok ana.",
  runtimes: ["opencode", "claude", "gemini", "cline"],
  skills: [],
  rules: [
    "Edit surgically: usba lang ang kinahanglan nga code para sa task, ayaw i-rewrite ang tibuok file.",
    "Gamit lang sa libraries nga naa na sa project. Ayaw pag-imbento og package names o APIs.",
    "Human og code, dagana ang tests/lint sa dili pa moingon nga human na ang task.",
    "Kung dili sigurado sa existing nga code, basaha una ang palibot nga files sa dili pa mousab.",
    "Basaha una ang memory/INDEX.md sa dili pa mag-code — mao nay local memory sa project (mga desisyon, gotcha, ug ayaw-hilabti nga mga file). Kung naa kay bag-ong nakat-onan bahin sa project, isulat isip note sa memory/ nga naay [[links]] sa nalambigit nga notes.",
  ],
};

export function initProject(targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const dest = join(targetDir, "harness.config.json");
  if (existsSync(dest)) {
    return { created: false, file: dest };
  }
  writeFileSync(dest, JSON.stringify(TEMPLATE, null, 2) + "\n");
  return { created: true, file: dest };
}
