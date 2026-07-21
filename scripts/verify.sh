#!/usr/bin/env bash
set -euo pipefail
echo "▶ typecheck"
bunx tsc --noEmit
echo "▶ lint"
bun run lint
echo "▶ tests"
bun run test
echo "✅ all gates green"
