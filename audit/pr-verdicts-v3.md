# Per-PR Verdicts V3 — 37 Open PRs (#413–#449)

**Date:** 2026-09-22 · **Auditor:** Devin · **Base:** `main` @ `5d3dd0e0`
**Method:** authored-diff extraction via `git diff $(merge-base) branch` — GitHub 3-dot file lists are inflated by stale merge-bases. Every PR carries gitignored artifacts (`.jules/*.md`) and most carry a shared lint-fix payload (see below) — all stripped on integration.

## The shared lint-fix payload (23 PRs)

`main` currently fails lint with 19 errors (see `consolidation-baseline-v3.md`). ~23 branches independently committed the same fixes: JSDoc `@param` additions in `careerTracker.ts`/`raceWinsBreakdown.ts`, prettier reformatting in `horse/types.ts`/`SyndicateStakesPage.test.tsx`/`careerMilestones*.ts`/`liveRaceImpacts.test.ts`, and the `NpcCareerTrackerPanel` layering fix + `npcFacade` re-export.

**Canonical implementation: #449 (Mason).** All other copies are duplicates — adjudicated per-PR as payload-noise, not scored against the PR's actual purpose.

## Cluster verdicts

### Anvil cluster — `syndicateStakes.ts` `as any` removal (8 PRs)

Target: lines 148/174 — dual-key lookups `record[playerKey] ?? (record as any)[playerStableId]`.
Since `OwnerKey = string` and `asPlayerOwnerId`/`asOwnerKey` are identity casts, `playerKey === playerOwnerKey` at runtime — the fallback is **dead code**. Correct simplification: single lookup `record?.[asOwnerKey(playerStableId)] ?? 0`.

| PR                                           | Diff                                                       | Verdict                                                                        |
| -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| #420 anvil-owner-key-indexing                | hoists `playerOwnerKey` const; both sites                  | **APPROVE — canonical** (concept; implemented as single-lookup simplification) |
| #414 anvil-remove-as-any-ownerkey            | identical blob `1cf65724`                                  | DISAPPROVE — duplicate                                                         |
| #417 anvil-syndicate-stakes-types            | identical blob `1cf65724`                                  | DISAPPROVE — duplicate                                                         |
| #425 jules-12188758965740169312              | same + redundant `as number[]`/`(sum: number)` annotations | DISAPPROVE — duplicate + adds casts                                            |
| #431 anvil-fix-syndicate-any-cast            | identical blob `1cf65724`                                  | DISAPPROVE — duplicate                                                         |
| #440 anvil-branded-key-indexing              | identical blob `1cf65724`                                  | DISAPPROVE — duplicate                                                         |
| #441 anvil-syndicate-stakes-type-safety-3966 | identical blob `1cf65724`                                  | DISAPPROVE — duplicate                                                         |
| #445 anvil-syndicate-stakes-type-safety-1179 | identical blob `1cf65724`                                  | DISAPPROVE — duplicate                                                         |

### Bolt cluster — runner-condition O(N²) (4 PRs)

All four add `liveRank: Map<horseId, idx>` to `FieldContext`, populate in `buildFieldContext`, replace `sortedLive.findIndex` in `nearestRival`/`isBlocked` with O(1) map gets. Functionally identical; only JSDoc wording + field placement differ.

| PR                                              | Verdict                           |
| ----------------------------------------------- | --------------------------------- |
| #433 bolt-optimize-runner-conditions-derivation | **APPROVE — canonical**           |
| #438 bolt-optimize-field-context                | DISAPPROVE — equivalent duplicate |
| #444 bolt-optimize-runner-conditions            | DISAPPROVE — equivalent duplicate |
| #447 bolt-runner-conditions-optimization        | DISAPPROVE — equivalent duplicate |

Safety: `FieldContext` consumers (Track.tsx, runnerMood, useConditionTimeline, useInRunningSnapshots, narrativeConditionChecks) all receive it from `buildFieldContext`; no manual construction. `perfShape.test.ts` asserts field presence — extend it to assert `liveRank` (test-first).

### Palette cluster — `SidebarNav.tsx` AlertDialog (3 PRs)

| PR                                       | Approach                                                         | Verdict                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| #427 palette-start-new-game-alert-dialog | `AlertDialog` + `buttonVariants({variant:"destructive"})`        | **APPROVE — canonical** (design-system variant; matches groom #385 pattern)                                  |
| #436 palette-alertdialog-start-new-game  | identical to #427                                                | DISAPPROVE — duplicate                                                                                       |
| #430 palette-alert-dialog-start-new-game | hand-rolled `bg-destructive text-destructive-foreground` classes | DISAPPROVE — inferior; diverges from both `buttonVariants` and the codebase's destructive-action house style |

### Herald clusters — content (7 PRs)

Content additions don't compete — union where non-overlapping.

| PR                                  | Scope                                                                                   | Verdict                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| #413 herald-directive-news-variety  | directiveNewsGenerator: 8+8 templates **with distress-aware pools** (`isDistressShift`) | **APPROVE — canonical**                                 |
| #448 herald-directive-variety       | same function: 6+6 single-pool, no distress branching; carries `bun.lockb` rewrite      | DISAPPROVE — inferior; strip lockfile                   |
| #435 herald/expand-race-margin-news | newsGenerator: margin-flavor pools (annihilation + photo-finish)                        | **APPROVE** — non-conflicting                           |
| #442 herald/race-news-variety       | newsGenerator: generic winner headline/body pools                                       | **APPROVE** — different section, union with #435        |
| #421 herald-flavor-story            | flavorStories: new theme + entries                                                      | **APPROVE-UNION**                                       |
| #428 herald/flavor-stories-variety  | flavorStories: 4 hunks (themes + 3 sections)                                            | **APPROVE-UNION** — dedupe vs #421/#434 at lines 11/183 |
| #434 herald-jockey-flavor           | flavorStories: jockey entries at ~l.183                                                 | **APPROVE-UNION** — reconcile hunk overlap with #428    |

### Probe cluster — test-only (8 PRs)

| PR                       | New tests                                                             | Verdict                                   |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------- |
| #416 claiming-resolution | `claimingResolutionService.test.ts` (+123)                            | **APPROVE**                               |
| #418 market-depth        | `exchange.test.ts` (+256)                                             | **APPROVE**                               |
| #422 resolve-bloodline   | `populationGenetics.resolveBloodline.test.ts` (+119)                  | **APPROVE** (also supersedes closed #334) |
| #426 track-geometry      | `trackGeometry.test.ts` (+61)                                         | **APPROVE**                               |
| #432 breeding-compat     | `genotypeMatching.test.ts` (+105), `traitCompatibility.test.ts` (+88) | **APPROVE**                               |
| #437 npc-career-tracker  | `careerTracker.test.ts` (+116)                                        | **APPROVE** (strip payload)               |
| #443 training-intents    | `trainingIntents.test.ts` (+163)                                      | **APPROVE** (strip payload)               |
| #446 auction-impact      | `auctionImpactActions.test.ts` (+115)                                 | **APPROVE**                               |

All extracted in the test-first stage and run against unmodified main before any implementation lands.

### Singletons

| PR                                     | Scope                                                                                                                                                                                             | Verdict                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| #415 bolt-optimize-sire-analytics-dict | optional `horsesDict` param through `calculateAei`/`calculateCi`/`classifySire`/`getSireSurfaceBias`/`getSireDistancePreference`; caller updates in SireWatchTab + `sire-watch.$stallionId` route | **PARTIAL APPROVE** — take core + callers; STRIP `audit/CONSOLIDATION_VERDICT_V2.md` prettier churn + `.jules`         |
| #423 bolt-optimize-sectional-analysis  | `computeSegmentAverages`: removes per-snapshot `new Map` allocation; iterates `snap.horses` with `result.get` guard                                                                               | **APPROVE**                                                                                                            |
| #424 groom/awardicon-tooltip           | native `title` → `Tooltip` in AwardIcon                                                                                                                                                           | **APPROVE** — clean 1-file change                                                                                      |
| #419 jules mason dedup                 | `CONTINENT_TO_REGION` deduplicated into `awards/types.ts`; invitations.ts + scoring.ts import it                                                                                                  | **APPROVE**                                                                                                            |
| #429 tipster-stable-trends             | new `core/analytics/stableTrends.ts` + AnalyticsRacingTab section + useAnalyticsData wiring + 80-line test                                                                                        | **APPROVE**                                                                                                            |
| #439 tipster-earnings-milestone        | `detectEarningsMilestone` detector + registry entry + insights test                                                                                                                               | **PARTIAL APPROVE** — take detector+test; STRIP `plan_tipster.md`, payload files; fix `// 5.`/`// 4.` comment ordering |
| #449 mason layering fix                | NpcCareerTrackerPanel → facades + `npcFacade` re-export + payload jsdoc                                                                                                                           | **APPROVE — canonical for the lint payload**                                                                           |

## Summary

| Verdict                         | Count       | PRs                                                                                                                            |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| APPROVE                         | 20          | #413,#415(part),#416,#418,#419,#420,#421,#422,#423,#424,#426,#427,#428,#429,#432,#434,#435,#437,#439(part),#442,#443,#446,#449 |
| PARTIAL (strip artifacts/hunks) | incl. above | #415, #439 + every PR's `.jules`/payload/lockfile                                                                              |
| DISAPPROVE (duplicate/inferior) | 14          | #414,#417,#425,#430,#431,#436,#438,#440,#441,#444,#445,#447,#448 (+#425 counted once)                                          |
| Empty/mislabeled                | 0           | —                                                                                                                              |

Net: 13 PRs' unique value lands (content PRs unioned); 14 closed as superseded; artifacts stripped everywhere.
