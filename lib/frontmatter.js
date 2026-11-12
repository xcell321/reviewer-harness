// lib/frontmatter.js — a tiny parser for the --- frontmatter ---
// used by the bundled agents and commands. Zero dependencies:
// simple key: value lines only, no deep YAML.

export function parseFrontmatter(text) {
  // Normalize line endings first: Windows files use CRLF (\r\n), old Mac files
  // use CR (\r). Without this, the "---\n" checks below fail on CRLF input and
  // the whole frontmatter is silently dropped (name/description lost).
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // A byte-order mark in front of the opening delimiter is not part of
  // the frontmatter — strip it so BOM-prefixed files parse.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.startsWith("---\n")) return { data: {}, body: text };
  // Find the closing delimiter as a whole line, so a file ending exactly
  // at "---" (EOF, no trailing newline) still parses, and so does empty
  // frontmatter ("---\n---\nbody").
  const lines = text.split("\n");
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    console.warn(
      "Warning: frontmatter block has no closing '---' — treating the whole file as body."
    );
    return { data: {}, body: text };
  }
  const data = {};
  for (const line of lines.slice(1, close)) {
    const idx = line.indexOf(":");
    if (idx > 0) data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { data, body: lines.slice(close + 1).join("\n") };
}
