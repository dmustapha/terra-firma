#!/usr/bin/env bash
# File: scripts/forge.sh
# Every forge invocation in this repo goes through here: a hard 600 s timeout (solc 0.8.26 via-IR has hung > 10 min
# on this codebase), run inside contracts/. On timeout, orphaned solc children (ppid 1, left behind by the killed forge)
# are killed so nothing keeps burning CPU. Usage: scripts/forge.sh build | scripts/forge.sh test -vv
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIMIT="${FORGE_TIMEOUT:-600}"
cd "$ROOT/contracts" || exit 1
perl -e 'alarm shift; exec @ARGV' "$LIMIT" forge "$@"
code=$?
if [ "$code" -eq 142 ]; then
  echo "forge.sh: forge $1 exceeded ${LIMIT}s and was killed" >&2
  ps -axo pid=,ppid=,command= | awk '$2 == 1 && /solc-0\.8\.26 --allow-paths/ { print $1 }' | xargs -r kill -9 2>/dev/null
fi
exit "$code"
