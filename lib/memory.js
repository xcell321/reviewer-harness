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
//   memory/00-inbox/ … 03-archive/ — ICM-lite stage folders (Phase 4),
//                        each with a CONTEXT.md contract; staged notes
//                        are normal notes that also carry their stage
//   memory/INDEX.md    — generated index (the AI reads this first)
//   memory/graph.json  — the knowledge graph: nodes = notes, edges = links
//   memory/REPORT.md   — generated audit: most-connected notes, tags,
//                        dangling links, isolated notes
//
// Notes may carry YAML frontmatter (type, tags, summary, date); tags
// and type land on the graph nodes. Wikilink edges are tagged
// EXTRACTED — written in a note, never guessed. Semantic edges an
// agent proposes (the memory-inferred-edges skill) live in
// memory/inferred.json and are merged as INFERRED edges, each with a
// confidence score and a one-line rationale, clearly separated from
// the EXTRACTED half. (The EXTRACTED / INFERRED vocabulary follows
// Graphify, Apache-2.0.) Communities are detected deterministically
// over the combined graph; REPORT.md flags inferred edges that
// bridge two communities as surprising connections.
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
// the report's own quoted links.) CONTEXT.md files are the stage
// contracts (Phase 4) — instructions for the AI, not notes.
const GENERATED_FILES = new Set(["INDEX.md", "REPORT.md", "CONTEXT.md"]);

// Read every note in memory/ (excluding the generated files).
// Notes may sit at the root or inside a stage folder (Phase 4);
// a staged note's id is still its basename — Obsidian resolves
// [[links]] by name, and so does this graph — and the note carries
// its stage so the graph can show where in the flow it lives.
export function readNotes(targetDir) {
  const dir = memoryDir(targetDir);
  if (!existsSync(dir)) return [];
  const found = []; // { file (relative to memory/), stage | null }
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith(".md") && !GENERATED_FILES.has(e.name))
      found.push({ file: e.name, stage: null });
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    for (const f of readdirSync(join(dir, e.name)).sort()) {
      if (f.endsWith(".md") && !GENERATED_FILES.has(f))
        found.push({ file: `${e.name}/${f}`, stage: e.name });
    }
  }
  found.sort((a, b) => a.file.localeCompare(b.file));
  return found.map(({ file, stage }) => {
      const text = readFileSync(join(dir, file), "utf8");
      const id = file.split("/").pop().replace(/\.md$/, "");
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
        ...(stage ? { stage } : {}),
      };
    });
}

// Build the graph from the notes: nodes = notes, edges = [[links]],
// plus any validated INFERRED edges (see validateInferred). Links
// with no note yet are "dangling" (written, but not yet created).
export function buildGraph(notes, inferredEdges = []) {
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
  for (const e of inferredEdges) edges.push(e);
  return {
    nodes: notes.map((n) => {
      const node = { id: n.id, title: n.title, file: n.file, tags: n.tags ?? [] };
      if (n.type) node.type = n.type;
      if (n.summary) node.summary = n.summary;
      if (n.stage) node.stage = n.stage;
      return node;
    }),
    edges,
    dangling: [...dangling].sort(),
  };
}

// --- INFERRED edges (Phase 2) -------------------------------------
// The harness never guesses semantic connections itself — it is
// zero-dependency and deterministic. Instead it defines the storage
// format and the validation; the runtime agent (guided by the
// bundled memory-inferred-edges skill, following Graphify's
// extracted-vs-inferred model) reads the notes and writes its
// proposals to memory/inferred.json:
//
//   [ { "from": "auth-flow", "to": "deploy-guide",
//       "confidence": 0.8, "rationale": "Both describe the JWT
//       session check, but neither links the other.",
//       "relation": "same-mechanism" } ]        // relation optional
//
// buildIndex validates every entry before it may enter the graph.
// A rejected entry never reaches graph.json; it is listed in
// REPORT.md under "Needs review" with the reason, so a bad proposal
// is visible, never silently dropped.
export function validateInferred(notes, raw, extractedEdges = []) {
  const byLower = new Map(notes.map((n) => [n.id.toLowerCase(), n.id]));
  const edges = [];
  const rejected = [];
  if (!Array.isArray(raw)) {
    rejected.push({
      entry: null,
      reason: "inferred.json must hold a JSON array of edge objects",
    });
    return { edges, rejected };
  }
  const extractedPairs = new Set(
    extractedEdges.map((e) => `${e.from}→${e.to}`)
  );
  const seen = new Map(); // "from→to" -> { idx, entry }
  for (const entry of raw) {
    const fail = (reason) => rejected.push({ entry, reason });
    if (!entry || typeof entry !== "object") {
      fail("entry is not an object");
      continue;
    }
    const from =
      typeof entry.from === "string"
        ? byLower.get(entry.from.toLowerCase())
        : undefined;
    const to =
      typeof entry.to === "string"
        ? byLower.get(entry.to.toLowerCase())
        : undefined;
    if (!from || !to) {
      fail("from/to must name notes that exist");
      continue;
    }
    if (from === to) {
      fail("an inferred edge cannot link a note to itself");
      continue;
    }
    if (
      typeof entry.confidence !== "number" ||
      !(entry.confidence > 0 && entry.confidence <= 1)
    ) {
      fail("confidence must be a number in (0, 1]");
      continue;
    }
    if (typeof entry.rationale !== "string" || !entry.rationale.trim()) {
      fail("rationale must be a non-empty one-line string");
      continue;
    }
    const key = `${from}→${to}`;
    if (extractedPairs.has(key)) {
      fail("already an EXTRACTED link — the [[wiki link]] already says it");
      continue;
    }
    const edge = {
      from,
      to,
      type: "inferred",
      tag: "INFERRED",
      confidence: entry.confidence,
      rationale: flattenNoteText(entry.rationale.trim()),
      ...(typeof entry.relation === "string" && entry.relation.trim()
        ? { relation: flattenNoteText(entry.relation.trim()) }
        : {}),
    };
    if (seen.has(key)) {
      // A repeated proposal for the same pair: keep the stronger
      // claim, reject the weaker one — never store both.
      const prev = seen.get(key);
      if (edge.confidence > edges[prev.idx].confidence) {
        rejected.push({
          entry: prev.entry,
          reason: "duplicate inferred edge — a stronger proposal was kept",
        });
        edges[prev.idx] = edge;
        seen.set(key, { idx: prev.idx, entry });
      } else {
        fail("duplicate inferred edge — a stronger proposal was kept");
      }
      continue;
    }
    seen.set(key, { idx: edges.length, entry });
    edges.push(edge);
  }
  return { edges, rejected };
}

// Read memory/inferred.json if present. A missing file is normal
// (no proposals yet). An unparseable file yields one rejection, so
// the report shows the problem instead of the index crashing.
export function readInferred(targetDir, notes, extractedEdges) {
  const path = join(memoryDir(targetDir), "inferred.json");
  if (!existsSync(path)) return { edges: [], rejected: [] };
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {
      edges: [],
      rejected: [
        { entry: null, reason: "inferred.json is not valid JSON" },
      ],
    };
  }
  return validateInferred(notes, raw, extractedEdges);
}

// Deterministic community detection over the combined graph
// (EXTRACTED + INFERRED, treated as undirected): label propagation
// with a fixed iteration order (notes sorted by id) and a fixed
// tie-break (the smallest label wins), so the same notes always
// produce the same communities — no randomness, no dependencies.
// EXTRACTED edges weigh double: the links a human wrote define the
// structure, and one agent proposal must not drag a note out of
// its cluster. A community is named after its smallest member id.
export function detectCommunities(notes, edges) {
  const ids = notes.map((n) => n.id).sort();
  const neighbors = new Map(ids.map((id) => [id, new Map()]));
  for (const e of edges) {
    const w = e.tag === "INFERRED" ? 1 : 2;
    neighbors.get(e.from)?.set(e.to, w);
    neighbors.get(e.to)?.set(e.from, w);
  }
  const label = new Map(ids.map((id) => [id, id]));
  for (let round = 0; round < 100; round++) {
    let changed = false;
    for (const id of ids) {
      const counts = new Map();
      for (const [nb, w] of neighbors.get(id)) {
        const l = label.get(nb);
        counts.set(l, (counts.get(l) ?? 0) + w);
      }
      if (!counts.size) continue;
      let best = null;
      let bestCount = -1;
      for (const [l, c] of counts) {
        if (c > bestCount || (c === bestCount && l < best)) {
          best = l;
          bestCount = c;
        }
      }
      if (best !== label.get(id)) {
        label.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const groups = new Map();
  for (const id of ids) {
    const l = label.get(id);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(id);
  }
  return [...groups.values()]
    .map((members) => ({ id: members[0], members }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// The audit report (Graphify's GRAPH_REPORT.md, at memory scale):
// which notes hold the graph together, how the tags cluster, which
// agent-proposed connections bridge distant clusters ("surprising
// connections"), and what needs a human's eye — dangling links,
// rejected inferred proposals, and isolated notes.
export function buildReport(notes, graph, extra = {}) {
  const rejected = extra.rejected ?? [];
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
  const extracted = graph.edges.filter((e) => e.tag === "EXTRACTED");
  const inferred = graph.edges.filter((e) => e.tag === "INFERRED");
  const communities = graph.communities ?? [];
  const communityOf = new Map();
  for (const c of communities) for (const m of c.members) communityOf.set(m, c.id);
  // A surprising connection (Graphify's term): an inferred edge
  // whose endpoints sit in different communities — the agent claims
  // two distant clusters are related, and no [[link]] says so.
  const surprising = inferred.filter(
    (e) => communityOf.get(e.from) !== communityOf.get(e.to)
  );

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
    `- Edges: ${graph.edges.length} (${extracted.length} EXTRACTED — written as [[wiki links]] in the notes; ${inferred.length} INFERRED — proposed by the agent in inferred.json)`
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
  const multiCommunities = communities.filter((c) => c.members.length > 1);
  if (multiCommunities.length) {
    lines.push(``);
    lines.push(`## Communities`);
    lines.push(``);
    lines.push(
      `Clusters the combined graph (extracted + inferred) settles into:`
    );
    lines.push(``);
    for (const c of multiCommunities) {
      lines.push(
        `- ${c.members.map((id) => `[[${id}]]`).join(", ")}`
      );
    }
  }
  if (inferred.length) {
    lines.push(``);
    lines.push(`## Inferred connections`);
    lines.push(``);
    lines.push(
      `Proposed by the agent from the notes' meaning — NOT written as links in any note. Treat with more doubt than an extracted link:`
    );
    lines.push(``);
    for (const e of inferred) {
      lines.push(
        `- **[[${e.from}]]** → **[[${e.to}]]** — confidence ${Math.round(e.confidence * 100)}% — ${e.rationale}`
      );
    }
  }
  if (surprising.length) {
    lines.push(``);
    lines.push(`## Surprising connections`);
    lines.push(``);
    lines.push(
      `Inferred edges that bridge two different communities — worth a human look first:`
    );
    lines.push(``);
    for (const e of surprising) {
      lines.push(
        `- **[[${e.from}]]** → **[[${e.to}]]** — confidence ${Math.round(e.confidence * 100)}% — ${e.rationale}`
      );
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
  if (rejected.length) {
    lines.push(``);
    lines.push(`## Needs review — rejected inferred edges`);
    lines.push(``);
    lines.push(
      `These proposals in inferred.json failed validation and were NOT added to the graph:`
    );
    lines.push(``);
    for (const r of rejected) {
      const label =
        r.entry && typeof r.entry === "object"
          ? `\`${String(r.entry.from ?? "?")} → ${String(r.entry.to ?? "?")}\``
          : "`(file)`";
      lines.push(`- ${label} — ${r.reason}`);
    }
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

// Load the notes + combined graph without writing anything:
// EXTRACTED first (the [[links]]), then the agent's proposals in
// inferred.json are validated against them, then the combined
// graph gets its communities. Shared by buildIndex (which writes
// the generated files) and queryContext (which only reads).
export function loadGraph(targetDir) {
  const notes = readNotes(targetDir);
  const extractedOnly = buildGraph(notes);
  const inferred = readInferred(targetDir, notes, extractedOnly.edges);
  const graph = buildGraph(notes, inferred.edges);
  graph.communities = detectCommunities(notes, graph.edges);
  return { notes, graph, rejected: inferred.rejected, inferredCount: inferred.edges.length };
}

// Generate graph.json + REPORT.md + INDEX.md from the current notes.
export function buildIndex(targetDir) {
  const dir = memoryDir(targetDir);
  mkdirSync(dir, { recursive: true });
  const { notes, graph, rejected, inferredCount } = loadGraph(targetDir);
  const inferred = { edges: graph.edges.filter((e) => e.tag === "INFERRED"), rejected };

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
  writeSafe(join(dir, "REPORT.md"), buildReport(notes, graph, { rejected: inferred.rejected }));

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
      `- **[[${n.id}]]** — ${n.title} (links: ${out.length}, backlinks: ${back.length})` +
        (n.stage ? ` · stage: ${n.stage}` : ``)
    );
  }
  if (graph.dangling.length) {
    lines.push(``);
    lines.push(`## Linked, but no note exists yet`);
    lines.push(``);
    for (const d of graph.dangling) lines.push(`- [[${d}]]`);
  }
  lines.push(
    `Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges` +
      (inferred.edges.length ? ` (${inferred.edges.length} inferred)` : ``) +
      `.`
  );
  lines.push(``);
  writeSafe(join(dir, "INDEX.md"), lines.join("\n"));

  return {
    notes: notes.length,
    edges: graph.edges.length,
    dangling: graph.dangling.length,
    inferred: inferred.edges.length,
    rejected: inferred.rejected.length,
  };
}

// --- Context retrieval (Phase 3) ----------------------------------
// Graphify's `query --budget`, at memory scale: an agent with a
// question should read the ~5 notes that answer it, not the whole
// memory. queryContext scores notes against the question, walks
// the combined graph 1–2 hops from the best matches, and emits
// note bodies until a token budget runs out. Deterministic: same
// notes + same question → same result, every run. Read-only — it
// never writes to the memory (or to a vault; see Phase 5).

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for",
  "with", "is", "are", "was", "were", "be", "been", "it", "its",
  "this", "that", "these", "those", "how", "what", "when", "where",
  "why", "which", "who", "does", "do", "did", "can", "could",
  "should", "would", "we", "our", "you", "your", "they", "their",
]);

export function tokenizeQuery(question) {
  return [
    ...new Set(
      String(question)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    ),
  ];
}

// The standard rough estimate: ~4 characters per token. It is an
// estimate, labeled as such in the output — the budget is a guard
// against reading the whole memory, not an exact count.
export function estimateTokens(text) {
  return Math.ceil(String(text).length / 4);
}

function noteBody(targetDir, note) {
  const text = readFileSync(join(memoryDir(targetDir), note.file), "utf8");
  return parseFrontmatter(text).body.trim();
}

// --- Obsidian bridge (Phase 5) -------------------------------------
// A project config may name a `vaultPath`: the user's Obsidian
// vault (for Edsiel, his ProjectBrain). Context retrieval then
// searches the vault's notes ALONGSIDE the project memory. The
// bridge is strictly READ-ONLY: the vault is only ever read — no
// index, graph, or note is ever written into it. Vaults nest
// folders freely, so the read is recursive; dot-folders (.obsidian
// and friends) are skipped. Obsidian resolves [[links]] by note
// name, so ids are basenames; if two vault files share a basename
// the first (sorted order) wins, exactly the ambiguity Obsidian
// itself has.
export function readVaultNotes(vaultDir) {
  if (!vaultDir || !existsSync(vaultDir)) return [];
  const files = [];
  const walk = (dir, rel) => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(dir, e.name), r);
      else if (e.isFile() && e.name.endsWith(".md")) files.push(r);
    }
  };
  walk(vaultDir, "");
  const seen = new Set();
  const notes = [];
  for (const file of files) {
    const id = file.split("/").pop().replace(/\.md$/, "");
    if (seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    const text = readFileSync(join(vaultDir, file), "utf8");
    const { data, body } = parseFrontmatter(text);
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const links = [
      ...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g),
    ].map((m) => flattenNoteText(m[1].trim()));
    notes.push({
      id,
      title: titleMatch ? flattenNoteText(titleMatch[1].trim()) : id,
      file,
      links,
      tags: data.tags,
      ...(data.type ? { type: data.type } : {}),
      ...(data.summary ? { summary: data.summary } : {}),
      source: "vault",
      body: body.trim(),
    });
  }
  return notes;
}

export function queryContext(targetDir, question, opts = {}) {
  const budget = opts.budget ?? 2000;
  const hops = opts.hops ?? 2;
  const { notes, graph } = loadGraph(targetDir);
  const bodies = new Map(notes.map((n) => [n.id, noteBody(targetDir, n)]));
  // Phase 5: merge vault notes (read-only) into the pool. A project
  // note shadows a vault note of the same name — the project's own
  // memory is the more specific source.
  const pool = [...notes];
  if (opts.vaultDir) {
    const projectIds = new Set(notes.map((n) => n.id.toLowerCase()));
    for (const v of readVaultNotes(opts.vaultDir)) {
      if (projectIds.has(v.id.toLowerCase())) continue;
      pool.push(v);
      bodies.set(v.id, v.body);
    }
  }
  const byId = new Map(pool.map((n) => [n.id, n]));
  const terms = tokenizeQuery(question);

  // Score: title and tag matches weigh most (the note declares
  // what it is about), then the frontmatter summary, then body
  // occurrences (capped per term, so one repetitive note cannot
  // drown a precise one).
  const scored = [];
  for (const n of pool) {
    const title = n.title.toLowerCase();
    const tags = (n.tags ?? []).join(" ").toLowerCase();
    const summary = (n.summary ?? "").toLowerCase();
    const body = bodies.get(n.id).toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 3;
      if (tags.includes(t)) score += 3;
      if (summary.includes(t)) score += 2;
      let idx = 0;
      let count = 0;
      while (count < 3 && (idx = body.indexOf(t, idx)) !== -1) {
        count++;
        idx += t.length;
      }
      score += count;
    }
    if (score > 0) scored.push({ note: n, score });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id)
  );

  // Walk: seeds at hop 0 (score order), then breadth-first over
  // the combined graph — EXTRACTED neighbors before INFERRED ones
  // (a written link is stronger evidence than a proposal).
  const adjacency = new Map(pool.map((n) => [n.id, []]));
  const haveEdge = new Set();
  const addEdge = (from, to, tag) => {
    const key = `${from}→${to}`;
    if (haveEdge.has(key)) return;
    haveEdge.add(key);
    adjacency.get(from)?.push({ to, tag });
    adjacency.get(to)?.push({ to: from, tag });
  };
  for (const e of graph.edges) addEdge(e.from, e.to, e.tag);
  // Vault notes bring their own [[links]], and a project note may
  // link a vault note (dangling in the project graph alone) — resolve
  // every pool note's links against the merged pool.
  const poolByLower = new Map(pool.map((n) => [n.id.toLowerCase(), n.id]));
  for (const n of pool) {
    for (const link of n.links) {
      const to = poolByLower.get(link.toLowerCase());
      if (to && to !== n.id) addEdge(n.id, to, "EXTRACTED");
    }
  }
  const picked = new Map();
  const queue = [];
  for (const s of scored) {
    picked.set(s.note.id, { note: s.note, hop: 0, score: s.score });
    queue.push({ id: s.note.id, hop: 0 });
  }
  while (queue.length) {
    const { id, hop } = queue.shift();
    if (hop >= hops) continue;
    const neighbors = [...(adjacency.get(id) ?? [])].sort((a, b) =>
      a.tag === b.tag
        ? a.to.localeCompare(b.to)
        : a.tag === "EXTRACTED"
          ? -1
          : 1
    );
    for (const nb of neighbors) {
      if (!picked.has(nb.to)) {
        picked.set(nb.to, { note: byId.get(nb.to), hop: hop + 1, score: 0 });
        queue.push({ id: nb.to, hop: hop + 1 });
      }
    }
  }
  const ranked = [...picked.values()].sort(
    (a, b) =>
      a.hop - b.hop || b.score - a.score || a.note.id.localeCompare(b.note.id)
  );

  // Fill the budget in rank order. A note that does not fit is
  // skipped (a smaller one later may still fit); the single best
  // note is always emitted, even if it alone exceeds the budget —
  // an empty answer helps no one.
  const out = [];
  let totalTokens = 0;
  for (const r of ranked) {
    const text = bodies.get(r.note.id);
    const estTokens = estimateTokens(text) + 16; // + header overhead
    if (out.length && totalTokens + estTokens > budget) continue;
    out.push({
      id: r.note.id,
      title: r.note.title,
      hop: r.hop,
      score: r.score,
      estTokens,
      text,
      ...(r.note.stage ? { stage: r.note.stage } : {}),
      ...(r.note.source === "vault"
        ? { source: "vault", path: r.note.file }
        : {}),
    });
    totalTokens += estTokens;
  }
  return {
    question,
    budget,
    hops,
    totalTokens,
    seeds: scored.map((s) => s.note.id),
    notes: out,
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

// --- ICM-lite stage folders (Phase 4) ------------------------------
// Adapted from ICM (Interpretable Context Methodology, Jake Van
// Clief, MIT): work flows through numbered stage folders, and each
// stage carries a CONTEXT.md contract — what belongs there, what
// happens to it, and where it goes next — so the AI reading the
// memory knows where the work is heading, not just what exists.
// The stages are an overlay on the flat memory: notes at the root
// keep working exactly as before, and a note in a stage folder is
// a normal note (same [[links]], same graph) that also carries
// its stage. Moving a note between stages is just moving the file.
export const MEMORY_STAGES = [
  {
    dir: "00-inbox",
    title: "Inbox — raw captures, not yet processed",
    body: `Everything new lands here first: rough ideas, session dumps, half-formed observations. Nothing in the inbox is trusted yet.

## Inputs

- Anything, from any session — a thought, a link, a screenshot's lesson.

## Process

- Triage regularly: a note either graduates (move it), becomes a decision (rewrite it in 02-decisions), or is dropped.
- Never code against an inbox note as if it were settled fact.

## Outputs

- Promoted notes in 01-active, decision records in 02-decisions, or deletion.`,
  },
  {
    dir: "01-active",
    title: "Active — work in progress",
    body: `Notes for work that is happening now: current designs, open questions, the state of an ongoing task.

## Inputs

- Notes promoted from 00-inbox, or written directly during active work.

## Process

- Keep these notes current — a stale active note is worse than none.
- Link generously with [[wiki links]]; the graph is how the next session finds its way back.

## Outputs

- When the work finishes: its decisions move to 02-decisions, the note itself to 03-archive.`,
  },
  {
    dir: "02-decisions",
    title: "Decisions — what was chosen, and why",
    body: `Decision records: the date, what was chosen, why, and what was rejected. These are the memory's long-term truth alongside the root project note.

## Inputs

- Choices made during active work, promoted from 00-inbox or 01-active.

## Process

- Append-only in spirit: never rewrite history. A decision that is reversed gets a NEW note that links the old one and says what changed.

## Outputs

- None — decisions stay here. Superseded ones move to 03-archive.`,
  },
  {
    dir: "03-archive",
    title: "Archive — finished or superseded, kept for history",
    body: `Notes whose work is done or whose decision was superseded. Kept so the past stays explainable; not part of the current picture.

## Inputs

- Finished notes from 01-active, superseded records from 02-decisions.

## Process

- Treat as read-only history. If an archived note becomes relevant again, move it back to 01-active — do not copy it (one canonical note, per ICM).

## Outputs

- None, unless revived to 01-active.`,
  },
];

function stageContext(stage) {
  return `# Stage: ${stage.title}

> Stage contract for the AI working in this memory, adapted from
> ICM (Interpretable Context Methodology, MIT). Notes in this
> folder are ordinary memory notes — same [[wiki links]], same
> graph — grouped by where they are in the flow:
> 00-inbox → 01-active → 02-decisions → 03-archive.

${stage.body}
`;
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
  // Stage folders (Phase 4): created if missing, never overwritten —
  // a project's own edits to a stage contract are its own.
  for (const stage of MEMORY_STAGES) {
    const stageDir = join(dir, stage.dir);
    mkdirSync(stageDir, { recursive: true });
    const contextFile = join(stageDir, "CONTEXT.md");
    if (!existsSync(contextFile)) {
      writeFileSync(contextFile, stageContext(stage));
      created.push(`${stage.dir}/CONTEXT.md`);
    }
  }
  const stats = buildIndex(targetDir);
  return { dir, created, ...stats };
}
