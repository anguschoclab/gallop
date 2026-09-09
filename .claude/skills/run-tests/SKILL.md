---
name: run-tests
description: Run Vitest tests for this project. Supports "unit", "integration", or a specific file/pattern. Summarizes failures clearly.
disable-model-invocation: true
---

Run the appropriate Vitest tests based on what the user specifies.

## Test locations

- **All tests**: `src/tests/` (configured in `vitest.config.ts` — matches `src/tests/**/*.test.{ts,tsx}`)
- **Integration tests**: `src/tests/integration/` (e.g. `economyInvariant.test.ts`)
- **Smoke tests**: `src/tests/smoke/` (e.g. `routeMount.smoke.test.tsx`, `storeSubscription.smoke.test.tsx`)
- **Run all tests**: `bun run test`

## Commands

**All tests:**

```bash
bun run test
```

**Specific test directory:**

```bash
bunx vitest run src/tests/<subdir>
```

Examples:
```bash
bunx vitest run src/tests/integration/
bunx vitest run src/tests/smoke/
bunx vitest run src/tests/core/
```

**Specific file or pattern:**

```bash
bunx vitest run <pattern>
```

Examples:
```bash
bunx vitest run src/tests/core/time/phases/phaseOrder.uniqueness.test.ts
bunx vitest run src/tests/components/analytics
```

## Steps

1. If the user specifies "integration", run `bunx vitest run src/tests/integration/`
2. If the user specifies "smoke", run `bunx vitest run src/tests/smoke/`
3. If the user provides a filename or keyword, pass it as the pattern
4. If no argument given, run all tests with `bun run test`
5. After running, summarize:
   - Total passed / failed / skipped
   - For each failure: test name, file, and the assertion that failed
   - Suggest likely cause if the failure is recognizable (e.g. import error, type mismatch, missing mock)
6. Note: stderr output from `saveManager` error-path tests and `economyInvariant` tests is expected (see AGENTS.md), not a failure
