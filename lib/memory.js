// lib/memory.js — the harness's LOCAL MEMORY (graph-style, Obsidian-ready).
//
// The problem: AI models have no memory. Every new session, they forget
// your project — the decisions, the gotchas, the files that must never
// be touched. The result: hallucination and broken code.
//
// The solution (inspired by Graphify's knowledge graph and Obsidian's
// vault, but lightweight and fully yours): a memory/ folder in the
// project made of plain markdown — no database, no API key, no cloud.
// Just local files:
//
//   memory/*.md        — notes connected by [[wiki links]]
//   memory/INDEX.md    — generated index (the AI reads this first)
//   memory/graph.json  — the knowledge graph: nodes = notes, edges = links
//   memory/REPORT.md   — generated audit: most-connected notes, tags,
//                        dangling links, isolated notes
//
// Notes may carry YAML frontmatter (type, tags, summary, date); tags
// and type land on the graph nodes. Every edge is tagged EXTRACTED —
// it was written as a [[wiki link]] in a note, never guessed. (The
// EXTRACTED / INFERRED vocabulary follows Graphify, Apache-2.0; only
// the deterministic EXTRACTED half is implemented here.)
//
// Open the memory/ folder in Obsidian → you get the graph view.
// The harness generates INDEX.md, graph.json and REPORT.md from the
// links — you (or the AI, via the rules) write the notes.

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";
import { writeSafe } from "./write-safe.js";

export function memoryDir(targetDir) {
  return join(targetDir, "memory");
}

const STARTER_NOTE = `# Project

> Starter note for the local memory. Edit this — write down the truth
> about your project, so the AI stops guessing.

## What this project is

_(describe it in one or two sentences)_

## Tech stack

_(the languages, frameworks, and tools in use)_

## Decisions

_(why things were built this way — related: [[decisions]])_

## Do not touch

_(files or areas that are dangerous to change, and why)_
`;

const DECISIONS_NOTE = `# Decisions

> A log of project decisions. Each entry: the date, what was chosen,
> and why. Linked back to [[project]].

## _(date)_ — _(the decision)_

_(why this was chosen; what alternatives were considered)_
`;

// Note-controlled text (titles, [[link]] targets) is interpolated
// raw into INDEX.md, which the harness's own rules tell AIs to read
// first — a title or link target carrying a newline could forge
// extra index lines. Flatten it the way yamlQuote flattens
// frontmatter: line breaks become spaces, other control characters
// are stripped.
export function flattenNoteText(value) {
  return String(value)
    .replace(/\r\n?/g, " ")
    .replace(/\n/g, " ")
    .replace(/[\x00-\x1F\x7F]/g, "");
}

function unquoteYaml(value) {
  const v = String(value).trim();
  if (
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
  )
    return v.slice(1, -1).trim();
  return v;
}

// Parse a note's YAML frontmatter — deliberately a small subset, not
// a YAML engine (the harness is zero-dependency): `key: value`
// scalars (type, summary, date) and tags as an inline list
// (`tags: [a, b]`), a comma list (`tags: a, b`), or a block list
// (`tags:` followed by `- item` lines). Values are flattened like
// every other note-controlled string: they land in generated files
// the harness's own rules tell AIs to read first.
export function parseFrontmatter(text) {
  const data = { tags: [] };
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (!match) return { data, body: text };
  let inTagList = false;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const item = rawLine.match(/^\s+-\s+(.+)$/);
    if (inTagList && item) {
      data.tags.push(unquoteYaml(item[1]));
      continue;
    }
    inTagList = false;
    const kv = rawLine.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].trim();
    if (key === "tags") {
      if (value.startsWith("[") && value.endsWith("]")) {
        data.tags.push(
          ...value.slice(1, -1).split(",").map(unquoteYaml).filter(Boolean)
        );
      } else if (value) {
        data.tags.push(...value.split(",").map(unquoteYaml).filter(Boolean));
      } else {
        inTagList = true; // a block list may follow
      }
    } else if (key === "type" || key === "summary" || key === "date") {
      const v = unquoteYaml(value);
      if (v) data[key] = flattenNoteText(v);
    }
  }
  data.tags = [...new Set(data.tags.map((t) => flattenNoteText(t)).filter(Boolean))];
  return { data, body: text.slice(match[0].length) };
}

// Files buildIndex generates — never notes themselves. (REPORT.md
// quotes [[links]] in its dangling section; without this exclusion a
// rebuild would ingest the report as a note and grow the graph with
// the report's own quoted links.)
const GENERATED_FILES = new Set(["INDEX.md", "REPORT.md"]);

// Read every note in memory/ (excluding the generated files).
export function readNotes(targetDir) {
  const dir = memoryDir(targetDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !GENERATED_FILES.has(f))
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf8");
      const id = file.replace(/\.md$/, "");
      const { data, body } = parseFrontmatter(text);
      const titleMatch = body.match(/^#\s+(.+)$/m);
      // Obsidian-style links: [[note]] or [[note|alias]]. The link
      // regex admits newlines, so targets are flattened too. Links
      // are read from the body only — a [[link]] quoted inside a
      // frontmatter value is metadata, not an edge.
      const links = [
        ...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g),
      ].map((m) => flattenNoteText(m[1].trim()));
      return {
        id,
        title: titleMatch ? flattenNoteText(titleMatch[1].trim()) : id,
        file,
        links,
        tags: data.tags,
        ...(data.type ? { type: data.type } : {}),
        ...(data.summary ? { summary: data.summary } : {}),
        ...(data.date ? { date: data.date } : {}),
      };
    });
}

// Build the graph from the notes: nodes = notes, edges = [[links]].
// Links with no note yet are "dangling" (written, but not yet created).
export function buildGraph(notes) {
  const byLower = new Map(notes.map((n) => [n.id.toLowerCase(), n.id]));
  const edges = [];
  const dangling = new Set();
  for (const note of notes) {
    for (const link of note.links) {
      const to = byLower.get(link.toLowerCase());
      if (to) {
        // tag EXTRACTED: the link is written in the note itself —
        // found, not inferred (Graphify's edge vocabulary).
        if (to !== note.id)
          edges.push({ from: note.id, to, type: "link", tag: "EXTRACTED" });
      } else {
        dangling.add(link);
      }
    }
  }
  return {
    nodes: notes.map((n) => {
      const node = { id: n.id, title: n.title, file: n.file, tags: n.tags ?? [] };
      if (n.type) node.type = n.type;
      if (n.summary) node.summary = n.summary;
      return node;
    }),
    edges,
    dangling: [...dangling].sort(),
  };
}

// The audit report (Graphify's GRAPH_REPORT.md, at memory scale):
// which notes hold the graph together, how the tags cluster, and
// what needs a human's eye — dangling links and isolated notes.
export function buildReport(notes, graph) {
  const outgoing = new Map(notes.map((n) => [n.id, []]));
  const backlinks = new Map(notes.map((n) => [n.id, []]));
  for (const e of graph.edges) {
    outgoing.get(e.from)?.push(e.to);
    backlinks.get(e.to)?.push(e.from);
  }
  const degree = notes.map((n) => {
    const out = outgoing.get(n.id)?.length ?? 0;
    const back = backlinks.get(n.id)?.length ?? 0;
    return { note: n, out, back, total: out + back };
  });
  const connected = degree
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total || a.note.id.localeCompare(b.note.id));
  const isolated = degree.filter((d) => d.total === 0);
  const byTag = new Map();
  for (const n of notes) {
    for (const t of n.tags ?? []) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(n.id);
    }
  }

  const lines = [];
  lines.push(`# Memory Report`);
  lines.push(``);
  lines.push(
    `> Generated by reviewer-harness from the notes in memory/.`,
    `> The index lives in INDEX.md; the raw graph in graph.json.`
  );
  lines.push(``);
  lines.push(`## Overview`);
  lines.push(``);
  lines.push(`- Notes: ${notes.length}`);
  lines.push(
    `- Edges: ${graph.edges.length} (all EXTRACTED — written as [[wiki links]] in the notes)`
  );
  lines.push(`- Dangling links: ${graph.dangling.length}`);
  lines.push(``);
  lines.push(`## Most connected notes`);
  lines.push(``);
  if (connected.length) {
    for (const d of connected.slice(0, 10)) {
      lines.push(
        `- **[[${d.note.id}]]** — ${d.note.title} (${d.total} connections: ${d.out} out, ${d.back} in)`
      );
    }
  } else {
    lines.push(`No links between notes yet.`);
  }
  if (byTag.size) {
    lines.push(``);
    lines.push(`## Tags`);
    lines.push(``);
    for (const t of [...byTag.keys()].sort()) {
      lines.push(`- \`${t}\` — ${byTag.get(t).map((id) => `[[${id}]]`).join(", ")}`);
    }
  }
  if (graph.dangling.length) {
    lines.push(``);
    lines.push(`## Needs review — dangling links`);
    lines.push(``);
    lines.push(
      `These links point at notes that do not exist yet. Write the note, or fix the link:`
    );
    lines.push(``);
    for (const d of graph.dangling) lines.push(`- [[${d}]]`);
  }
  if (isolated.length) {
    lines.push(``);
    lines.push(`## Isolated notes`);
    lines.push(``);
    lines.push(`No links in or out — the graph cannot find these:`);
    lines.push(``);
    for (const d of isolated) lines.push(`- **[[${d.note.id}]]** — ${d.note.title}`);
  }
  lines.push(``);
  return lines.join("\n");
}

// Generate graph.json + REPORT.md + INDEX.md from the current notes.
export function buildIndex(targetDir) {
  const dir = memoryDir(targetDir);
  mkdirSync(dir, { recursive: true });
  const notes = readNotes(targetDir);
  const graph = buildGraph(notes);

  // Atomic writes (F-W16 memory half): graph.json and INDEX.md each
  // go through writeSafe — temp file + fsync + rename, rotating
  // backups — so neither file can be left half-written. The pair is
  // NOT atomic as a unit: a kill between the two writeSafe calls
  // leaves the newer graph.json beside a stale INDEX.md, and the
  // pair self-heals on the next index run, which regenerates both.
  writeSafe(
    join(dir, "graph.json"),
    JSON.stringify({ generated_by: "reviewer-harness", ...graph }, null, 2) + "\n"
  );
  writeSafe(join(dir, "REPORT.md"), buildReport(notes, graph));

  // Adjacency in both directions, built in ONE pass over the edges
  // (S-26): the per-note loop below used to re-scan the whole edge
  // list for every note — O(notes × edges) — even though the
  // backlink half of this map was already being built here. Edge
  // order is preserved in both maps, so the rendered index is
  // byte-identical to the scanning version.
  const outgoing = new Map(notes.map((n) => [n.id, []]));
  const backlinks = new Map(notes.map((n) => [n.id, []]));
  for (const e of graph.edges) {
    outgoing.get(e.from)?.push(e.to);
    backlinks.get(e.to)?.push(e.from);
  }

  const lines = [];
  lines.push(`# Memory Index — the project's local memory`);
  lines.push(``);
  lines.push(
    `> Generated by reviewer-harness from the notes in memory/.`,
    `> Read this first, before coding. The graph lives in graph.json,`,
    `> the audit report in REPORT.md; open the folder in Obsidian`,
    `> for the graph view.`
  );
  lines.push(``);
  lines.push(`## Notes (${notes.length})`);
  lines.push(``);
  for (const n of notes) {
    const out = outgoing.get(n.id) ?? [];
    const back = backlinks.get(n.id) ?? [];
    lines.push(
      `- **[[${n.id}]]** — ${n.title} (links: ${out.length}, backlinks: ${back.length})`
    );
  }
  if (graph.dangling.length) {
    lines.push(``);
    lines.push(`## Linked, but no note exists yet`);
    lines.push(``);
    for (const d of graph.dangling) lines.push(`- [[${d}]]`);
  }
  lines.push(``);
  lines.push(`Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges.`);
  lines.push(``);
  writeSafe(join(dir, "INDEX.md"), lines.join("\n"));

  return {
    notes: notes.length,
    edges: graph.edges.length,
    dangling: graph.dangling.length,
  };
}

// A SEEDED starter note (init v2): detection already learned the
// project's goal, stack, and validation commands from its own files —
// write that truth into the note instead of blank placeholders the
// user would have to fill in by hand. Anything detection could not
// learn keeps the placeholder.
function seededStarterNote(seed) {
  const stackLine = [seed.stack?.language, seed.stack?.framework]
    .filter(Boolean)
    .join(" · ");
  const cmds = Object.entries(seed.validation ?? {});
  const lines = [
    `# Project`,
    ``,
    `> Starter note for the local memory, seeded by \`reviewer-harness init\``,
    `> from what it detected in this project. Correct anything it got wrong.`,
    ``,
    `## What this project is`,
    ``,
    seed.goal ?? `_(describe it in one or two sentences)_`,
    ``,
    `## Tech stack`,
    ``,
    stackLine || `_(the languages, frameworks, and tools in use)_`,
  ];
  if (cmds.length) {
    lines.push(``, `## Validation commands`, ``);
    for (const [kind, cmd] of cmds) lines.push(`- ${kind}: \`${cmd}\``);
  }
  lines.push(
    ``,
    `## Decisions`,
    ``,
    `_(why things were built this way — related: [[decisions]])_`,
    ``,
    `## Do not touch`,
    ``,
    `_(files or areas that are dangerous to change, and why)_`,
    ``
  );
  return lines.join("\n");
}

// Start the memory in a project: create the folder + starter notes + index.
// The optional seed (from project detection) fills the starter note
// with the project's real goal/stack/commands; without a seed the
// classic placeholder note is written, exactly as before.
export function initMemory(targetDir, seed = null) {
  const dir = memoryDir(targetDir);
  mkdirSync(dir, { recursive: true });
  const created = [];
  const starter = join(dir, "project.md");
  if (!existsSync(starter)) {
    writeFileSync(starter, seed ? seededStarterNote(seed) : STARTER_NOTE);
    created.push("project.md");
  }
  const decisions = join(dir, "decisions.md");
  if (!existsSync(decisions)) {
    writeFileSync(decisions, DECISIONS_NOTE);
    created.push("decisions.md");
  }
  const stats = buildIndex(targetDir);
  return { dir, created, ...stats };
}
