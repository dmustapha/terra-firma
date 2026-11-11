// Design contract tests: the shipped code must match DESIGN_SYSTEM.md / brand.json. Run: node --test design-tests/*.design.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(root, "web/app/globals.css"), "utf8");
const layout = readFileSync(path.join(root, "web/app/layout.tsx"), "utf8");
const brand = JSON.parse(readFileSync(path.join(root, "brand.json"), "utf8"));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const tsx = [...walk(path.join(root, "web/components")), ...walk(path.join(root, "web/app"))].filter((f) => f.endsWith(".tsx") && !f.includes("opengraph"));

test("brand accent is the shipped --accent (light and dark)", () => {
  assert.match(css, new RegExp(`--accent: ${brand.accent.toLowerCase()};`));
  assert.match(css, new RegExp(`--accent: ${brand.accentDark.toLowerCase()};`));
});

test("brand fonts are the fonts layout.tsx loads", () => {
  assert.match(layout, /Instrument_Serif/);
  assert.match(layout, /Public_Sans/);
  assert.equal(brand.fonts.display, "Instrument Serif");
  assert.equal(brand.fonts.body, "Public Sans");
});

test("never Robin Neon, never a second hue in components (no raw hex outside tokens)", () => {
  assert.doesNotMatch(css.toLowerCase(), /#ccff00/);
  const offenders = tsx.filter((f) => /#[0-9a-fA-F]{6}\b/.test(readFileSync(f, "utf8").replace(/themeColor:[^\n]*/g, "")));
  assert.deepEqual(offenders.map((f) => path.relative(root, f)), []);
});

test("radius scale: no ad-hoc rounded-[…] values", () => {
  const offenders = tsx.filter((f) => /rounded-\[/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders.map((f) => path.relative(root, f)), []);
});

test("shadow philosophy is pixel-offset: no blurred box-shadows in tokens", () => {
  const shadows = [...css.matchAll(/--shadow-[a-z-]+:\s*([^;]+);/g)].map((m) => m[1]);
  for (const s of shadows) if (!s.startsWith("var(")) assert.match(s, /^\d+px \d+px 0 /, `blurred shadow: ${s}`);
  assert.equal(brand.shadowPhilosophy, "pixel-offset");
});

test("keyboard focus is visible everywhere", () => {
  assert.match(css, /:focus-visible \{\s*outline: 2px solid var\(--fg\);/);
});
