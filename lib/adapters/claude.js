// lib/adapters/claude.js — ADAPTER para sa Claude Code.
//
// Ang Claude Code mobasa og CLAUDE.md sa project root matag session.
// Mao ni ang pinaka-sikat nga instruction file sa mga AI coding tools.

export function targetFile() {
  return "CLAUDE.md";
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
    ...config.rules.map((rule, i) => `${i + 1}. ${rule}`),
    ``,
    // Skills (Lesson 4): gi-render pagkahuman sa rules.
    ...(config.skillSections ?? []).flatMap((s) => [s, ``]),
  ].join("\n");
}
