---
description: 'Animation principles distilled from GSAP (GreenSock) — easing, sequencing, stagger, and performance. Make UI motion feel premium, not flashy. For any task involving CSS/JS animations, transitions, or micro-interactions.'
---

## Skill: motion-design

*Distilled from [GSAP (GreenSock Animation Platform)](https://github.com/greensock/GSAP) — the industry-standard JavaScript animation library (90k+ stars, used on 12M+ sites). Every rule below cites its GSAP source.*

When to use: adding animations, transitions, loading states, or micro-interactions to any UI.

### 1. Easing is 80% of good animation
Source: [GSAP Eases docs](https://gsap.com/docs/v3/Eases) — `src/EasePack.js`

Linear motion looks robotic. Real objects accelerate and decelerate.
- **Entrances:** ease-out (`power2.out`, `cubic-bezier(0.22, 1, 0.36, 1)`) — fast start, gentle landing.
- **Exits:** ease-in (`power2.in`) — gentle start, fast finish.
- **Never** use linear for UI motion unless it's a continuous loop (spinner, marquee).
- **Never** use the default `ease` — it's mushy. Pick a deliberate curve.

### 2. Sequence with timelines, not delays
Source: [GSAP Timeline docs](https://gsap.com/docs/v3/GSAP/Timeline) — `src/Timeline.js`

Chaining animations with `setTimeout` or CSS `animation-delay` is fragile — one change breaks the chain.
- Group related animations into a **timeline** (GSAP) or a single orchestrated keyframe sequence (CSS).
- Each step should start relative to the previous (`"-=0.1"` overlap in GSAP), not at absolute times.
- If one step is removed, the rest still flow correctly.

### 3. Stagger lists — never animate all items at once
Source: [GSAP Stagger docs](https://gsap.com/docs/v3/Stagger) — core `gsap.to()` stagger feature

When multiple items appear (list, cards, menu):
- Offset each item by 30–80ms (`stagger: 0.05`).
- Animate from a subtle offset (translateY 8–12px + fade), not from far away.
- Cap the total stagger time — 10 items × 50ms = 500ms max. Beyond that, batch them.

### 4. Animate transform and opacity only
Source: [GSAP performance docs](https://gsap.com/docs/v3/Plugins/CSSPlugin) — `src/CSSPlugin.js`

Animating `width`, `height`, `top`, `left`, or `margin` triggers layout recalculation every frame — janky on low-end devices.
- **Safe:** `transform` (translate, scale, rotate), `opacity`.
- **Avoid:** layout properties. If you must animate size, use `transform: scale()` instead.
- Use `will-change: transform` sparingly — only on elements that animate frequently.

### 5. Respect reduced motion
Source: [gsap.matchMedia() docs](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()) — README highlights accessibility

Some users experience motion sickness or vestibular disorders.
- Wrap all non-essential animation in `@media (prefers-reduced-motion: no-preference)`.
- Provide a `prefers-reduced-motion: reduce` fallback that disables or minimizes motion.
- Essential state changes (loading → loaded) must still communicate without animation.

### 6. Micro-interactions: fast in, faster out
Source: general practice (GSAP community conventions)

- **Hover:** 150–200ms transition. Feels responsive, not laggy.
- **Press/active:** 100–150ms + subtle scale (0.97). Confirms the action.
- **Entrance:** 250–350ms ease-out. Long enough to notice, short enough to not wait.
- **Exit:** 150–250ms ease-in. Exits should feel snappier than entrances.
- Anything over 500ms for a UI micro-interaction feels broken.

### Quick check before shipping
- [ ] Easing: deliberate curve, not linear or default `ease`
- [ ] Lists: staggered, not simultaneous
- [ ] Properties: transform/opacity only
- [ ] Durations: hover ≤200ms, entrance ≤350ms, exit ≤250ms
- [ ] Reduced motion: respected via media query
- [ ] No layout thrashing (no width/height/top/left animation)

### Anti-patterns
- Linear easing on UI elements (looks robotic).
- All list items animating simultaneously (visual noise).
- Animating `width`/`height` (layout thrash).
- 1-second+ durations on buttons or toggles (feels broken).
- Ignoring `prefers-reduced-motion` (accessibility failure).
- Bounce/elastic easings on serious UI (save for playful contexts only).

Apply this playbook to the following: $ARGUMENTS
