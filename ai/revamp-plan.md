# Revamp plan — Almanac port (ui-revamp Phase 2, [AUTO] approval deferred)

Audit (Phase 1): audit.js clean on components/ and app/ before the port, but the shipped look was the retired dark bedrock + neon-adjacent green + Geist, rounded 1px-border flat cards, uppercase eyebrows, 4 counter tiles, a ticker card and a 3-step boxed grid (all on the DESIGN_BRIEF rejection list). Visible copy leaked dev identifiers (FeePool.totalWifBurned, Traded events, RPC, owner(), eth_call, HindsightLens.recompute).

Implementation order (Phase 3):
1. Foundation: globals.css Almanac tokens (light default, dark opt-in via data-theme="dark"), Instrument Serif + Public Sans via next/font, 2px/4px radius scale overriding Tailwind's radius tokens, pixel-offset shadow ladder, type scale with clamp(), paper grain on body, halftone ground band utility, focus-visible fallback.
2. Theme: flip the pre-paint script + toggle (store "dark" to opt in).
3. Primitives (ui.tsx): ruled Panel, offset-shadow primary Button, rule-top Stat, rule-left Notice, square Badge, inputs; hover + focus-visible on all.
4. Masthead + notice bar + colophon footer + ground band (layout/site-header).
5. Landing: lead story, honesty line, connect + lookup, Fig. 1 StrataPlate (live /api/hindsight for HISTORY_ADDR), edition figures rule line, departments, Dispatches column.
6. StrataPlate component (to scale), used on landing and the Hindsight card; CardSkeleton → going-to-press galley.
7. Stake: activation copy + epoch ruler.
8. Copy sweep + OG images palette.

Validation (Phase 4): tsc, vitest, audit.js components/app, next build, headless screenshots at 1440/375 with scrollWidth check.
