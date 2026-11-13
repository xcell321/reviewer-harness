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
//
// Open the memory/ folder in Obsidian → you get the graph view.
// The harness generates INDEX.md and graph.json from the links —
// you (or the AI, via the rules) write the notes.

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

// Read every note in memory/ (excluding INDEX.md itself).
export function readNotes(targetDir) {
  const dir = memoryDir(targetDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "INDEX.md")
    .sort()
    .map((file) => {
      const text = readFileSync(join(dir, file), "utf8");
      const id = file.replace(/\.md$/, "");
      const titleMatch = text.match(/^#\s+(.+)$/m);
      // Obsidian-style links: [[note]] or [[note|alias]]. The link
      // regex admits newlines, so targets are flattened too.
      const links = [
        ...text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g),
      ].map((m) => flattenNoteText(m[1].trim()));
      return {
        id,
        title: titleMatch ? flattenNoteText(titleMatch[1].trim()) : id,
        file,
        links,
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
        if (to !== note.id) edges.push({ from: note.id, to, type: "link" });
      } else {
        dangling.add(link);
      }
    }
  }
  return {
    nodes: notes.map((n) => ({ id: n.id, title: n.title, file: n.file })),
    edges,
    dangling: [...dangling].sort(),
  };
}

// Generate graph.json + INDEX.md from the current notes.
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
    `> Read this first, before coding. The graph lives in graph.json;`,
    `> open the folder in Obsidian for the graph view.`
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
