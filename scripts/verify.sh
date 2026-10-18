#!/usr/bin/env bash
set -euo pipefail
echo "▶ route generation"
bunx @tanstack/router-cli generate
echo "▶ typecheck"
bunx tsc --noEmit
echo "▶ lint"
bun run lint
echo "▶ artifact hygiene"
bun run check:no-stray-js
echo "▶ capability audit"
bun run scripts/orphan-audit.ts
echo "▶ architecture and protected-artifact gates"
bunx vitest run src/tests/architecture
echo "▶ tests"
bun run test
echo "✅ all gates green"
