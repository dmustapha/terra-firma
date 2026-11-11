#!/usr/bin/env bash
# File: scripts/fork-tests.sh
# LIVE tier: contract fork tests on a Robinhood Chain mainnet 4663 fork (block FORK_BLOCK, default 111155803).
# Needs RPC_URL (falls back to GETBLOCK_RPC_FRA from ../.env.local; the URL is never printed). Runs under the
# scripts/forge.sh 600 s guard and checks the pass count against evidence/forge-test.txt.
# --write  replaces evidence/forge-test.txt with this run's output (only when 0 tests failed).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "${RPC_URL:-}" ] && [ -f "$ROOT/../.env.local" ]; then
  RPC_URL="$(grep -E '^GETBLOCK_RPC_FRA=' "$ROOT/../.env.local" | head -1 | cut -d= -f2- | tr -d '"'"'")"
fi
if [ -z "${RPC_URL:-}" ]; then echo "fork-tests: RPC_URL not set; live tier needs an archive-capable RPC" >&2; exit 1; fi
export RPC_URL
out="$(mktemp)"
"$ROOT/scripts/forge.sh" test -vv >"$out" 2>&1
code=$?
summary() { grep -oE '[0-9]+ tests passed, [0-9]+ failed' "$1" | tail -1; }
got="$(summary "$out")"; want="$(summary "$ROOT/evidence/forge-test.txt")"
echo "fork-tests: this run: ${got:-no summary} | evidence: ${want:-none}"
if [ "$code" -ne 0 ]; then tail -20 "$out"; rm -f "$out"; exit "$code"; fi
if [ "${1:-}" = "--write" ]; then cp "$out" "$ROOT/evidence/forge-test.txt"; echo "fork-tests: evidence/forge-test.txt updated"; fi
rm -f "$out"
[ "$got" = "$want" ] || { [ "${1:-}" = "--write" ] && exit 0; echo "fork-tests: DRIFT vs committed evidence" >&2; exit 1; }
