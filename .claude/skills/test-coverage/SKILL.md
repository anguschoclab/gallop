---
name: test-coverage
description: Runs tests with coverage reporting
disable-model-invocation: true
---

Run tests with coverage reporting to identify untested code:

```bash
cd "/Users/amauricia/Documents/GitHub/gallop" && bun run test:coverage
```

This runs `vitest run --coverage` and produces a coverage report. Coverage is configured in `vitest.config.ts` with the `v8` provider and `text` + `html` reporters. Exclusions are defined in the config — check `vitest.config.ts` for the current exclusion list.

No coverage thresholds are currently enforced. Use the report to identify gaps and prioritize new tests for critical paths (engine, economy, AI decision-making).
