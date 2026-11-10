---
description: Frontend performance rules distilled from Front-End Checklist (thedaviddias/Front-End-Checklist) — GPU-composited animations, layout-thrashing prevention, resource hints, performance budgets, script loading, lazy loading, and image dimensions. Makes laggy sites smooth without breaking design.
---

## Skill: frontend-performance

Distilled from [Front-End Checklist](https://github.com/thedaviddias/Front-End-Checklist) (`thedaviddias/Front-End-Checklist`) — the open-source frontend quality system with 385 quality-gated rules. Every rule below cites its source rule.

### 1. Animate only transform and opacity
Source: [animation-performance](https://frontendchecklist.io/rules/css/animation-performance) (priority: high)

The browser renders through Style → Layout → Paint → Composite. Animating layout properties restarts this entire pipeline every frame on the main thread. Animating `transform` and `opacity` skips layout and paint — the GPU compositor thread handles them at 60fps even when the main thread is busy.

- **Compositor-only (safe to animate):** `transform` (translate, scale, rotate, skew), `opacity`
- **Paint-triggering (avoid):** `color`, `background-color`, `box-shadow`
- **Layout-triggering (never animate):** `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`

```css
/* ❌ Bad: left triggers layout every frame */
@keyframes slideIn { from { left: -100%; } to { left: 0; } }

/* ✅ Good: translateX is compositor-only */
@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }

/* ❌ Bad: width/height trigger layout */
@keyframes expand { from { width: 0; height: 0; } to { width: 200px; height: 200px; } }

/* ✅ Good: scale() instead */
@keyframes expand { from { transform: scale(0); } to { transform: scale(1); } }
```

- Use `will-change: transform` sparingly — only on elements that will actually animate, and remove it after. Overuse bloats GPU memory.
- Respect `prefers-reduced-motion` — disable or simplify animations for users who need it.

### 2. Batch DOM reads and writes — never interleave
Source: [dom-performance](https://frontendchecklist.io/rules/performance/dom-performance) (priority: high)

Reading a layout property (offsetHeight, getBoundingClientRect, etc.) after writing to the DOM forces the browser to synchronously recalculate layout before returning a value. Alternating reads and writes in a loop — layout thrashing — can freeze the page for hundreds of milliseconds with just 10 elements.

```javascript
// ❌ Bad: read-write-read-write — forces reflow every iteration
items.forEach(item => {
  const height = item.offsetHeight;       // READ — forces reflow
  item.style.height = height * 2 + 'px';  // WRITE — invalidates layout
});

// ✅ Good: all reads first, then all writes
const heights = Array.from(items).map(item => item.offsetHeight); // READs
items.forEach((item, i) => {
  item.style.height = heights[i] * 2 + 'px'; // WRITEs
});
```

- Use `requestAnimationFrame` for visual updates — never `setTimeout(..., 16)`. rAF syncs with the browser's paint cycle.
- Never store per-frame animation values in framework state (e.g. React state at 60fps) — animate the DOM directly; use state for config only.

### 3. Use resource hints for critical assets
Source: [performance-resource-hints](https://frontendchecklist.io/rules/performance/performance-resource-hints) (priority: high)

Resource hints let the browser discover critical assets earlier — improving LCP by 100-300ms on average. They help only when they accelerate the right asset at the right time.

```html
<!-- Preload: assets needed for the CURRENT route (hero image, critical font) -->
<link rel="preload" href="/images/hero.webp" as="image" type="image/webp" fetchpriority="high">
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect: origins you'll fetch from (fonts, APIs, CDNs) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Prefetch: the NEXT likely navigation, not the current page -->
<link rel="prefetch" href="/about.html">
```

- `preload` = this page needs it now. `prefetch` = the user will probably need it next. `preconnect` = I'll be talking to this origin soon.
- Don't preload everything — each preload competes for bandwidth. Preload only the LCP candidate and critical fonts.

### 4. Enforce performance budgets
Source: [performance-budget](https://frontendchecklist.io/rules/performance/performance-budget)

Without automated enforcement, performance degrades gradually — each PR adds a library, each feature adds KB. Catch regressions at review time, not after user complaints.

- General practice: set a JavaScript bundle budget (e.g. < 200KB gzipped for initial load) and an image budget per page.
- Measure with Lighthouse (GoogleChrome/lighthouse) — track LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms.
- Test animations on a real mid-range device, not just the dev machine. Target 95th-percentile frame time < 16.6ms.

### 5. Load scripts with defer, async, or type=module — never render-blocking scripts
Source: [defer-async](https://frontendchecklist.io/rules/html/defer-async) (priority: high)

A plain `<script>` in the head blocks HTML parsing until it downloads and runs — the browser cannot continue building the DOM. `defer` downloads in parallel and runs after parsing, in order. `async` downloads in parallel and runs as soon as it arrives (order not guaranteed — only for independent scripts). `type="module"` defers by default.

```html
<!-- ❌ Bad: blocks parsing -->
<script src="/app.js"></script>

<!-- ✅ Good: parses while downloading, runs after -->
<script src="/app.js" defer></script>
<script src="/analytics.js" async></script>
<script type="module" src="/main.js"></script>
```

### 6. Lazy-load offscreen content — never lazy-load the hero
Source: [lazy-loading](https://frontendchecklist.io/rules/performance/lazy-loading) (priority: high), [lazy-above-fold](https://frontendchecklist.io/rules/performance/lazy-above-fold) (priority: medium), [offscreen-lazy](https://frontendchecklist.io/rules/images/offscreen-lazy) (priority: high)

Images and heavy resources below the fold must not download on initial load — they compete with the LCP candidate for bandwidth. But lazy-loading the hero image delays LCP instead of helping it.

```html
<!-- ❌ Bad: hero image lazy-loaded — LCP waits for the scroll observer -->
<img src="/hero.webp" loading="lazy" alt="Hero">

<!-- ✅ Good: hero loads eagerly, below-fold images lazy -->
<img src="/hero.webp" fetchpriority="high" alt="Hero">
<img src="/gallery-3.webp" loading="lazy" alt="Gallery photo 3">
```

- Below the fold: `loading="lazy"` on images and heavy media. Above the fold: eager load, and use `fetchpriority="high"` on the LCP candidate (see rule 3 — preload only the LCP candidate and one critical font).
- Lazy-load non-hero components too (dynamic import / route splitting) — same principle, applied to code.

### 7. Set explicit width and height on images — and serve them at display size
Source: [dimensions](https://frontendchecklist.io/rules/images/dimensions) (priority: high), [responsive-size](https://frontendchecklist.io/rules/images/responsive-size) (priority: high)

Without dimensions, the browser cannot reserve space before the image loads — content jumps when it arrives (CLS). And serving a 2000px image into a 400px container wastes bandwidth and hurts LCP.

```html
<!-- ❌ Bad: no dimensions — layout shifts when the image loads -->
<img src="/photo.webp" alt="Photo">

<!-- ✅ Good: space reserved, correct size served -->
<img src="/photo-800.webp" srcset="/photo-400.webp 400w, /photo-800.webp 800w"
     sizes="(max-width: 600px) 400px, 800px" width="800" height="600" alt="Photo">
```

- Every `<img>` gets explicit `width` and `height` (or an `aspect-ratio` in CSS) so the browser reserves space.
- Serve responsive sizes (`srcset`/`sizes`); never serve an image significantly larger than its display dimensions.

### 8. Load non-critical code on user interaction
Source: [import-on-interaction](https://frontendchecklist.io/rules/performance/import-on-interaction) (priority: high)

JavaScript modules, widgets, and third-party code that the user may never touch should not load on initial page load — defer them until the user signals intent (click, focus, hover).

```javascript
// ❌ Bad: chat widget + heavy editor load on every page view
import { ChatWidget } from './chat.js';
import { Editor } from './editor.js';

// ✅ Good: load on first intent
document.querySelector('#chat-button').addEventListener('click', async () => {
  const { ChatWidget } = await import('./chat.js');
  new ChatWidget().open();
}, { once: true });
```

- Third-party scripts: `async`/`defer`, and audit regularly — remove the ones nobody uses (see rule 3 for the hint mechanics; this rule is about *when* code loads at all).

### When to apply

- A page feels laggy or janky → check rule 1 first (are animations using transform/opacity?)
- Animations stutter during JS execution → check rule 2 (layout thrashing? rAF?)
- Slow initial load / poor LCP → check rule 3 (resource hints, preload LCP image)
- Performance degrading over time → check rule 4 (budgets in CI)
- Scripts block rendering → check rule 5 (defer/async/module?)
- Below-fold images compete with the hero → check rule 6 (lazy offscreen, eager hero)
- Layout jumps as images load → check rule 7 (width/height + display size?)
- Heavy widgets load before anyone uses them → check rule 8 (load on interaction?)

### Verification

- Chrome DevTools → Performance tab → record interaction. Look for red frames and long Layout/Paint blocks. After the fix, frames should stay green at 60fps.
- Run Lighthouse before and after — LCP, CLS, and INP should improve or stay green.
- General practice: test on a mid-range Android device, not just desktop Chrome.

Apply this playbook to the following: $ARGUMENTS
