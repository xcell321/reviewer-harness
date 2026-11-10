---
name: vengeance-ui
description: Modern animated React components distilled from VengeanceUI (Ashutoshx7) — 77 copy-paste components across 9 families for landing pages, portfolios, and SaaS sites. Use when designing a modern UI, hero section, or landing page and you want premium motion without building from scratch.
---

## Skill: vengeance-ui

*Distilled from [VengeanceUI](https://github.com/Ashutoshx7/VengeanceUI) (Ashutoshx7, MIT licensed, backed by the Vercel Open Source Program) — 77 animated React/Next.js components, verified against clone HEAD `298075b` = live GitHub HEAD. Every rule below cites its repo source.*

When to use: any modern design ask — landing page, portfolio section, SaaS hero, marketing site — where the UI should look premium and move, not sit static.

### 1. Copy-paste ownership, not a dependency
Source: [README.md](https://github.com/Ashutoshx7/VengeanceUI/blob/main/README.md) — "Copy. Paste. Customize. Ship."; [src/lib/registry.ts](https://github.com/Ashutoshx7/VengeanceUI/blob/main/src/lib/registry.ts) — `selectRegistrySource()` returns the component's file content

VengeanceUI is NOT an npm package you install and import. Each component's source is copied INTO your project, and you own and edit it.
- The only runtime needs are the stack itself: React, Tailwind CSS, Framer Motion.
- Never wrap a Vengeance component in an abstraction layer on first use — paste it, use it, then extract only if it repeats.
- If a component doesn't fit, edit its Tailwind classes and motion props directly. Copied code is yours.

### 2. Install via the shadcn CLI
Source: [src/lib/registry.ts](https://github.com/Ashutoshx7/VengeanceUI/blob/main/src/lib/registry.ts) — `getShadcnAddCommand()`; site shorthand from [vengeanceui.com](https://www.vengeanceui.com/)

```bash
npx shadcn@latest add https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/<component-name>.json
```

Or the site's shorthand:
```bash
npx shadcn@latest add @vengeanceui/<component-name>
```

- `<component-name>` is the kebab-case slug from the catalog (e.g. `aurora-hero`, `spotlight-navbar`, `expandable-bento-grid`).
- pnpm/bun/yarn: swap `npx` for `pnpm dlx` / `bunx` / `yarn dlx` (same `registry.ts`).
- Prerequisite: a shadcn/ui project (Next.js + Tailwind). The CLI drops the `.tsx` file into your components folder.

### 3. Pick by family, not by scrolling
Source: [src/lib/components-catalog.ts](https://github.com/Ashutoshx7/VengeanceUI/blob/main/src/lib/components-catalog.ts) — `COMPONENT_CATEGORIES` (77 components, 9 families)

| Family | Count | For |
|---|---|---|
| Buttons | 9 | CTAs that demand a click (Animated, Candy, Pop, Generate, Radial Glow, Social Flip, Liquid Metal, Creepy, Corner) |
| Text & Motion | 9 | Headlines and numbers that move (Flip Text, Morph Text, Stagger Text, Animated Number, Stats Counter) |
| Interactive | 19 | Showpieces (3D carousels, Model Viewer, Image Trail, Ripple Displacement Slider, Solar System) |
| Layout & Cards | 11 | Page structure (Bento Grids, Testimonials, Pricing Section, Team Reveal) |
| Tooltip & Marquee | 9 | Social proof and navigation aids (Logo Slider, FAQ Accordion, Image Reveal List) |
| Loaders | 1 | Kinetic Text Loader |
| Navbar & Docs | 8 | Navigation (Glass Dock, Spotlight Navbar, Notch Navbar, Mega Menu, Awwwards Nav) |
| Collections | 3 | Small delights (Animated Tooltip, Folder Preview, Line Hover Link) |
| Backgrounds | 8 | Hero atmosphere (Aurora Hero, Wave Grid, Liquid Ocean, Twisting Ribbon) |

- Start from the family that matches the SECTION you are building, not the coolest component.
- One Interactive showpiece per page is enough — two or more fight for attention.

### 4. The modern landing recipe
Source: [README.md](https://github.com/Ashutoshx7/VengeanceUI/blob/main/README.md) — "What You Can Build"

A premium modern page is assembled in this order:
1. **Background** — Aurora Hero or Wave Grid for atmosphere.
2. **Navbar** — Spotlight Navbar, Notch Navbar, or Awwwards Nav.
3. **Hero** — big type (Flip/Morph/Stagger Text) + Animated Button CTA.
4. **Proof** — Logo Slider or Testimonials Card.
5. **Features** — Expandable Bento Grid or Staggered Grid.
6. **Pricing** — Pricing Section (sliding billing switch, rolling prices).
7. **Footer** — Animated Footer (reveal-on-scroll).

- If a section is missing from this recipe, the page feels unfinished; if a section is doubled, it feels padded.
- Portfolio variant: hero + Image Scatter gallery + Bento Grid of projects + footer. Same recipe, fewer sections.

### 5. Spring for interaction, scroll for reveals
Source: [src/lib/components-catalog.ts](https://github.com/Ashutoshx7/VengeanceUI/blob/main/src/lib/components-catalog.ts) — component descriptions

The catalog's own language tells you the motion model:
- **Spring-driven** (Perspective Carousel, Diagonal Carousel, Animated Tooltip) — user-triggered, bouncy, immediate. Use for hovers, clicks, drags.
- **Scroll-driven / scroll-triggered** (Scroll Dissolve Reveal, Image Scatter, Stats Counter) — reveals tied to scroll position. Use for section entrances.
- Never put a spring animation on a scroll entrance, and never put a scroll animation on a hover — the physics feel wrong both ways.

### 6. Heavy effects are hero-only
Source: general practice — cross-reference `frontend-performance` (transform/opacity only, `content-visibility` for below-fold sections)

WebGL and 3D components (Ripple Displacement Slider, Scroll Dissolve Reveal with React Three Fiber, Model Viewer, 3D Books Showcase) are the most expensive things in the catalog.
- One heavy component per page, in the hero or the single showcase section. Never in a repeating card or list.
- Below-fold heavy sections get `content-visibility: auto` so they don't cost render time before the user scrolls to them.
- If the page already lags, cut the heavy effect first — keep the layout, drop the shader. (See `frontend-performance` rule on the blur/transform audit.)

### 7. Customize after copying — Tailwind is yours
Source: [README.md](https://github.com/Ashutoshx7/VengeanceUI/blob/main/README.md) — Features: "Fully customizable styling with Tailwind CSS"

- Change colors, spacing, and radius to match the project's palette BEFORE judging whether a component fits. The default dark aesthetic is a demo choice, not a rule.
- Keep the motion props (spring stiffness, damping, duration) unless you have a reason — those are the tuned part.
- His standing rule applies: polish the existing visual, don't add new elements unless asked.

### 8. Vengeance vs motion-design (GSAP) — when to use which
Source: cross-reference — `motion-design` skill (GSAP); this skill's catalog

| Situation | Use |
|---|---|
| Need a whole ready-made section (hero, pricing, nav, bento) | vengeance-ui — pick the component |
| Need one specific effect (a button shine, a text reveal) | vengeance-ui — pick the component |
| Need custom choreography across many elements (timeline, scrubbed scroll story) | motion-design (GSAP) — build the timeline |
| Need a non-React home (plain HTML/CSS/JS page) | motion-design (GSAP) — Vengeance components are React/Next.js |

- They complement, they don't replace: a page can use a Vengeance hero AND a GSAP scroll timeline in a later section.
- Never rebuild a Vengeance component from scratch in GSAP when the component already exists — copy-paste beats re-implementation.

### 9. Free and MIT — no paywall, no attribution required
Source: [LICENSE](https://github.com/Ashutoshx7/VengeanceUI/blob/main/LICENSE) — MIT License, Copyright (c) 2025-2026 Ashutoshx7

- All 77 components are free and open source. No Pro tier, no account, no card.
- The paid libraries in the same space (Animmaster Lib, Skiper UI Pro) are NOT substitutes — Vengeance covers the same premium look for free.
- MIT means you can ship copied components in commercial work. Keep the license file in the repo root if you redistribute the library itself.

### 10. Stack prerequisite — React/Next.js home required
Source: [package.json](https://github.com/Ashutoshx7/VengeanceUI/blob/main/package.json) — React 19, Next.js 16, Tailwind CSS 4, Framer Motion 13

- Vengeance components live in React/Next.js + Tailwind 4 + Framer Motion. If the target project is plain HTML/CSS/JS (like a static portfolio `index.html`), the components don't drop in directly — either port the effect by hand with GSAP/CSS, or build that section in a React home.
- Before recommending a component, check the project's stack. Recommending `aurora-hero` for a vanilla HTML page without flagging the React requirement is a miss.
- For Edsiel's React projects (DevPilotAI web app, Next.js work), the components apply directly.
