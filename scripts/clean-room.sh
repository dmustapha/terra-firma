#!/usr/bin/env bash
# File: scripts/clean-room.sh
# Contract rule 23: prove the repo builds and verifies from a fresh clone with no local state and no secrets.
#   1. git clone this repo into a temp dir (committed HEAD; --worktree also overlays uncommitted + untracked files)
#   2. secret scan of the clone (RPC tokens in URLs, private keys in KEY=/SECRET= style assignments, tracked .env files)
#   3. pnpm install --frozen-lockfile (root + web)
#   4. offline gate `pnpm check` with every RPC/key env var unset (typechecks, guarded forge build, unit+integration, verify-claims)
#   5. drift: regenerate web/lib/abi.ts from the fresh build and compare with the committed file; evidence.json vs
#      evidence/forge-test.txt; with --live (needs RPC_URL) re-run the fork tests and compare the pass count.
# Usage: scripts/clean-room.sh [--worktree] [--live] [--keep]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANVIL_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # documented public anvil key (PLAN.md)
WORKTREE=0 LIVE=0 KEEP=0
for a in "$@"; do
  case "$a" in
    --worktree) WORKTREE=1 ;;
    --live) LIVE=1 ;;
    --keep) KEEP=1 ;;
    *) echo "unknown flag $a" >&2; exit 2 ;;
  esac
done

TMP="$(mktemp -d "${TMPDIR:-/tmp}/tf-clean-room.XXXXXX")"
[ "$KEEP" -eq 1 ] || trap 'rm -rf "$TMP"' EXIT
REPO="$TMP/repo"
step() { printf '\n== clean-room: %s\n' "$*"; }
fail() { echo "CLEAN-ROOM FAIL: $*" >&2; exit 1; }

step "clone $(git -C "$ROOT" rev-parse --short HEAD) -> $REPO"
git clone -q "$ROOT" "$REPO"
if [ "$WORKTREE" -eq 1 ]; then
  step "overlay uncommitted + untracked files (--worktree)"
  git -C "$ROOT" diff HEAD --binary | git -C "$REPO" apply --binary --allow-empty
  (cd "$ROOT" && git ls-files --others --exclude-standard -z | tar --null -T - -cf -) | tar -xf - -C "$REPO"
fi

step "secret scan"
scan() { grep -rInE --exclude-dir=.git --exclude-dir=node_modules "$1" "$REPO" || true; }
hits="$(scan 'getblock\.io/[0-9a-fA-F]{20,}'; scan 'quiknode\.pro/[0-9a-fA-F]{20,}')"
keys="$(scan '[A-Za-z0-9_]*(KEY|SECRET|PRIVATE)[A-Za-z0-9_]*["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"']?0x[0-9a-fA-F]{64}' | grep -v "$ANVIL_KEY" || true)"
envs="$(find "$REPO" -path "$REPO/.git" -prune -o -name '.env*' ! -name '.env.example' -print)"
[ -z "$hits$keys$envs" ] || fail "possible secrets:
$hits
$keys
$envs"
echo "no RPC tokens, private-key assignments or .env files"

step "install (frozen lockfiles)"
(cd "$REPO" && pnpm install --frozen-lockfile --silent)
(cd "$REPO/web" && pnpm install --frozen-lockfile --silent)

step "offline gate: pnpm check (RPC + key env unset)"
cp "$REPO/web/lib/abi.ts" "$TMP/abi.committed.ts"
(cd "$REPO" && env -u RPC_URL -u GETBLOCK_RPC_FRA -u GETBLOCK_RPC_NYC -u GETBLOCK_WSS_FRA -u QUICKNODE_RPC \
  -u ENVIO_API_TOKEN -u DEPLOYER_KEY -u KEEPER_KEY -u DEMO_KEY pnpm check)

step "drift: regenerated evidence vs committed"
(cd "$REPO" && node scripts/export-abis.mjs >/dev/null)
cmp -s "$TMP/abi.committed.ts" "$REPO/web/lib/abi.ts" || fail "web/lib/abi.ts drifts from a fresh forge build (run node scripts/export-abis.mjs)"
echo "web/lib/abi.ts: zero drift"
count="$(grep -oE '[0-9]+ tests passed, 0 failed' "$REPO/evidence/forge-test.txt" | tail -1 | cut -d' ' -f1)"
json="$(node -e 'console.log(require(process.argv[1]).forkTests)' "$REPO/web/data/evidence.json")"
[ -n "$count" ] && [ "$count" = "$json" ] || fail "evidence.json forkTests=$json vs evidence/forge-test.txt=$count"
echo "evidence.json forkTests $json == evidence/forge-test.txt $count"
if [ "$LIVE" -eq 1 ]; then
  [ -n "${RPC_URL:-}" ] || fail "--live needs RPC_URL"
  (cd "$REPO" && scripts/fork-tests.sh)
else
  echo "fork tests: skipped (live tier; rerun with --live and RPC_URL to compare against evidence/forge-test.txt)"
fi

step "PASS"
