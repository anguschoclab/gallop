---
name: type-check
description: Run TypeScript type checking and report errors in a clean, parseable format. Use before commits, after refactors, or whenever you need to verify type safety. Outputs a structured report to tsc-results.txt and prints a summary with file:line:col for each error.
---

# Type Check

Run TypeScript type checking to catch type errors. Two modes:

## Quick check (just the exit code + summary)

```bash
bun run typecheck
```

Runs `tsc --noEmit` directly. Fast, but output is raw tsc format.

## Structured report (recommended for agents)

```bash
bun run typecheck:errors
```

Runs `scripts/typecheck.ts`, which:
- Executes `bunx tsc --noEmit --pretty false` (cross-platform, no global tsc needed)
- Parses every error/warning into `file:line:col  TSxxxx  message` format
- Writes a full grouped-by-file report to `tsc-results.txt`
- Prints a one-line summary to stdout (`✅ 0 errors` or `❌ N errors` with each error listed)
- Exits with tsc's exit code (0 = clean, non-zero = errors)

Add `--quiet` to suppress per-error lines on stdout (errors still go to the file):

```bash
bun run scripts/typecheck.ts --quiet
```

## Important notes

- **Never run bare `tsc`** — it is not on PATH in this environment. Always use `bunx tsc` or the npm scripts above.
- **No `cd` needed** — run from the repo root. The script resolves paths relative to itself.
- **Cross-platform** — works on Windows (PowerShell) and macOS/Linux (bash). The script auto-detects `bunx.cmd` vs `bunx`.
- Results file `tsc-results.txt` is overwritten each run (not appended).
