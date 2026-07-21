# Contributing to Gallop

## Development Setup

```bash
bun install
bun run dev
```

## Verification

Before pushing, run the full verification gate:

```bash
bun run verify
```

This runs typecheck, lint, and tests in sequence. All three must pass for CI to merge.

## Pre-push Hook (Optional)

To run `verify` automatically before every push:

```bash
git config core.hooksPath .githooks
```

To skip the hook for a single push:

```bash
git push --no-verify
```

## CI

GitHub Actions runs typecheck, lint, tests, and build on every push and pull request.
The `verify` job must pass before a PR can be merged to `main`.
