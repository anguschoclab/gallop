# Consolidation Baseline — `main` before integration

**Date:** 2026-09-10
**HEAD:** e0bf7341 (Refactor news seed generation with dedicated selectors)
**Working tree:** clean, up to date with `origin/main`

## Measurements

| Check                  | Command                    | Result                                                                                                   |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| Typecheck (structured) | `bun run typecheck:errors` | **0 errors, 0 warnings** (exit 0)                                                                        |
| Lint                   | `bun run lint`             | **118 errors, 0 warnings** (exit 1) — all `prettier/prettier` formatting in test files; 112 auto-fixable |
| Tests                  | `bun run test`             | **19 failed, 8767 passed, 1 skipped** (8787 total, 802 files, 8 failed) — exit 1, ~412s                  |
| Build                  | `bun run build`            | **PASS** (exit 0, ~1s nitro compile)                                                                     |

## Lint detail

All 118 lint errors are `prettier/prettier` formatting violations in test files (multi-line vs single-line formatting). Affected files:

- `src/tests/core/npc/intents/facilityWeights.test.ts`
- `src/tests/core/npc/intents/weatherScratching.test.ts`
- `src/tests/core/resolver/handlers/jockeyContractIntent.test.ts`
- `src/tests/strategy/campaignManagement.test.ts`
- `src/tests/strategy/strategyPageComponents.test.tsx`
- `src/tests/strategy/syndicationStakesModel.test.ts`

These are pre-existing on `main` (not introduced by any open PR). 112 of 118 are auto-fixable with `bun run format`.

## Open PRs (16)

All authored by `anguschoclab` via Jules bots. Zero human reviews on any PR (only the Jules greeting bot comment on each).

| #   | Branch                              | +/−      | Mergeable         |
| --- | ----------------------------------- | -------- | ----------------- |
| 397 | probe/resolve-auction-bidding-test  | +74/−7   | MERGEABLE         |
| 396 | probe-foaling-resolution            | +208/−3  | MERGEABLE         |
| 395 | bolt-optimize-blocking              | +26/−13  | CONFLICTING       |
| 394 | palette/tooltip-aria-label          | +26/−9   | MERGEABLE         |
| 393 | anvil-fix-insurance-intents-any     | +40/−13  | MERGEABLE         |
| 392 | palette-tooltip-ux                  | +0/−0    | MERGEABLE (empty) |
| 391 | bolt-runner-conditions-opt          | +33/−10  | MERGEABLE         |
| 390 | herald-flavor-enrichment            | +53/−0   | MERGEABLE         |
| 389 | probe/npc-auction-consignment-tests | +153/−0  | MERGEABLE         |
| 388 | palette-replays-a11y                | +17/−6   | CONFLICTING       |
| 387 | bolt-optimize-conditions            | +19/−8   | CONFLICTING       |
| 386 | probe-test-expenses                 | +150/−22 | CONFLICTING       |
| 385 | groom-retire-horse-alert-dialog     | +37/−12  | MERGEABLE         |
| 384 | herald-commentary-expansion         | +27/−0   | MERGEABLE         |
| 383 | probe-auction-consignment-tests     | +76/−0   | MERGEABLE         |
| 382 | anvil-fix-hqopswidget-type          | +12/−2   | MERGEABLE         |

## Known conflict hotspots (file-level overlaps across PRs)

1. **`src/components/DefaultErrorComponent.tsx`** — touched by 5 PRs (#397, #396, #395, #393, #388) + #396/#397 via probe branches. All fix the same `error: Error` → `unknown` typing.
2. **`src/core/market/priceAlerts.ts`** — touched by 3 PRs (#386, #387, #388). #388 introduces an `as any` regression.
3. **`src/tests/core/auction/auctionConsignment.test.ts`** — created from scratch by 2 PRs (#383, #389).

## Artifacts that must not enter main

- `.jules/*.md` — committed by 11 of 16 PRs (gitignored locally, but PRs add them).
- `tsc-results.txt` — committed by 2 PRs (#395, #388); **wrongly tracked in git** on main.
- #397's `.github/workflows/ci.yml` (pins bun to 1.1.27, downgrading from 1.3.14) and `bun.lockb` rewrite.

## Repo scale

- 2,059 ts/tsx files in `src/`
- 803 test files
- 496 core files, 435 components, 819 tests, 81 hooks, 67 routes, 47 game, 38 services, 37 constants

## Pre-existing failing tests (19 across 8 files) — on `main`, NOT from any PR

| File                                                        | # fail | Root cause (preliminary)                                                                                                                                             |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tests/core/time/phases/schedulerPhase.test.ts`         | 3      | Tests use `flags: {}` (object) but type is `CampaignFlag[]`; `[...campaign.flags]` throws. Also: 2nd loop in `schedulerPhase.ts:113` missing player-ownership check. |
| `src/tests/components/HorseConditionSection.test.tsx`       | 8      | _(investigate in Phase 1)_                                                                                                                                           |
| `src/tests/components/HorseBenchmarkDialog.test.tsx`        | 3      | _(investigate in Phase 1)_                                                                                                                                           |
| `src/tests/components/horse/HorseDetail.surfacing.test.tsx` | 1      | _(investigate in Phase 1)_                                                                                                                                           |
| `src/tests/core/resolver/HorseHandlerInjury.test.ts`        | 2      | _(investigate in Phase 1)_                                                                                                                                           |
| `src/tests/services/raceImpactHelpers.test.ts`              | 1      | _(investigate in Phase 1)_                                                                                                                                           |
| `src/tests/infra/packageManagerConfig.test.ts`              | 1      | `bunfig.toml` has `[test]` section (or lacks expected config)                                                                                                        |
| `src/tests/scripts/orphanAudit.test.ts`                     | 1      | Orphan audit mismatch                                                                                                                                                |
