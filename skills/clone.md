---
name: clone
description: Fully clone a website's design — layout, components, animations, borders — while replacing all text and assets with your own.
---

## Skill: clone

When to use: the user asks to clone a website or design, and gives a URL or reference to copy.

- Clone the DESIGN, replace the CONTENT. That is the whole rule: everything visual may be reproduced, everything owned must be replaced.
- First, FETCH the target: open the given URL and inspect the live rendered page and its styles. Reading the page's text alone is not an inventory — sizes, colors, fonts, and spacing live in the rendered styles, so the rendered page is what you measure. If the page cannot be fetched or inspected, stop and say so, and ask the user for screenshots — never invent a generic layout as a substitute.
- Then inventory the target with EXACT measurements, for every section and component: layout grid, colors (hex values), fonts (family, weight, exact px size, line height), spacing (exact px padding, margins, gaps), borders (width, style, radius), container widths, image dimensions (exact width × height) and placements, responsive breakpoints, and every animation (type, exact duration in ms, easing, trigger). Write the inventory down before writing any code. An unmeasured value is recorded as unknown — never replaced with a generic default.
- Rebuild from the inventory with original code: reproduce the look and motion using the recorded measurements exactly, never paste the target's source code, never substitute generic defaults (no standard hero, standard cards, or placeholder layout).
- Replace every owned thing: all text (headings, skills, descriptions, projects), all image files, logos, and brand names become the user's own content or placeholders. Image placement and sizes may be copied; image files may not.
- Front-end only: a clone reproduces the look, never the backend — no login, database, or dynamic data.
- If the target is the user's own site, their own assets may be reused.
- Afterwards, validate: compare screenshots side by side, check responsive breakpoints, audit every recorded measurement against the rebuild (sizes, spacing, fonts, colors), and audit that no third-party image, text, or brand remains. Report what was cloned, what was replaced, and any measurement that could not be verified.
