# DESIGN_SYSTEM.md — Terra Firma ("Almanac")

Source of truth: `web/app/globals.css` (tokens) and `web/components/ui.tsx` (primitives). This file documents what the shipped code uses; it invents nothing.

## Identity
- **World statement:** Ground, not glitter. Robinhood Chain traders live on a flat world of memes; Terra Firma is the survey office at its edge, printed like an almanac on cream newsprint, where every number is measured from the chain and dead memes settle into bedrock as real Stock Tokens.
- **Accent:** bedrock moss `#3F6B4A` (dark: `#86B391`). The moss is the color of solid ground and of a held position; it is calm, not "money green", and it never imitates Robin Neon `#CCFF00` (Robinhood Chain's own color, which would imply endorsement).
- **Signature element:** the **Fig. 1 strata plate** (`web/components/strata-plate.tsx`): a wallet's Hindsight card drawn to scale as a soil cross-section. The paid datum line (D) sits on top, the eroded meme horizon (A) is a sliver labelled honestly as thickened, and the bedrock stock horizon (R) holds; every caption cites its source. It stays visible above the fold on the landing and at the top of every card.
- **Invariant phrase:** **"Measured, not estimated."** Reused verbatim in the masthead, README, PRD, /proof and the demo voiceover.

## Tokens
### Color (one hue; variety from paper steps and moss opacity)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#F1EBDD` | `#17140F` | paper / basalt |
| `--surface` | `#F7F3E9` | `#1F1B15` | fresh sheet (one step up) |
| `--surface-2` | `#E8E0CD` | `#110E0A` | well: one step below the page in BOTH modes (rows, wells) |
| `--line` | `#BCB4A2` | `#4B4438` | hairline rule |
| `--line-strong` | `#1A1712` | `#ECE4D2` | ink rule |
| `--fg` | `#1A1712` | `#ECE4D2` | ink (15.0:1 / 14.5:1) |
| `--muted` | `#554F47` | `#B3AA98` | secondary ink (6.8:1 / 8.0:1) |
| `--accent` | `#3F6B4A` | `#86B391` | moss (5.2:1 / 7.8:1) |
| `--accent-strong` | `#2F5239` | `#A0C6AA` | moss pressed |
| `--accent-55/32/soft(12)/06` | moss at 55/32/12/6% | same | fills, wells, hover tints |
| `--danger` | `#9B3B1F` | `#E39477` | brick (5.8:1 / 7.7:1) |
| `--warn` | `#7A5512` | `#DCB062` | ochre ink (5.6:1 / 9.1:1) |

### Type
- Display: **Instrument Serif** (400, roman + italic) via `next/font` `--font-instrument-serif`; italic moss for emphasis ("*into stock.*").
- Body/UI: **Public Sans** 400–700 via `--font-public-sans`; every figure uses `.num` (tabular, lining).
- Mono: system UI monospace, only for addresses typed by the user.
- Fluid scale: `--text-headline` clamp(2.6rem → 5.5rem, lh 0.96, −0.022em) · `--text-title` clamp(2.1 → 3.5rem) · `--text-deck` clamp(1.5 → 2rem) · `--text-nameplate` clamp(2 → 4.5rem).

### Spacing
Tailwind 4px base unit; sections step 8/12/16/20 (2rem–5rem); columns separated by ruled gutters (`border-l border-line`) rather than gaps alone.

### Radius (near-square print geometry)
`--radius-xs/sm` 2px · `--radius-md…2xl` 4px · `rounded-full` only for status dots and horizon labels. No ad-hoc `rounded-[…]`.

### Shadow (philosophy: **pixel-offset**)
`--shadow-press` 2px 2px 0 ink 85% (primary buttons) · `--shadow-press-up` 3px 3px 0 (hover) · `--shadow-plate` 4px 4px 0 ink 16% (figures) · `--shadow-overlay` 6px 6px 0 ink 22% (dialogs, menus). No blur anywhere.

### Ready-to-paste `@theme` (copied verbatim from web/app/globals.css; complete)
```css
:root {
  --bg: #f1ebdd; /* paper */
  --surface: #f7f3e9; /* fresh sheet, one step up */
  --surface-2: #e8e0cd; /* paper-deep, one step down (rows, wells) */
  --line: #bcb4a2; /* hairline rule (ink 26% on paper) */
  --line-strong: #1a1712; /* ink rule */
  --fg: #1a1712; /* ink */
  --muted: #554f47; /* ink 74%: 7.1:1 on paper */
  --accent: #3f6b4a; /* bedrock moss: 5.2:1 on paper */
  --accent-strong: #2f5239;
  --accent-fg: #f1ebdd;
  --accent-55: rgb(63 107 74 / 0.55);
  --accent-32: rgb(63 107 74 / 0.32);
  --accent-soft: rgb(63 107 74 / 0.12);
  --accent-06: rgb(63 107 74 / 0.06);
  --danger: #9b3b1f; /* brick: 6.1:1 on paper */
  --danger-soft: rgb(155 59 31 / 0.1);
  --warn: #7a5512; /* ochre ink: 5.6:1 on paper */
  --warn-soft: rgb(200 144 27 / 0.14);
  --ink-shadow: rgb(26 23 18 / 0.85);
  --shadow-press: 2px 2px 0 var(--ink-shadow);
  --shadow-press-up: 3px 3px 0 var(--ink-shadow);
  --shadow-plate: 4px 4px 0 rgb(26 23 18 / 0.16);
  --shadow-overlay: 6px 6px 0 rgb(26 23 18 / 0.22);
  --grain: rgb(26 23 18 / 0.05);
  --grain-2: rgb(63 107 74 / 0.04);
  --backdrop: rgb(26 23 18 / 0.45);
  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #17140f;
  --surface: #1f1b15;
  --surface-2: #110e0a; /* well: one step BELOW basalt, same meaning as light (wells sink) */
  --line: #4b4438;
  --line-strong: #ece4d2;
  --fg: #ece4d2;
  --muted: #b3aa98; /* 7.9:1 on basalt */
  --accent: #86b391; /* 7.6:1 on basalt */
  --accent-strong: #a0c6aa;
  --accent-fg: #17140f;
  --accent-55: rgb(134 179 145 / 0.55);
  --accent-32: rgb(134 179 145 / 0.32);
  --accent-soft: rgb(134 179 145 / 0.14);
  --accent-06: rgb(134 179 145 / 0.06);
  --danger: #e39477;
  --danger-soft: rgb(227 148 119 / 0.12);
  --warn: #dcb062;
  --warn-soft: rgb(220 176 98 / 0.12);
  --ink-shadow: rgb(236 228 210 / 0.32);
  --shadow-plate: 4px 4px 0 rgb(0 0 0 / 0.45);
  --shadow-overlay: 6px 6px 0 rgb(0 0 0 / 0.55);
  --grain: rgb(236 228 210 / 0.035);
  --grain-2: rgb(134 179 145 / 0.03);
  --backdrop: rgb(0 0 0 / 0.6);
  color-scheme: dark;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-fg: var(--fg);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-strong: var(--accent-strong);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);
  --color-accent-55: var(--accent-55);
  --color-accent-32: var(--accent-32);
  --color-accent-06: var(--accent-06);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);

  --font-sans: var(--font-public-sans), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-instrument-serif), "Iowan Old Style", Georgia, serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* Radius scale: near-square print geometry. Tailwind's own steps collapse onto it. */
  --radius-xs: 2px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 4px;
  --radius-xl: 4px;
  --radius-2xl: 4px;
  --radius-card: 4px;

  /* Pixel-offset ladder (the only shadows in the project). */
  --shadow-sm: var(--shadow-press);
  --shadow-md: var(--shadow-plate);
  --shadow-lg: var(--shadow-overlay);

  /* Type scale. Display sizes are fluid and tightened. */
  --text-headline: clamp(2.6rem, 1.4rem + 4.6vw, 5.5rem);
  --text-headline--line-height: 0.96;
  --text-headline--letter-spacing: -0.022em;
  --text-title: clamp(2.1rem, 1.5rem + 2.2vw, 3.5rem);
  --text-title--line-height: 1.02;
  --text-title--letter-spacing: -0.018em;
  --text-deck: clamp(1.5rem, 1.25rem + 0.9vw, 2rem);
  --text-deck--line-height: 1.1;
  --text-deck--letter-spacing: -0.01em;
  --text-nameplate: clamp(2rem, 1rem + 4vw, 4.5rem);
  --text-nameplate--line-height: 0.9;
  --text-nameplate--letter-spacing: -0.025em;
}
```

### Do's / Don'ts
- Do: one hue (moss); every other surface is paper/ink steps or moss opacity. Don't: add a second accent hue, a gradient, or neon.
- Do: tokens only (`bg-surface`, `text-muted`, `shadow-[var(--shadow-press)]`). Don't: inline hex or `rounded-[17px]`.
- Do: separate content with ink rules and paper steps. Don't: flat 1px-border cards stacked in a grid, or blurred shadows.

### Contrast (WCAG AA, computed)
Text on page: ink 15.0, muted 6.8, moss 5.2, brick 5.8, ochre 5.6 (light); ink 14.5, muted 8.0, moss 7.8, brick 7.7, ochre 9.1 (dark). Text on wells (`surface-2`): muted 6.2, moss 4.7, ochre 5.1, brick 5.3 (light); muted 8.4 (dark). Tinted badges: moss-strong on moss-12% 6.3, ochre on ochre-14% 5.0, brick on brick-10% 5.0. Rule: on any moss tint use `text-accent-strong`, never `text-accent` (moss on moss-12% is 4.4:1, below AA).

## Formats and fixed surfaces
- **Numbers:** USD `$15,488.46` (2 decimals, thousands commas, tabular); shares to 2 decimals (`87.51 NVDA`); ETH to 4 significant decimals; a loss is shown as the lower value, never with a red minus; a missing live price is an em dash "—" with its reason, never a zero or an estimate.
- **Share image (OG, 1200×630, `app/card/[addr]/opengraph-image.tsx`):** paper ground, masthead line "Robinhood Chain edition · read live", the wallet's three figures (paid, today, in the chosen stock) in Instrument Serif, footer "Every number from Robinhood Chain and Chainlink rounds." Must read at feed-thumbnail size (≈400px wide): three figures maximum, no body copy.
- **Plate on mobile (375px):** the plate stacks above its captions at full column width; captions stay one per row; no horizontal scroll (verified 10/10 pages).
- **Empty state:** a wallet with no meme history gets no plate; it says so plainly and offers the stock picker and "look up another wallet" (`hindsight-card.tsx` `empty`).

## Status Legend
| Color | State token (Badge/Notice `tone`) | Meaning to a user |
|---|---|---|
| moss `--accent` | `accent` — live / verified / ownerless / tracked meme / discount unlocked | read from the chain and confirmed; safe to act on |
| ochre `--warn` | `warn` — not live yet / waiting for epoch e+2 / Quicknode count differs | real but not active yet, or two sources disagree; nothing is estimated in its place |
| brick `--danger` | `danger` — couldn't read the chain / invalid address / has an owner / taxed token / worst trade | the read failed or the token is unsafe to route; no number is shown instead |
| ink `neutral` | `neutral` | plain information |

## Craft
- **Radius scale (CF-1):** 2px / 4px tokens only.
- **Elevation ladder (CF-2):** one meaning in both modes: `surface-2` (well, sinks) < `bg` (page) < `surface` (sheet, raised) + plate offset. Light: `#E8E0CD` < `#F1EBDD` < `#F7F3E9`. Dark: `#110E0A` < `#17140F` < `#1F1B15`, so raised surfaces lighten per level and wells darken.
- **Shadow philosophy:** pixel-offset (see Tokens), the only shadows in the project.
- **Glass recipe:** none. No `backdrop-blur` in the product (deliberate: print has no frosted glass).
- **Hover recipe:** primary button lifts `-translate-y-px` and the offset grows from 2px to 3px; links thicken their moss underline (`decoration-2 decoration-accent`); rows get a `bg-accent-06` tint; secondary controls darken their border to ink.
- **Focus-visible recipe:** 2px solid ink outline, 3px offset, on every `a, button, input, select, textarea, summary, [tabindex]` (global rule in globals.css), plus a skip link as the first stop.
- **Texture:** newsprint grain (two offset 5px dot screens at 5%/4%) on `body`; the **halftone ground band** (`.ground-band`, moss dot screens through wave masks, dots growing with depth) closes every page. Neither is a flat fill.
- **Signature placement:** Fig. 1 plate above the fold on `/`, at the top of every card (`/app`, `/card/[addr]`), and in the loading galley.

## Primitives (`web/components/ui.tsx`)
- **Panel:** `bg-surface` sheet under a 2px ink top rule, padding 6, no border box.
- **Button (primary):** `bg-accent text-accent-fg rounded-sm shadow-[var(--shadow-press)]`, hover lift + `--shadow-press-up`, focus ring. **Secondary:** ink border, paper fill, hover `bg-surface-2`.
- **Input:** paper-light well, ink 1px border, hover/focus `border-fg`, focus outline.
- **Badge:** small caps-free label, tone background at 12% with tone ink text.
- **Notice:** italic serif lead word ("Notice.") + body, tone-tinted well with an inset 3px tone rule on the left.
- **Stat / figure row:** label in muted ink, value in `.num` semibold, separated by hairline rules.
- **Skeleton:** paper-deep blocks; long waits use the going-to-press galley instead.

## Motion
- Keyframes are named for states, not motions: `engrave` (a horizon being set in type, opacity 0.2 → 1, staggered 0.4s per horizon) and `inking` (a status dot inking in).
- Default transition: 150ms ease on border/box-shadow/transform for hover/press. Nothing animates on scroll.
- `prefers-reduced-motion: reduce` collapses every animation/transition to 0.01ms.
