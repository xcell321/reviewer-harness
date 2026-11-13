# reviewer-harness — Landing Page

The public landing page for reviewer-harness. Static HTML — no build step.

## Files

| File | What it is |
|---|---|
| `index.html` | The landing page (Warm Aurora hero, Problem, Without-vs-With, what-sync-creates file tree, Install, interactive demo terminal, Command reference table, 34 skills, 6 rules, 8 runtimes, FAQ, final CTA). |
| `device-preview.html` | Live device preview — the same landing page in Mobile (390px), Tablet (768px), and Desktop (1280px) frames, all working. |

## Deploy

This folder is the Vercel root directory:

1. Import `xcell321/reviewer-harness` in Vercel.
2. Set **Root Directory** to `landing`.
3. Framework: **Other**. No build command.
4. Deploy. Every push to `main` redeploys automatically.

The page is also deployable by dropping this folder on [vercel.com/drop](https://vercel.com/drop).

## Tech stack

HTML5 · CSS3 (custom CSS, @keyframes aurora) · JavaScript (vanilla) · Google Fonts (Inter + GeistMono) · Vercel

## Notes

- Free forever — MIT licensed. No prices, no paid tiers.
- Brand: warm-gradient diamond favicon (browser tab logo), theme-color `#07080a`.
- Style: Warm Aurora (crimson/coral/amber on near-black `#07080a`). No green, no purple, no dots, no grid lines.
