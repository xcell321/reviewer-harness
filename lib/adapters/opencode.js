// lib/adapters/opencode.js — ADAPTER para sa OpenCode.
//
// Ang adapter pattern mao ang kasing-kasing sa universal harness:
// ang master spec USA ra, pero matag runtime (OpenCode, Cursor, Copilot...)
// naay kaugalingong format sa instruction files. Ang adapter ang
// mo-translate gikan sa master spec ngadto sa format sa runtime.
//
// OpenCode mobasa og `.opencode/instructions.md` sa imong project.

export function targetFile() {
  return ".opencode/instructions.md";
}

export function renderInstructions(config) {
  const lines = [];
  lines.push(`# ${config.name} — harness instructions`);
  lines.push(``);
  lines.push(
    `> Kini nga file gi-generate sa imong harness. Ayaw i-edit direkta —`,
    `> usba ang harness.config.json unya i-sync pag-usab.`
  );
  lines.push(``);
  // Ang "ngano" — ang problema nga gisulbad sa rules, apil sa sync.
  if (config.problem) {
    lines.push(`## Ang problema nga gisulbad niini`);
    lines.push(``);
    lines.push(config.problem);
    lines.push(``);
  }
  lines.push(`## Rules — dili pwede lapason sa AI`);
  lines.push(``);
  config.rules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });
  lines.push(``);
  // Skills (Lesson 4): gi-render pagkahuman sa rules.
  for (const section of config.skillSections ?? []) {
    lines.push(section);
    lines.push(``);
  }
  return lines.join("\n");
}
