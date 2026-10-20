// lib/memory.js — LOCAL MEMORY sa harness (graph-style, Obsidian-ready).
//
// Ang problema: ang AI walay memory. Kada bag-ong session, kalimot siya
// sa imong project — ang mga desisyon, ang mga gotcha, ang mga file nga
// dili angay hilabtan. Resulta: mag-hallucinate ug moguba og code.
//
// Ang solusyon (gi-inspire sa knowledge graph ni Graphify ug sa vault
// style sa Obsidian, pero gaan ug imoha): usa ka memory/ folder sa
// project nga puros plain markdown — walay database, walay API key,
// walay cloud. Local files ra gyud:
//
//   memory/*.md        — notes nga naay [[wiki links]] sa usag usa
//   memory/INDEX.md    — gi-generate nga index (basahon sa AI pag-una)
//   memory/graph.json  — ang knowledge graph: nodes = notes, edges = links
//
// Ablihi ang memory/ folder sa Obsidian → makita nimo ang graph view.
// Ang harness mo-generate sa INDEX.md ug graph.json gikan sa links —
// ikaw (o ang AI, pinaagi sa rules) ang mosulat sa notes.

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";

export function memoryDir(targetDir) {
  return join(targetDir, "memory");
}

const STARTER_NOTE = `# Project

> Starter note sa local memory. Usba ni — isulat dinhi ang kamatuoran
> bahin sa imong project, aron dili na mag-imbento ang AI.

## Unsa ni nga project

_(ihulagway sa usa o duha ka sentence)_

## Tech stack

_(mga language, framework, ug tools nga gigamit)_

## Mga desisyon

_(nganong ingon ani ang gibuhat — nalambigit: [[decisions]])_

## Ayaw hilabti

_(mga file o parte nga delikado usbon, ug ngano)_
`;

const DECISIONS_NOTE = `# Decisions

> Log sa mga desisyon sa project. Matag desisyon: petsa, unsay
> gipili, ug ngano. Nalambigit balik sa [[project]].

## _(petsa)_ — _(ang desisyon)_

_(nganong mao ni ang gipili; unsa ang gi-isip nga alternatives)_
`;

// Basaha ang tanang notes sa memory/ (walay labot ang INDEX.md mismo).
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
      // Obsidian-style links: [[note]] o [[note|alias]]
      const links = [
        ...text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g),
      ].map((m) => m[1].trim());
      return { id, title: titleMatch ? titleMatch[1].trim() : id, file, links };
    });
}

// Tukora ang graph gikan sa notes: nodes = notes, edges = [[links]].
// Ang links nga walay note = "dangling" (gisulat pero wala pa gibuhat).
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

// I-generate ang graph.json + INDEX.md gikan sa notes karon.
export function buildIndex(targetDir) {
  const dir = memoryDir(targetDir);
  mkdirSync(dir, { recursive: true });
  const notes = readNotes(targetDir);
  const graph = buildGraph(notes);

  writeFileSync(
    join(dir, "graph.json"),
    JSON.stringify({ generated_by: "reviewer-harness", ...graph }, null, 2) + "\n"
  );

  // Backlinks: kinsay nag-link ngadto sa matag note.
  const backlinks = new Map(notes.map((n) => [n.id, []]));
  for (const e of graph.edges) backlinks.get(e.to)?.push(e.from);

  const lines = [];
  lines.push(`# Memory Index — local memory sa project`);
  lines.push(``);
  lines.push(
    `> Gi-generate sa reviewer-harness gikan sa mga notes sa memory/.`,
    `> Basaha ni pag-una sa dili pa mag-code. Ang graph naa sa graph.json;`,
    `> ablihi ang folder sa Obsidian para sa graph view.`
  );
  lines.push(``);
  lines.push(`## Notes (${notes.length})`);
  lines.push(``);
  for (const n of notes) {
    const out = graph.edges.filter((e) => e.from === n.id).map((e) => e.to);
    const back = backlinks.get(n.id) ?? [];
    lines.push(
      `- **[[${n.id}]]** — ${n.title} (links: ${out.length}, backlinks: ${back.length})`
    );
  }
  if (graph.dangling.length) {
    lines.push(``);
    lines.push(`## Gisulat nga links pero wala pa'y note`);
    lines.push(``);
    for (const d of graph.dangling) lines.push(`- [[${d}]]`);
  }
  lines.push(``);
  lines.push(`Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges.`);
  lines.push(``);
  writeFileSync(join(dir, "INDEX.md"), lines.join("\n"));

  return {
    notes: notes.length,
    edges: graph.edges.length,
    dangling: graph.dangling.length,
  };
}

// Sugdi ang memory sa project: buhat ang folder + starter notes + index.
export function initMemory(targetDir) {
  const dir = memoryDir(targetDir);
  mkdirSync(dir, { recursive: true });
  const created = [];
  const starter = join(dir, "project.md");
  if (!existsSync(starter)) {
    writeFileSync(starter, STARTER_NOTE);
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
