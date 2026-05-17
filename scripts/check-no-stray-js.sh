#!/usr/bin/env bash
# check-no-stray-js.sh — Fail if compiled .js artifacts appear in src/ outside
# the legitimate vendor folder src/assets/ (which intentionally ships .js).
#
# Source modules are authored in .ts/.tsx; tsconfig.json sets "noEmit": true,
# so any stray .js file under src/ is almost certainly a build artifact that
# would shadow its .ts sibling under Vite's module resolution.
set -euo pipefail

STRAY=$(find src -name "*.js" -not -path "src/assets/*" 2>/dev/null || true)
if [ -n "$STRAY" ]; then
  echo "ERROR: stray compiled .js files detected in src/ (outside src/assets/):"
  echo "$STRAY"
  echo
  echo "Source modules must be authored as .ts/.tsx. Delete these or move them"
  echo "to src/assets/ if they are intentional vendor scripts."
  exit 1
fi
echo "OK: no stray .js files under src/."
