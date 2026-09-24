# Consolidation Baseline V3 — `main` before integration

**Date:** 2026-09-22
**HEAD:** `5d3dd0e0` (Added rival-horse milestone alerts)
**Working tree:** clean, up to date with `origin/main`

## Measurements

| Check                  | Command                    | Result                                                                                                      |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Typecheck (structured) | `bun run typecheck:errors` | **PASS** — 0 errors, 0 warnings                                                                             |
| Lint                   | `bun run lint`             | **FAIL** — 19 errors, 0 warnings (17 auto-fixable `prettier/prettier`, 8 `jsdoc/require-param`… see detail) |
| Tests                  | `bun run test`             | **PASS** — 9,128 passed, 1 skipped, 0 failed (844 files). **Duration 5,639s — pathological**                |
| Build                  | `bun run build`            | **PASS** — clean nitro compile ~15s                                                                         |

## Lint detail (19 errors on main — none introduced by consolidation)

- `src/components/stable/NpcCareerTrackerPanel.tsx` — 2× `no-restricted-syntax` **layering violation** (imports `@/core/npc/careerTracker` + `@/core/horse/types` directly). PR #449 fixes this via `npcFacade`/`horseFacade`.
- `src/core/npc/careerTracker.ts` — 3× `jsdoc/require-param` (missing `@param horse`/`@param stage`).
- `src/core/stable/raceWinsBreakdown.ts` — 5× `jsdoc/require-param` (missing `@param wins`/`@param distance`).
- `src/core/horse/types.ts`, `src/core/npc/careerMilestones.ts` — 3× `prettier/prettier` (multi-line unions).
- `src/tests/components/SyndicateStakesPage.test.tsx`, `src/tests/core/npc/careerMilestones.test.ts`, `src/tests/game/store/liveRaceImpacts.test.ts` — 6× `prettier/prettier`.

**Key consequence:** these exact files appear in ~13–23 open PR diffs — every Jules bot independently committed the same lint fixes. The shared "payload" is therefore a _duplicate fix set_, not a feature. Land once on the consolidation branch (canonical = #449's approach), then all other copies are moot.

## Test-suite runtime anomaly

`src/tests/game/initialization.test.ts` took **5,439,507ms (~90min)** of the 5,639s total — `produces 160 NPC stables with worldSize: large` alone ran 4,206,850ms. V1 baseline ran the suite in ~412s. Suite wall-time has grown ~14× — candidate BUG-V3 entry (world-gen perf regression in test environment).

## Open PRs (37) — #413–#449

All authored by Jules-bot personas; **zero human reviews, zero non-bot comments** (verified all 37). Mergeable state = UNKNOWN for all at scan time (GitHub had not computed; irrelevant — integration is hunk-level, not merge-based).

## Merge-base topology

All 37 branches sit on stale merge-bases (3 cohorts by stale-deletion count vs main: ~636–659 / ~1,260–1,291 / ~1,509–1,553). Authoritative per-PR delta = `git diff $(git merge-base origin/main origin/<b>) origin/<b>` (~7–264 authored insertions per branch). GitHub PR file lists (3-dot) overstate scope.

## Authored-diff file-overlap matrix (top)

| File                                                           | # PRs  | Nature                                 |
| -------------------------------------------------------------- | ------ | -------------------------------------- |
| `src/tests/components/SyndicateStakesPage.test.tsx`            | 23     | shared prettier lint fix (payload)     |
| `src/core/stable/raceWinsBreakdown.ts`                         | 18     | shared jsdoc lint fix (payload)        |
| `src/core/npc/careerTracker.ts`                                | 13     | shared jsdoc lint fix (payload)        |
| `src/core/horse/types.ts`                                      | 13     | shared prettier fix (payload)          |
| `src/components/stable/NpcCareerTrackerPanel.tsx`              | 13     | layering fix (payload; #449 canonical) |
| `src/services/npc/npcFacade.ts`                                | 12     | facade re-export add (payload)         |
| `src/core/breeding/syndicateStakes.ts`                         | 8      | Anvil `as any` cluster                 |
| `src/core/race/runnerCondition{Derivation,Types}.ts`           | 4      | Bolt O(N²) cluster                     |
| `src/components/SidebarNav.tsx`                                | 3      | Palette AlertDialog cluster            |
| `src/core/narrative/flavorStories.ts`                          | 3      | Herald flavor cluster                  |
| `src/core/narrative/{newsGenerator,directiveNewsGenerator}.ts` | 2 each | Herald news clusters                   |
| `bun.lockb`                                                    | 3      | artifact — always strip                |

## Artifacts that must not enter main

- `.jules/*.md` — present in ~26 branches (gitignored locally; PRs add them)
- `plan_tipster.md` — #439
- `bun.lockb` rewrites — 3 branches incl. #448
- `audit/CONSOLIDATION_VERDICT_V2.md` edit — bolt-optimize-sire-analytics-dict (#415) inexplicably modifies it — strip
- any `.github/workflows/` edits (V1 saw a bun downgrade attempt — check each)

## Repo scale

- 2,460 tracked files; 2,263 under `src/`; 845 `*.test.*` files; 9,129 tests
