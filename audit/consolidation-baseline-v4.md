# Consolidation Baseline V4

**Date:** 2026-10-06 · **Auditor:** Devin · **Base:** `main` @ `93e3cd45` · **Branch:** `consolidation/integration-v4`

## Gate results on clean main

| Gate       | Command                    | Result                                                                                                                                                                                                      |
| ---------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck  | `bun run typecheck:errors` | **0 errors** — but only after regenerating stale `routeTree.gen.ts` via `bun run build` (3 phantom `FileRoutesByPath` errors for `race-advisor`, `track-history`, `npc-stables/rival-careers` before regen) |
| Lint       | `bun run lint`             | **99 errors on clean main** — see BUG-V4-001                                                                                                                                                                |
| Build      | `bun run build`            | clean, 12.26s                                                                                                                                                                                               |
| Unit tests | `bun run test`             | (recording — see below)                                                                                                                                                                                     |

## BUG-V4-001 — main lint is red (99 errors)

Pre-existing breakage on `main` — not introduced by consolidation:

- ~86 `prettier/prettier` formatting errors across recently committed files (`race-advisor.tsx`, `track-history.tsx`, `npc-stables.rival-careers.tsx`, `HorseBenchmarkDialog.tsx`, `TrackLedgerPrestigeTable.tsx`, `TrackLedgerRaces.tsx`, `WorldRankingsPanel.tsx`, `trackLedger.test.ts`, `raceForm.test.ts`, etc.)
- 4 layering violations (`no-restricted-syntax`): `components/insights/ScoutingInsightsPanel.tsx` (1), `components/stable/RivalCareerCompareTable.tsx` (1), `components/stable/RivalCareerMilestoneTimeline.tsx` (2) — components importing `@/core` directly
- ~9 JSDoc errors: `core/history/trackLedger.ts` (3), `core/race/raceSuitabilityScorers.ts` (3), `core/time/phases/schedulerPhase.ts` (1), `services/market/auctionHouseService.ts` (1), `data/importedRealWorld.ts` (~9)

**Correlation note:** the stray payload hunks in Mason #508 and Probe #503 touch exactly these files (`importedRealWorld.ts`, `schedulerPhase.ts`, `track-history.tsx`, `race-advisor.tsx`, `trackLedger.test.ts`, `raceForm.test.ts`) — likely agent-side lint/format fixes swept into unrelated branches. These hunks are "evaluate separately" candidates; landing an equivalent fix on this branch is cleaner.

## V3 verdict spot-checks

- `.jules/` absent from main ✓
- `routeTree.gen.ts`, `tsc-results.txt` gitignored and untracked ✓
- `audit/bug-register.md` FIXED entries spot-checked during Phase 1

## Delta since V3

`git diff 5d3dd0e0..main --stat` — 78 commits. Notable new routes requiring review: `race-advisor.tsx`, `track-history.tsx`, `npc-stables.rival-careers.tsx`, `financial-report`, `almanac`, `honors`, `bookmarks`, `calendar._regionId`.

## Final gate results (post-integration, `consolidation/integration-v4`)

| Gate                                  | Result                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `bun run typecheck:errors`            | **0 errors, 0 warnings**                                                                                                  |
| `bun run lint`                        | **0 errors** (99 baseline errors repaired)                                                                                |
| `bun run test`                        | **867 files / 9,284 pass / 1 skip / 0 fail** (vs 9,198/2fail baseline; +86 tests)                                         |
| `bun run build`                       | **PASS** — clean ~2.2s                                                                                                    |
| `bash scripts/verify.sh`              | **PASS** — all gates green                                                                                                |
| Perf spot-check (`buildFieldContext`) | **~3x faster** (0.20 → 0.07 µs/call), outputs byte-identical                                                              |
| Tree hygiene                          | no `.jules/`, no `.tmp-herald/`, no conflict markers, no lockfile changes, `routeTree.gen.ts`/`tsc-results.txt` untracked |
