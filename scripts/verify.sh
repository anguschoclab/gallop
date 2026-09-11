#!/usr/bin/env bash
set -euo pipefail
echo "▶ typecheck"
bunx tsc --noEmit
echo "▶ lint"
bun run lint
echo "▶ layering baseline check"
bunx vitest run src/tests/architecture/layeringRules.test.ts
echo "▶ tests"
bun run test
echo "✅ all gates green"
