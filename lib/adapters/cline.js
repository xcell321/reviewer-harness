// lib/adapters/cline.js — ADAPTER para sa Cline.
//
// Ang Cline mobasa og .clinerules sa project root.
// Ang .clinerules kasagaran mas plain — walay dagkong headers,
// diretso sa rules. Ang adapter ang mo-adjust sa style per runtime.

export function targetFile() {
  return ".clinerules";
}

export function renderInstructions(config) {
  return [
    `# Rules (gi-generate sa ${config.name} — ayaw i-edit direkta)`,
    ``,
    // Ang "ngano" — plain style gihapon, kay .clinerules mas simple.
    ...(config.problem ? [`# Ang problema: ${config.problem}`, ``] : []),
    ...config.rules.map((rule) => `- ${rule}`),
    ``,
    // Skills (Lesson 4): gi-render pagkahuman sa rules.
    ...(config.skillSections ?? []).flatMap((s) => [s, ``]),
  ].join("\n");
}
