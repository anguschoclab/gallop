#!/usr/bin/env bash
set -euo pipefail
echo "▶ typecheck"
bunx tsc --noEmit
echo "▶ lint"
bun run lint
echo "▶ layering baseline check"
bunx vitest run src/tests/architecture/layeringRules.test.ts
echo "▶ naming conventions check"
bunx vitest run src/tests/architecture/namingConventions.test.ts
echo "▶ data immutability check"
bunx vitest run src/tests/architecture/dataImmutability.test.ts
echo "▶ tests"
bun run test
echo "✅ all gates green"
