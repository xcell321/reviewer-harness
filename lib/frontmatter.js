// lib/frontmatter.js — gamay nga parser para sa --- frontmatter ---
// nga gigamit sa bundled agents ug commands. Zero dependencies:
// key: value ra nga mga linya, walay lawom nga YAML.

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
