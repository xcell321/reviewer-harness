// Tests for landing/index.html — Task 14 (F-W8, F-W9, F-W10, F-W23, F-W12).
// Static assertions on the HTML: there is no browser in this environment,
// so behaviour that needs a real render/clipboard is asserted by reading
// the markup and the handler source, and the limitation is named here.
// Run with: node --test tests/landing.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../landing/index.html", import.meta.url), "utf8");

test("copy buttons match their shown text and are labelled (F-W8, F-W9)", () => {
  // Every install-step codeblock: shown text must equal data-copy.
  const blocks = [...html.matchAll(
    /<div class="codeblock"><code><span class="p">\$<\/span> ([^<]+)<\/code><button class="copy-btn" type="button" data-copy="([^"]+)"([^>]*)>/g,
  )];
  assert.equal(blocks.length, 3, `expected 3 install codeblocks, found ${blocks.length}`);
  for (const [, shown, copied] of blocks) {
    assert.equal(copied, shown.trim(), `copied "${copied}" must equal shown "${shown.trim()}"`);
  }

  // Every .copy-btn must carry aria-label="Copy: <command>" (the table
  // buttons already do; the install steps at :593/:598/:603 and the CTA
  // at :825 did not).
  const buttons = [...html.matchAll(
    /<button class="copy-btn" type="button" data-copy="([^"]+)"([^>]*)>/g,
  )];
  assert.ok(buttons.length >= 12, `expected >= 12 copy buttons, found ${buttons.length}`);
  for (const [, command, rest] of buttons) {
    const label = rest.match(/aria-label="([^"]+)"/);
    assert.ok(label, `copy button for "${command}" has no aria-label`);
    assert.equal(label[1], `Copy: ${command}`);
  }
});

test("copy failure is visible and announced (F-W10)", () => {
  // No swallowed failure: the empty catch(e){} in fallbackCopy is gone.
  assert.ok(!html.includes("catch(e){}"), "fallbackCopy still swallows the copy error");
  // The failure state is shown on the button, with a recovery step.
  assert.ok(
    html.includes("Copy failed — select the text manually"),
    "no failure text shown on the button",
  );
  // A dedicated live region exists for copy status (the demo term's
  // aria-live at :641 is for the typing demo, not for copy feedback).
  assert.ok(
    html.includes('id="copy-status"'),
    "no #copy-status element",
  );
  assert.ok(
    /id="copy-status"[^>]*aria-live="polite"/.test(html),
    "#copy-status must have aria-live=\"polite\"",
  );
  // flashCopied() announces success/failure into that region (via announce()).
  // The function lives on one line; find that line and check it calls announce().
  const flashLine = html.split("\n").find((l) => l.includes("function flashCopied"));
  assert.ok(flashLine, "flashCopied() not found");
  assert.ok(flashLine.includes("announce("), "flashCopied() does not announce via the live region");
  assert.ok(
    html.includes('document.getElementById("copy-status")'),
    "nothing writes into #copy-status",
  );
  // HONEST LIMITATION (Review Focus #4): there is no real browser clipboard
  // in node:test, so the clipboard-denied path is asserted here by reading
  // the handler source (failure branch sets the error text + announces),
  // not by executing a real clipboard denial. A live-browser check of the
  // denied-permission path is still untested.
});

test("skip link and mobile nav exist (F-W23, F-W12)", () => {
  // The skip link is the first element in <body>, visible on :focus.
  const afterBody = html.slice(html.indexOf("<body>") + "<body>".length).trimStart();
  assert.ok(
    afterBody.startsWith('<a class="skip-link" href="#main">Skip to content</a>'),
    "first element in <body> is not the skip link",
  );
  // The skip target must really exist, or the link is dead.
  assert.ok(html.includes('<main id="main">'), 'no <main id="main"> for the skip link to land on');
  assert.ok(html.includes(".skip-link:focus"), "no :focus-visible style for the skip link");

  // Below 680px navigation is not simply hidden: a compact menu exists.
  assert.ok(html.includes('<details class="mobile-nav"'), "no <details>-based mobile nav in the markup");
  const details = html.match(/<details class="mobile-nav"[\s\S]*?<\/details>/);
  assert.ok(details, "mobile nav <details> not found");
  for (const href of ["#install", "#usage", "#skills", "#rules", "#faq"]) {
    assert.ok(details[0].includes(`href="${href}"`), `mobile nav is missing the ${href} link`);
  }
  // Hidden on desktop, shown inside the 680px media query.
  assert.ok(html.includes(".mobile-nav{display:none}"), "mobile nav is not hidden on desktop");
  const idx680 = html.indexOf("@media (max-width:680px)");
  assert.ok(idx680 !== -1, "680px media query not found");
  assert.ok(
    html.indexOf(".mobile-nav{display:block}", idx680) !== -1,
    "mobile nav is not shown inside the 680px media query",
  );
});

// ---- Task 15 (F-W22, F-W24) ----

test("no scroll-reveal fade/rise/stagger (F-W22)", () => {
  // design-taste-frontend rule 54: "No card/row/tile ever fades, rises, or
  // staggers in on scroll". motion-design rule 1: "Never use the default
  // ease"; rule 6: "Entrance: 250–350ms ease-out".
  assert.ok(!html.includes(".rv{"), "scroll-reveal .rv hidden-state rule still present");
  assert.ok(!html.includes(".rv-in"), "scroll-reveal .rv-in rule still present");
  assert.ok(!html.includes('classList.add("rv"'), "JS still adds .rv on scroll");
  assert.ok(!html.includes("transitionDelay"), "stagger transitionDelay still present");
  assert.ok(!html.includes("(i%3)*70"), "stagger (i%3)*70ms still present");
  // Every remaining transition is a hover/press micro-interaction (<= 350ms,
  // motion-design rule 6) and none uses the default `ease` (rule 1).
  const transitions = [...html.matchAll(/transition:([^;}]+)/g)].map((m) => m[1]);
  assert.ok(transitions.length > 0, "expected some hover transitions to remain");
  for (const t of transitions) {
    assert.ok(
      !/(^|[\s,])ease([\s,]|$)/.test(t),
      `transition uses default ease: transition:${t}`,
    );
    for (const [, num, unit] of t.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
      const ms = unit === "s" ? Number(num) * 1000 : Number(num);
      assert.ok(ms <= 350, `transition exceeds 350ms: transition:${t}`);
    }
  }
  // No entrance fade remains at all: nothing animates opacity via a
  // transition any more. If an entrance is ever re-added it must be
  // <= 350ms with cubic-bezier(0.22,1,0.36,1) (plan global constraint).
  for (const t of transitions) {
    assert.ok(!t.includes("opacity"), `opacity transition remains: transition:${t}`);
  }
});

test("hero overflow measurement recorded (F-W24)", () => {
  // The plan requires a REAL render measurement at 1440x900 before the
  // hero is touched. This test pins that the record exists at the end of
  // this file: either a measured record ("hero bottom = Npx, cmdbar bottom
  // = Mpx") or an explicit UNCONFIRMED record naming what remains
  // unmeasured.
  const self = readFileSync(new URL(import.meta.url), "utf8");
  const measured = /F-W24 MEASUREMENT: 1440x900, hero bottom = \d+px, cmdbar bottom = \d+px/.test(self);
  // NOTE: built from parts so this test's own source never contains the
  // literal record string (a regex literal would match itself).
  const unconfirmed = new RegExp("F-W24" + ": UNCONFIRMED").test(self);
  assert.ok(
    measured || unconfirmed,
    "no F-W24 measurement record (measured or UNCONFIRMED) in this test file",
  );
  if (unconfirmed) {
    // Hero untouched while unconfirmed: the anchor sizing values from
    // f728c1d must still be in the page (never "fix" the estimate blindly).
    assert.ok(html.includes(".hero-title{font-size:64px"), "hero h1 size changed without a measurement");
    assert.ok(html.includes(".cmdbar{max-width:700px"), "hero cmdbar size changed without a measurement");
  }
});

// F-W24 MEASUREMENT: 1440x900, hero bottom = 1048px, cmdbar bottom = 904px
// Measured 2026-11-11 in headless Chrome for Testing 156.0.8078.4
// (~/.cache/ms-playwright/chromium-1248, --window-size=1440,987 so that
// innerWidth/innerHeight read exactly 1440x900; page served over HTTP from
// a /tmp copy of landing/index.html with a getBoundingClientRect probe
// injected; real Google Fonts loaded — fonts.googleapis.com returned 200).
// BEFORE the fix: viewport 1440x900, hero bottom 1048px, hero height 1048px,
// cmdbar bottom 904px (4px past the fold — NOT fully visible without
// scrolling), ghost-pill bottom 976px, heroEndsBy836 false. Overflow
// CONFIRMED: 1048 > 836 by 212px (audit estimate ~1010px was close).
// Component breakdown (before): hero padding 22/72, pill-nav 58, eyebrow
// mt 56 + 34, h1 141 + mt 26/mb 20, sub 58, keycap-row mt 34 + 46,
// caption mt 18 + 19, cmdbar mt 44 + 328, ghost-pill mt 30 + 42.
// AFTER the fix (same measurement, same browser): viewport 1440x900,
// hero bottom 821px, cmdbar bottom 740px (fully visible), ghost-pill
// bottom 797px, heroEndsBy836 true — 15px of slack under the 836 line.
// Fix: tightened hero vertical rhythm only (hero padding 16/24, eyebrow
// mt 12, h1 56px + margins 20/12, sub line-height 1.5, keycap-row mt 24,
// caption mt 12, cmdbar mt 24 + row padding 8px + input/foot padding
// 12px/8px + rows padding 6px, ghost-pill mt 16 + padding 8px). No element
// removed, no content changed. Screenshot confirmation:
// /tmp/fw24/shot1440.png (before, pill clipped at fold) vs
// /tmp/fw24/shot1440-fixed.png (after, whole hero in first screen).
