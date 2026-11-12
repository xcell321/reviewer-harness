---
description: 'Anti-slop design taste distilled from Leonxlnx/taste-skill (v2.5.1) — kind-first layout, dealt palettes/type/heroes, house rules with exact numbers, copy ban lists, motion tokens. Use when building, redesigning, or reviewing a landing/company/product/shop/cafe/hotel/studio/SaaS/AI/devtool/game site, or when a page looks generic, templated, or "AI-made".'
---

## Skill: design-taste-frontend

Distilled from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (`tasteskill 2.5.1`, HEAD `f6b7657`) — SKILL.md + references/layout-v4.md, copy.md, copy-tells.md, system.md, motion.md, library/palettes.json, library/type.json. Every rule below cites its source file. Anything the source does not cover is labeled "general practice".
The two library files are vendored verbatim in this repo at `skills/frontend/library/palettes.json` (64 palettes) and `skills/frontend/library/type.json` (39 pairings), so the `library/…` paths in rules 32–33 resolve from this file's directory. Upstream is MIT — the license is vendored at `skills/frontend/library/LICENSE` (Copyright (c) 2026 Leonxlnx).

When to use: build, design, redesign, restyle, polish, or review a landing page, company site, product page, shop, cafe, hotel, studio, SaaS, AI, devtool, or game site — or when a page looks generic, templated, or "AI-made".

### The method — classify first, deal, never choose by taste

1. **Classify the business first; the kind decides everything.** Six kinds: `software` (app/SaaS/AI/devtool/fintech), `gaming`, `tech` (hardware/device), `product` (other physical product), `service` (people hired), `place` (people come to it: cafe, bakery, guesthouse, shop). Declare it on the page: `<html data-type>` + `<meta name="page-type">` (same value) + `<meta name="site-kind">`; a place adds `<meta name="page-kind" content="place">`.
*Source: SKILL.md §1*

2. **Deal, never choose by taste.** Palette, type pairing, hero layout, and moments are dealt from the library with a history file so pages differ; take the first deal (next only if it clashes with the client's logo/photos or fails a check). Never violet: deal again.
*Source: SKILL.md §4 step 4; layout-v4.md §5*

3. **Effects are tech-only.** Shader grounds, scroll scenes, WebGL, loops, counts, CSS grounds, dark pages/heroes exist only on `software`, `tech`, `gaming`. Every other kind is photographs, flat colour, type, real icons, hero entrance, and photo-/type-led moments only.
*Source: SKILL.md §1, house rule 8*

4. **The bar is figma.com and x.ai, in words:** hero fills the first screen with nothing of the next section showing; sections hold 0.45–1.25 screens of content with ~a quarter screen between them. (From a study of 327 sites at 1440×900 and 390×844: hero alone on first screen on 78% of company sites.)
*Source: SKILL.md intro; layout-v4.md §1*

### The nine house rules — win over everything else
*Source: SKILL.md, "House rules"*

5. **No caption or description under any image, render, or visual.** Licence credits go in one footer line only.
6. **Every visual renders, never an empty ground,** at 1440, 1024, 768, and 390.
7. **One section per screen:** hero alone on the first screen; every section exactly 1 or 2 screens tall at 1440×900; no second section heading peeking in. Exception: a live `photo-chapters` section, 3–4 screens.
8. **Equal left and right content edges.**
9. **Hover micro-animations:** linked card lifts 2px; photo zooms 1.02–1.03 inside its frame; buttons step on hover and press on click; underlines draw; card loops cycle in 2.5–4 s, repeat and restart on hover. Never strip or override the motion layer. **No tilt, carousels, or timed tabs.** Every hero enters once on load (`data-enter`); every page carries one dealt moment, two on a long page.
10. **More and better real photographs where they fit;** nicer backgrounds; better heroes, layouts, and fonts.
11. **Real full-colour icons** (a known product's real icon, never a drawn one); small diagram visuals in cards (a hub with branches; one input, a main processor, three parallel lanes; pulses running along the lines).
12. **Shader effects and scenes only where the trade has a technical subject** (tech, AI, dev tools, gaming, fintech, hardware), never on a local cafe, bakery, guesthouse, or shop — those get photographs.
13. **Addresses:** street and district only (no street given: the district); no house number, postcode, or coordinates; no register or VAT numbers; no phone in a real format; contacts on `.example`.

### Layout — the checkable numbers
*Source: layout-v4.md §2–§5; system.md*

14. **Section heights (content height c at 1440×900, one screen holds 708px, y 120–828):** under 360 → merge into the section above or add its picture; 360–495 → one screen, warning; 495–708 → one screen; 708–1,320 → no height fits (cut/split/`.g2`); 1,320–1,608 → two screens; over 1,608 → split. Fill ≥ 0.55.
15. **The shell:** `body` renders only `header.nav`, `main`, `footer.closing`, and on a phone `nav.actionbar`. No popups, newsletter modals, chat bubbles, help pills, back-to-top squares, badges, award strips, or modal asks; nothing else is fixed.
16. **Section box:** `main > section` and `footer.closing` are `height: calc(var(--h,1) * 100svh)`, `--h` is 1 or 2. Never `min-height` alone, never `dvh`, never a third screen, never a height set by script.
17. **Top-aligned, never vertically centred.** The one h2 is the first content, `--padt` (120px desktop, 96px phone) under the section top. Never a second h2.
18. **Separation by full-width ground change or space only:** no rules, shadows, or inner hairlines between/inside sections; no inset coloured box standing in for a ground.
19. **Grid:** one `.wrap` for header, every section, footer: `width: min(100% - 2 * var(--gut), 1280px)` (place: 1200px). 12 columns, 24px gutter. Every block starts on the left line or a column start; every block ending on the right ends on a column end. Card rows (6+6, 4+4+4, 3+3+3+3): first card on the left line, last on the right, all one height, every row full. **Splits: text left, visual right, top-aligned, on every split — never mirrored, never alternating.**
20. **Hero is exactly the first screen** (`100svh`, `--h: 1`), content ends by y 836 at 1440×900, nothing of the next section shows at 1440, 1280, 1024, 820, 768, or 390. H1 first, top at y 120 (96 phone), at most 3 lines at every width, never smaller than an h2. At most 2 buttons (a place: 1), buttons above the fold at every width.
21. **Eleven dealt hero layouts** (never chosen by taste, never the same within three pages): `split`, `centred`, `product`, `photo`, `place`, `collage`, `editorial`, `word`, `film`, `statement`, `triptych`. A product page is dealt only `product`, `photo`, `film` heroes. The place hero is printed, never dealt.
22. **Type scale (1440/390):** h1 72/38, h2 48/30, h3 and quotes 28/24, lead and card titles 20/18, body 16/26, small 14, labels 13/500 sentence case, stat 38/28. Each level ≥1.3× the next from 1024 (1.2× below); nothing under 13px; lines at most 62 characters.
23. **Type rules:** one family, or a display face plus a text face with fixed jobs; never three; at most four font files. Headlines at `--display-weight`: 400 on product/service/place, 500 on tech; size + tight tracking (−0.5% to −4.5% at 40px+) carry them, never bold-and-big. Text 400 and 500 only. Never 700 or 800. No light weight under 20px. **Banned faces: Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Space Grotesk, Plus Jakarta Sans, or the system look.**
24. **Radius:** `<html data-radius>`: `sharp` 4/6/8, `soft` 8/12/20 (default), `round` 10/16/24. `sharp` for fintech and dev tools, `soft` default, `round` for consumer apps, square on a place.
25. **Buttons:** `.btn.btn--primary` + `.btn.btn--secondary`, 44px high (48 on a place), label 16px, 24px side padding, at most 2 in a `.btn-row`, full width on a phone. Exactly one filled button marks the main action in any view. **Never a slanted, gradient, ghost, or shadowed button, or a third style.**

### Colour — the checkable numbers
*Source: system.md "Colour", "Type"*

26. **The interface stays 90–95% neutral;** colour comes from photographs, the product, the work, and real logos. One near-black ink, often warm, never `#000`, for text, hairlines (12–15% of it), button borders, glyphs, and the mark.
27. **One accent at most,** from the client (product, shopfront paint, tiles, a bag label): the primary button (the only filled accent), focus ring, links, state in visuals, small marks, one brand band; under 3% of a screen elsewhere; its label 4.5:1 on it, it 3:1 on the ground.
28. **Violet/lavender is banned in the page's own design** — accent, ground, gradient, effect colour, or tint. A token whose OKLCH hue falls between ~270° and ~330° is turned to 255 (blue) or 345 (rose), whichever is nearer; a deal that returns violet is dealt again. A real third-party logo keeps its own colours. Canonical check: `#7c3aed` (Tailwind violet-600) is OKLCH hue ~293° — inside the band, banned. If your tool reports HSL hue instead, `#7c3aed` reads 262° — also banned; never pass a token just because its HSL hue falls below 270°. (Hues verified by computation 2026-11-10: OKLCH 293.0°, HSL 262.1°.)
29. **Grounds:** three tokens (`--g-main`, `--g-alt`, `--g-dark`) + one brand band on product/place. Dark pages/heroes are tech-only. The grade (light/evening) is chosen once on load or by click, never by scrolling.
30. **Contrast:** body text in `--ink` at 7:1 or more; `--muted` (4.5:1+) only for labels, dates, meta, and a heading's grey run-on. Large text (24px+) in a muted half 3:1 minimum. On a place every text is 4.5:1+ and every word on the brand band 7:1. Never 14px paragraphs or 15px grey card text.
31. **No scrim or gradient over a photograph;** words on a photograph only in the hero and one closing band, on a crop whose calm part is dark and empty at the phone crop too, or on a solid box; never on a place. **Highlight by contrast, never by colour:** no marker highlights or coloured bars behind words; colour inside a word once a page at most, never on a place.
32. **Palettes are data, dealt by trade.** Each palette in `library/palettes.json` has exact tokens — `bg`, `surface`, `ink`, `muted`, `accent`, `accentInk` — plus a `trades` list and a usage note. Examples: `white-link-blue` ("Sheet and biro": bg `#ffffff`, surface `#f4f4f4`, ink `#111111`, muted `#6b6b6b`, accent `#1a4be0`, trades saas/devtool/fintech/law/clinic/retail); `lunar-grey-bronze` (bg `#111111`, surface `#1c1c1c`, ink `#f2f2f2`, accent `#a08672`, trades hardware/ai/fintech/game).
33. **Type pairings are data, dealt by kind.** Each pairing in `library/type.json` has display/text/mono families with exact weights, tracking, and scale. Examples: `geist` (Geist/Geist/Geist Mono, tracking −0.035, suits devtools/AI/fintech); `manrope` (Manrope, tracking −0.035, suits fintech/data/AI). Load from Google Fonts with `display=swap`.

### Copy — the checkable rules and the ban lists
*Source: copy.md; copy-tells.md*

34. **H1 names the category** (and for an unknown brand, the buyer or the place), in 2–8 words; a place: what and where in ≤40 characters. A game: its name and genre. Never a riddle, command, mood, or brand line over a plain sub-line.
35. **First screen holds one hard fact:** a number, a place, a price, or a date.
36. **Every heading has a noun that names a thing** (product, part, place, section noun, or digit). One brand line a page at most, never the h1.
37. **Buttons are a verb + what the visitor gets,** 1–5 words, starting with book/buy/order/pre-order/reserve/try/start/get/download/compare/see/watch/read/find/join/subscribe/sign up/contact/configure/add/send/email/request. **Never "Learn more", "Read more", "Discover", "Explore", "More", or "Click here".**
38. **Few actions, each with one wording:** at most 2 in the hero (1 on a place), 10 different labels a page at most. Main action names the transaction and reads the same in nav, hero, close, and phone bar, nowhere else. One screen shows it twice at most; a third copy on one screen FAILs.
39. **Word budgets:** tech (software/gaming/hardware) 60–80 words a screen at 1440, counted outside UI mocks/diagrams/code — over 80 WARNs. Product 47, place 44, service 34 words a screen; a page ~900 words at most, footer aside. Hero sub-line 15–30 words (place: fact ≤80 chars with today's hours). Section headings 1–6 words, ≤2 lines. Card body 1–2 sentences, ≤25 words.
40. **Banned slop words** (FAIL): delve, tapestry, testament to, realm, embark, beacon, multifaceted, paradigm, myriad, plethora, meticulous, intricate, interplay, garner, boasts (for "has"), elevate, unlock, unleash, empower, harness, supercharge, turbocharge, seamless, effortless, cutting-edge, revolutionary, transformative, holistic, next-level, next-generation, world-class, best-in-class, game-changer, game-changing, state-of-the-art, bespoke, synergy, leverage, reimagine, powerful, robust, nestled, unparalleled, unrivalled. A word that is literal for the trade stays (a climbing harness, bespoke tailoring).
41. **Banned stock lines:** "In today's fast-paced world", "Unlock the power of", "The future of X is here", "Say goodbye to", "Whether you're A or B", "Join thousands of", "Trusted by teams worldwide", "Imagine a world where", "Ready to transform your X?", "Look no further", "one-stop shop", "X made simple", "at your fingertips", "in just a few clicks", "It's not just a X, it's a Y", "Not only X but also Y", "Here's the thing", "Let that sink in".
42. **Second-generation tells (caps apply):** stat strip (row of 3–4 figures over one-word labels — each number goes in the sentence it proves); two-fragment headings "X. Y." (cap 1/page); number-pair headings (cap 0–1); contrast frames "not X but Y" and substitutes "rather than / instead of / without the" (cap 2 total); negation runs (cap 1); virtue words about ourselves — honest, calm, quiet, actually, genuinely, truly, simply, thoughtful, carefully, intentional, steady, dependable (ban); polished testimonials (none unless the brief gives them word for word); the default cast (people: Priya, Daniel, Amara Okafor, Marcus, Dana, Aisha, Lena M., Tomas, Nora, Maya, Mara, Theo, Isla, Ines, Jess, Sarah J., Elara; companies: Fieldnote, Kestrel, Halcyon, Brightloop, Acme, Northwind, Lumen, Nimbus, Apex, Zenith, Vertex); the section template (eyebrow + claim heading + short lede + 3–4 cards, every section); "Most popular" on the middle plan; response-time promises ("Within two working days"); proof figures ("3x faster", "10,000+ teams", "98% satisfied").
43. **Nothing invented:** no invented reviews, ratings, review counts, quotes, testimonials, statistics, customer counts, customer names, portraits, clients, awards, press lines, or products. Only two things may be assumed when the brief lacks them: a coined brand name (searched first) and, on a place, plausible hours and prices (uneven, local currency — 3.60 not 4.00), each marked `data-assumed`. Never a coined name models keep coining (Kestrel, Halcyon, Lumen, Nimbus, Fieldnote).
44. **No placeholders, no residue:** no square brackets, "lorem ipsum", "your name here", "to be added", TODO, kit sample text, no link to `#` or empty href.

### Real visuals — what is shown
*Source: SKILL.md §2, §6; system.md*

45. **Place pages lead with photographs: 12–20 on the full page** (8–12 compact; under 8 frames = the 3-screen short page). Product/service pages: the product, people, rooms, work — two or more photographs a screen on a product page. **A different picture each section, never one view twice; every headline promise pictured; no fact twice.**
46. **Every product page shows the product big, whole** (most of its frame, or on the ground at anchor scale), never mid-size in a grey rounded panel on a grey ground. One object never carries the page: the hero object leads the hero and at most two more sections.
47. **Software shows its own UI as live HTML** in one `app-frame` (e.g. a code-review tool: a red/green diff with its Accept action), never a generic dashboard or only fragments on panels.
48. **Stock photographs are never passed off as the client's product, people, or place.** Stand-ins are listed in the report as stand-ins, never shown with another maker's name or logo. A product with no photographs is shown in stand-in photographs of the same kind of thing; a render only when the brief asks for 3D; never a drawing, mood stock, or a set of props.
49. **One system only:** one button pair, one card style, one radius scale, one link look; two boxes deep at most; one heading scale. Never add a second grid, spacing scale, type scale, radius, button, card, hairline, fade, or link style. Spacing scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

### Motion — the checkable numbers
*Source: motion.md; SKILL.md §6*

50. **Three layers of motion only, on every page:** (1) hero entrance on load, once, ~1.1 s then the hero stands; (2) one dealt moment in its own section (two on a long page, 8+ sections); (3) the hover/press layer on every link, button, linked card, linked photograph. Nothing else moves.
51. **Hover/press tokens:** `--m-in` 150ms, `--m-out` 120ms, `--m-press` 90ms, `--m-panel` 200ms, `--m-close` 120ms, `--m-slide` 240ms, `--m-image` 600ms in / 400ms out, `--m-cycle` 3.2s. Curves: one UI ease-out `cubic-bezier(.2,.8,.2,1)`; entrance `cubic-bezier(.22,1,.36,1)`; `--m-ease-io` `cubic-bezier(.65,0,.35,1)` only for travel; linear for loops/drifts. No curve passes its mark: no bounce, no overshoot. Motion moves transform, scale, and opacity only — never width, height, top, left, margin, or padding.
52. **Hover distances:** card lift 2px; photo zoom 1.02–1.03; arrow 3px; menu drop 6px; button step 1px up (2px on `.btn--xl`), press 1px down + scale .985. Focus: a 2px ring in the action colour, 2px off the control, no transition.
53. **Card loops (tech only):** one cycle 2.5–4 s (`--m-cycle` 3.2s default), then restarts; seeded on the finished picture, never an empty window; pointer/focus entering the card restarts it from the top. One fragment loop per card group; below the hero, two loops are never on one screen.
54. **Scrolling moves nothing but the dealt moment.** No card/row/tile ever fades, rises, or staggers in on scroll; no parallax on text; no scroll-jacking, smooth-scroll libraries, scroll-snap, scroll-tinted ground, progress line, or scroll-spy. A moment may pin with `position: sticky` inside its own section only.
55. **Banned motion:** a card/row/tile that fades in on scroll; fade-in on every section; parallax on text; scroll-jacking; random blinking; a card that tilts, flips, scales, follows the pointer, or glows at the cursor; a magnetic button; a carousel; a self-advancing slider; timed tabs; a rotating notice; a logo marquee; twinkling dots, glitter, flicker, hue cycling, scrambled text; a loop that plays once; a card loop cycle over 4 s; two loops in one panel; a hover slower than its token; an overshooting ease; a delay before a button reacts; an animated focus ring; an animated width/height/margin.
56. **Reduced motion / no script / phones:** everything rests, nothing stays hidden; every loop, effect, moment, and scene shows its finished frame; numbers show their final text; pause buttons hidden. Anything still moving 5 s after it is seen has one round 32px pause button per panel, 12px in from bottom-right.

### Verification — the gate
*Source: SKILL.md §4 step 6, §5*

57. **Check in a real browser over HTTP** (never `file://`), at widths 1440, 1024, 820, 768, 390 (layout check also 1440×900, 1024×768, 820×1180, 768×1024, 390×844; gate walks the page at 320 for overflow/collide/tap-size). Fix every FAIL (and every copy-lint WARN, or say why it stays).
58. **The gate holds the finish until no fixable FAIL is left, three rounds at most.** Last line must be `GATE: PASS` or `GATE: OPEN`. A FAIL judged false is waived with its reason — never fixed by gaming the check.
59. **Tap targets:** every link/control outside running text ≥44px tall; a FAIL when another target is under 8px away. Nothing past the screen at 320.

### Edsiel's rules (local — not from the source)
- **No green by default (2026-11-07):** never default to green or jade accents — Edsiel finds them ugly. The accent comes from the client or product (rule 27); a dealt palette that lands green-dominant with no client basis is dealt again. (A client's own green brand colour is his call, not a default.)
- **No grid or dot-pattern backgrounds (2026-11-07):** grounds are flat colour, photographs, or the dealt effects where rule 3 allows them — never a grid or dot texture behind content.
- Frontend team = `design-taste-frontend` + `ui-ux-pro-max` (+ `ux-edge-states`, `ub-mode`).
- Installed on Edsiel's PC via `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`; location `~/.claude/skills/design-taste-frontend` (needed manual copy from `~/.agents/skills/`).
- Paired with ui-ux-pro-max for the anti-slop check in DevPilotAI UI audits (since 2026-10-31).

### Learn more
- taste-skill (source): https://github.com/Leonxlnx/taste-skill
- Skill file: https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/skills/taste-skill/SKILL.md

Apply this playbook to the following: $ARGUMENTS
