# AGENTS.md — Quick Reference for AI Agents

## Environment

- **Package manager**: Bun (`bun@1.3.14`). Use `bunx` to run local binaries.
- **Platform**: Windows (PowerShell). Scripts in `scripts/` are cross-platform where noted.
- **Never run bare `tsc`** — it is not on PATH. Always use `bunx tsc` or the npm scripts below.

## Verification Commands

| What                        | Command                    | Notes                                                                                                                                               |
| --------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type check (structured)** | `bun run typecheck:errors` | Runs `scripts/typecheck.ts`. Parses errors into `file:line:col TSxxxx message`, writes `tsc-results.txt`, prints summary. **Preferred for agents.** |
| Type check (raw)            | `bun run typecheck`        | Runs `tsc --noEmit` directly.                                                                                                                       |
| Lint                        | `bun run lint`             | ESLint. `react-hooks`/`react-refresh` warnings are pre-existing.                                                                                    |
| Unit tests (all)            | `bun run test`             | ~8500 vitest tests, ~6min.                                                                                                                          |
| Single test file            | `bunx vitest run <path>`   | Iterate on one file.                                                                                                                                |
| Full verify                 | `bash scripts/verify.sh`   | typecheck + lint + tests. Requires bash.                                                                                                            |

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

## Lint Guardrails

- `eslint-plugin-unused-imports` is configured in `eslint.config.js` (`unused-imports/no-unused-imports: "warn"`). `bun run lint` reports unused imports; `bunx eslint . --fix` strips them safely. `@typescript-eslint/no-unused-vars` stays `off` so the two rules don't conflict.

## Known Gotchas

- NPC career timelines derive from race history and age boundaries.
- Rankings comparisons use exact-day snapshots; retain leaders and all player horses (null rank when unranked) to avoid substituting current values.

- The test suite is large but fast. Stderr from `saveManager` error-path tests is expected, not a failure.
- `bun run build` validates auto-generated `routeTree.gen.ts` — run it after adding/removing routes.
- **`bun run build` may fail with `ENOTEMPTY` on `node_modules/.nitro/`** — this is a stale cache issue, not a code error. Fix: `rm -rf node_modules/.nitro` then rebuild.
- For render-loop bugs (Zustand selector returning fresh references), see the `verify-gallop` skill.
- **`calculateNpcBid` requires a 10th `house` parameter** (`AuctionHouse | undefined`) for prestige multiplier calculations. Omitting it causes type errors and incorrect bid ceilings. See `src/core/auction/engine.ts`.
- **`calculateNetCashFlow` subtracts expenses** (not adds). The function was previously adding expenses, which inflated cash flow. See `src/core/transactions/transactionTypes.ts`.
- **`RivalIntelTab` uses `playerDominance` and `type`** (not `playerStrength` and `action`). The wrong property names rendered as 0% and undefined. See `src/components/stable/RivalIntelTab.tsx`.
- **`.jules/` artifacts must not enter `main`** — all AI agent PRs (Bolt, Anvil, Herald, Palette, Groom, Probe) add `.jules/*.md` files. These are gitignored. Strip them from any cherry-pick or merge.
- **`routeTree.gen.ts` is auto-generated and gitignored** — never commit it. It regenerates on `bun run build`.
- **Adding a pipeline phase**: Phases are registered declaratively — numeric stage ranges no longer exist (`src/workers/pipelineStages.ts` was removed). To add a phase:
  1. Create the `PipelinePhase` in `src/core/time/phases/` and register it in `src/core/time/phases/index.ts` (`GAME_PIPELINE_PHASES`).
  2. Add a matching `PhaseDescriptor` in `src/core/time/phases/descriptors.ts` (`GAME_PHASE_DESCRIPTORS`) declaring cadence, dependencies, products, and read/write sets. `src/tests/core/time/descriptors.coverage.test.ts` fails if any registered phase lacks a descriptor.
  3. Update `src/tests/orphanScan.test.ts` (exact phase count) and `src/tests/core/time/phases/phaseOrder.uniqueness.test.ts` if order assertions change.
- **Advance execution path**: UI actions → `EngineClient` (`src/core/engine/client.ts`) → `WorkerTransport`/`LocalTransport` (`src/core/engine/transports.ts`) → `SimulationEngine` (`src/core/engine/engine.ts`) → `SimulationExecutor` (`src/core/time/executor.ts`). There is no synchronous fallback path — `LocalTransport` hosts the same engine in-process.
- **Retained engine world**: the engine keeps the last committed `GameState` (`loadWorld` seeds/rebases it). Store commands omit `state` when `engineWorldSynced` (`src/game/store/engineSync.ts`) proves identity — only the first command after load/new-game or a store-side mutation ships a snapshot. `log` is intentionally unsynced (store enriches it post-commit). `stale_base_revision` rejections rebase via `loadWorld` then retry. Mutate store fields immutably — in-place mutation under an unchanged top-level reference defeats the identity check and desyncs the engine's world.
- **Live race commit**: `resolveRaceWithImpacts` submits a `resolveLiveRace` engine command; `applyLiveRaceResolution` (`src/core/race/liveResolution.ts`) applies player-facing impacts once and queues a `race_resolution` intent carrying `runners`/`liveImpactsApplied` so the resolution phase neither re-simulates nor double-applies. `engineRevision` is session-transient — never add it to `PERSISTED_KEYS` (a persisted high revision makes the fresh post-reload engine reject every command as stale).
- **Determinism**: entity ids minted during a day transaction draw from a per-day seeded UUID stream (`withUuidStream` in `src/core/uuid.ts`, installed by the executor). Never call `crypto.randomUUID()` inside simulation code — use `generateUUID()` so same-seed runs stay checksum-identical.
- **Benchmarks**: `bun run scripts/benchAdvance.ts` measures days/sec for 1/7/30/365-day advances across small/medium/large worlds and hard-fails on same-seed checksum divergence. `bun run bench:race` (`scripts/benchRace.ts`) measures fixed-step tick p95 and per-step heap. `scripts/profilePhases.ts [days] [size]` reports per-phase telemetry shares; `scripts/stateFingerprint.ts [days] [size]` prints a post-advance state checksum for cross-revision determinism comparisons (fixture entity ids are seeded, so checksums are comparable across processes).
- **Fixture determinism**: `createInitialState` mints entity UUIDs via the ambient stream — any script/test that compares two worlds must wrap fixture creation in `withUuidStream(createRng(hashStr(seed)), ...)` or the comparison measures fixture randomness, not simulation divergence.
