# AGENTS.md — Quick Reference for AI Agents

## Environment

- **Package manager**: Bun (`bun@1.3.14`). Use `bunx` to run local binaries.
- **Platform**: Windows (PowerShell). Scripts in `scripts/` are cross-platform where noted.
- **Never run bare `tsc`** — it is not on PATH. Always use `bunx tsc` or the npm scripts below.

## Verification Commands

| What | Command | Notes |
|------|---------|-------|
| **Type check (structured)** | `bun run typecheck:errors` | Runs `scripts/typecheck.ts`. Parses errors into `file:line:col TSxxxx message`, writes `tsc-results.txt`, prints summary. **Preferred for agents.** |
| Type check (raw) | `bun run typecheck` | Runs `tsc --noEmit` directly. |
| Lint | `bun run lint` | ESLint. `react-hooks`/`react-refresh` warnings are pre-existing. |
| Unit tests (all) | `bun run test` | ~8500 vitest tests, ~6min. |
| Single test file | `bunx vitest run <path>` | Iterate on one file. |
| Full verify | `bash scripts/verify.sh` | typecheck + lint + tests. Requires bash. |

## TypeScript Error Checking for Agents

The structured typecheck script (`scripts/typecheck.ts`) is designed for agent use:

```bash
bun run typecheck:errors
```

- **Exit code 0** = no type errors. Safe to proceed.
- **Exit code non-zero** = errors exist. Each error is printed as:
  ```
  ERROR  src/path/file.ts:12:34  TS1234  Some message
  ```
- Full grouped-by-file report is in `tsc-results.txt` (overwritten each run).
- Add `--quiet` to suppress per-error stdout: `bun run scripts/typecheck.ts --quiet`

## Known Gotchas

- The test suite is large but fast. Stderr from `saveManager` error-path tests is expected, not a failure.
- `bun run build` validates auto-generated `routeTree.gen.ts` — run it after adding/removing routes.
- **`bun run build` may fail with `ENOTEMPTY` on `node_modules/.nitro/`** — this is a stale cache issue, not a code error. Fix: `rm -rf node_modules/.nitro` then rebuild.
- For render-loop bugs (Zustand selector returning fresh references), see the `verify-gallop` skill.
- **`calculateNpcBid` requires a 10th `house` parameter** (`AuctionHouse | undefined`) for prestige multiplier calculations. Omitting it causes type errors and incorrect bid ceilings. See `src/core/auction/engine.ts`.
- **`calculateNetCashFlow` subtracts expenses** (not adds). The function was previously adding expenses, which inflated cash flow. See `src/core/transactions/transactionTypes.ts`.
- **`RivalIntelTab` uses `playerDominance` and `type`** (not `playerStrength` and `action`). The wrong property names rendered as 0% and undefined. See `src/components/stable/RivalIntelTab.tsx`.
- **`.jules/` artifacts must not enter `main`** — all AI agent PRs (Bolt, Anvil, Herald, Palette, Groom, Probe) add `.jules/*.md` files. These are gitignored. Strip them from any cherry-pick or merge.
- **`routeTree.gen.ts` is auto-generated and gitignored** — never commit it. It regenerates on `bun run build`.
- **Adding a pipeline phase beyond the current max order**: You must update FOUR places or the phase will silently never execute:
  1. `src/constants/pipelineConstants.ts` — add a `PHASE_ORDER_*` constant with the new order value.
  2. `src/workers/pipelineStages.ts` — extend the `STAGE_RANGES` `max` for the relevant stage (or add a new stage). Without this, the phase falls outside all stage ranges and is dropped from both the worker and `runPipelineForDay`.
  3. `src/core/time/phases/index.ts` — import and register the phase in `GAME_PIPELINE_PHASES`.
  4. Update test assertions: `src/tests/orphanScan.test.ts` (exact phase count), `src/tests/core/time/phases/phaseOrder.uniqueness.test.ts` (max order range), `src/tests/workers/engineWorker.stages.test.ts` (stage boundary), and `src/tests/smoke/routeMount.smoke.test.tsx` (if a new route file was also added).
