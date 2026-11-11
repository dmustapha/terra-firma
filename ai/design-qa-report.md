# Design QA — Terra Firma (Almanac)

Run 2026-11-11, against `next dev --turbopack` (local, mainnet reads; contracts not yet deployed).

| Check | Result | Evidence |
|---|---|---|
| Typography | PASS | Instrument Serif display (clamp-fluid), Public Sans body, tabular figures on every number; Geist removed |
| Contrast (WCAG AA) | PASS 14/14 token pairs | light: ink 15.0, muted 6.8, moss 5.2, danger 5.8, warn 5.6; dark: ink 14.5, muted 8.0, moss 7.8, danger 7.7, warn 9.1 (computed from globals.css) |
| Spacing / radius | PASS | tokenized 2px/4px radius, single shadow philosophy: pixel-offset |
| Interactive states | PASS | real Tab presses: skip link, theme toggle, logo, Connect, nav each get :focus-visible 2px ink outline; hover states in ui.tsx |
| Dark mode | PASS | re-derived from the Almanac palette behind the toggle (home-1440-dark.png); no neon |
| Mobile 375 | PASS 10/10 pages | scrollWidth == 375, no element past the right edge (.design-render-375.json) |
| Craft audit (ui-revamp audit.js) | PASS | components 28 files, app 27 files: no violations |
| Banned defaults | PASS | ticker → Dispatches list; counter tiles → edition-figures line; eyebrow removed; 3-step boxes → ruled prose columns; halftone band is an authored layer |
| Copy | PASS | no dev identifiers in visible text; "Stock Tokens"/"Robinhood Chain" in full; no $HOOD |
| Build | PASS | tsc clean, 133/133 vitest, next build --turbopack OK |

Known follow-ups (not blocking):
- /card shows "Hindsight card" both as page title and card heading.
- /trade empty state repeats its subtitle.
- Next.js dev-mode "N" badge appears in local screenshots only (not in production).
- MEASURE pass against winner references (Claude-in-Chrome, Dami-run) not done; no .design-measured-ref.json yet.

Gate note: design-ux-rubric-gate flagged "undefined" inside JSX braces (JavaScript comparisons in proof-view.tsx:89,330,331 and stake-view.tsx:68,102, never rendered text). Those five comparisons were rewritten `!== undefined` → `!= null` (behaviour unchanged; tsc + 133 tests pass) and the gate re-run clean. No visible copy changed.
