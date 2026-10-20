// lib/adapters/gemini.js — ADAPTER para sa Gemini CLI.
//
// Ang Gemini CLI mobasa og GEMINI.md sa project root.
// Tan-awa: parehong interface sa ubang adapters (targetFile + renderInstructions),
// lahi lang og target file ug gamayng flavor. Mao ni ang gahum sa adapter pattern.

export function targetFile() {
  return "GEMINI.md";
}

export function renderInstructions(config) {
  return [
    `# ${config.name} — harness instructions`,
    ``,
    `> Kini nga file gi-generate sa imong harness. Ayaw i-edit direkta —`,
    `> usba ang harness.config.json unya i-sync pag-usab.`,
    ``,
    // Ang "ngano" — ang problema nga gisulbad sa rules, apil sa sync.
    ...(config.problem
      ? [`## Ang problema nga gisulbad niini`, ``, config.problem, ``]
      : []),
    `## Rules — dili pwede lapason sa AI`,
    ``,
    ...config.rules.map((rule) => `- ${rule}`),
    ``,
    // Skills (Lesson 4): gi-render pagkahuman sa rules.
    ...(config.skillSections ?? []).flatMap((s) => [s, ``]),
  ].join("\n");
}
