---
name: run-tests
description: Run Vitest tests for this project. Supports "unit", "integration", or a specific file/pattern. Summarizes failures clearly.
disable-model-invocation: true
---

Run the appropriate Vitest tests based on what the user specifies.

## Test locations

- **Unit tests**: `src/tests/` and `src/**/__tests__/`
- **Integration tests**: `src/integration/`
- **All tests**: run `bun run test`

## Commands

**All tests:**

```bash
bun run test
```

**Unit tests only:**

```bash
bunx vitest run src/tests/ src/**/__tests__/
```

**Integration tests only:**

```bash
bunx vitest run src/integration/
```

**Specific file or pattern:**

```bash
bunx vitest run <pattern>
```

## Steps

1. If the user specifies "unit", run unit tests only
2. If the user specifies "integration", run integration tests only
3. If the user provides a filename or keyword, pass it as the pattern
4. If no argument given, run all tests with `bun run test`
5. After running, summarize:
   - Total passed / failed / skipped
   - For each failure: test name, file, and the assertion that failed
   - Suggest likely cause if the failure is recognizable (e.g. import error, type mismatch, missing mock)
