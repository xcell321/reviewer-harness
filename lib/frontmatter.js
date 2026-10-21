// lib/frontmatter.js — a tiny parser for the --- frontmatter ---
// used by the bundled agents and commands. Zero dependencies:
// simple key: value lines only, no deep YAML.

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { data: {}, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { data: {}, body: text };
  const data = {};
  for (const line of text.slice(4, end).split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { data, body: text.slice(end + 5) };
}
