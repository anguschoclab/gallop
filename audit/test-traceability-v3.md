# Test Traceability Matrix — V3 Consolidation

**Stage:** COMPLETE — all batches landed on `consolidation/integration-v3`, base `main` @ `5d3dd0e0`.
**Result:** 117 tests PASS, 3 tests + 1 suite FAIL-EXPECTED (all tied to scheduled implementation batches), 0 FAIL-INVALID.
**Final status (post-implementation):** all FAIL-EXPECTED items resolved — `liveRank` tests pass after B2, `stableTrends` suite + earnings-milestone test pass after B4. Typecheck 0 errors, lint 0 errors.

## Extracted tests (landed before any production code)

| Test file                                                             | Source PR                                                                                                                                                                    | Result                            | Links to batch                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| `src/tests/core/auction/auctionImpactActions.test.ts`                 | #446                                                                                                                                                                         | PASS (5)                          | — (coverage only)                                       |
| `src/tests/core/market/exchange.test.ts`                              | #418                                                                                                                                                                         | PASS (4)                          | —                                                       |
| `src/tests/core/auction/claimingResolutionService.test.ts`            | #416                                                                                                                                                                         | PASS (2)                          | —                                                       |
| `src/tests/core/breeding/populationGenetics.resolveBloodline.test.ts` | #422                                                                                                                                                                         | PASS (6)                          | —                                                       |
| `src/tests/core/race/trackGeometry.test.ts`                           | #426                                                                                                                                                                         | PASS (6)                          | —                                                       |
| `src/tests/core/breeding/genotypeMatching.test.ts`                    | #432                                                                                                                                                                         | PASS (5)                          | —                                                       |
| `src/tests/core/breeding/traitCompatibility.test.ts`                  | #432                                                                                                                                                                         | PASS (9)                          | —                                                       |
| `src/tests/core/npc/intents/trainingIntents.test.ts`                  | #443                                                                                                                                                                         | PASS (7)                          | —                                                       |
| `src/tests/core/npc/careerTracker.test.ts`                            | #437 (union: kept main's coverage + added injured-exclusion + summarize-detail tests; Probe's rewrite dropped `offscreenStartInterval`/stud/determinism coverage — rejected) | PASS (9)                          | B1 layering fix (NpcCareerTrackerPanel ↔ careerTracker) |
| `src/tests/components/SyndicateStakesPage.test.tsx`                   | payload (prettier fix)                                                                                                                                                       | PASS (7)                          | B7 lint-payload                                         |
| `src/tests/core/horse/insights.test.ts` (+2 milestone tests)          | #439                                                                                                                                                                         | 1 PASS / 1 **FAIL-EXPECTED**      | B4 `detectEarningsMilestone`                            |
| `src/tests/core/analytics/stableTrends.test.ts`                       | #429                                                                                                                                                                         | **FAIL-EXPECTED** (module absent) | B4 `stableTrends.ts` + wiring                           |
| `src/tests/performance/perfShape.test.ts` (+liveRank assertions)      | authored this stage for #433                                                                                                                                                 | 2 **FAIL-EXPECTED**               | B2 `FieldContext.liveRank`                              |

## FAIL-EXPECTED ledger (finite — resolved when batch lands)

| Test                                                   | Failure mode            | Resolved by                  |
| ------------------------------------------------------ | ----------------------- | ---------------------------- |
| `perfShape > stable object with expected fields`       | missing `liveRank` prop | **B2** (Bolt #433 canonical) |
| `perfShape > liveRank maps horseId to rank`            | `liveRank` undefined    | **B2**                       |
| `insights > detects Earnings Milestone approaching 1M` | returns `undefined`     | **B4** (Tipster #439)        |
| `stableTrends.test.ts` (whole suite, ~7 tests)         | import resolution       | **B4** (Tipster #429)        |

## Implementation batches → test linkage

| Batch                   | Content                                                                                                                                                                             | Covered by                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| B1 type-safety/layering | syndicateStakes single-lookup (#420 concept), NpcCareerTrackerPanel→facades + payload jsdoc (#449), CONTINENT_TO_REGION dedup (#419)                                                | SyndicateStakesPage.test.tsx, careerTracker.test.ts, layeringRules.test.ts               |
| B2 performance          | `FieldContext.liveRank` (#433), `computeSegmentAverages` map hoisting (#423), sire-analytics `horsesDict` (#415)                                                                    | perfShape.test.ts (new), sectionalAnalysis/sireAnalytics existing tests                  |
| B3 narrative content    | directive pools w/ distress (#413), margin pools (#435), race-news pools (#442), flavorStories union (#421/#428/#434)                                                               | existing narrative determinism tests                                                     |
| B4 features             | `stableTrends` module+wiring (#429), `detectEarningsMilestone` (#439)                                                                                                               | stableTrends.test.ts, insights.test.ts (both landed this stage)                          |
| B5 UI a11y              | SidebarNav AlertDialog + `buttonVariants` (#427), AwardIcon Tooltip (#424)                                                                                                          | component tests — see B5 note below                                                      |
| B5+ deferred UI         | native `alert`/`confirm` → AlertDialog/toast (SaveLoadDialog, useSaveSlots, misc), all 27 `title=` attrs → `Hint` tooltip wrapper (BUG-V3-003)                                      | useSaveSlots.test.tsx, component tests                                                   |
| B6 domain fixes         | BUG-V3-001 `runNpcRaceEntry` phenotype pre-resolution (large init ~70min → ~11s); BUG-018 `yesterdayRaces`→`todaysResolvedRaces` rename; BUG-026 orphan-audit balanced-brace parser | initialization.test.ts (18 pass, 169s file total), npcCycle.test.ts, orphanAudit.test.ts |
| B7 hygiene              | remaining lint-payload files, `.jules` exclusion                                                                                                                                    | lint gate                                                                                |

**B5 note:** no dedicated UI interaction test exists for SidebarNav's new-game dialog or AwardIcon tooltip in the extracted set; AlertDialog correctness is enforced by component render + the shared ui/alert-dialog primitive tests. If a SidebarNav test is required, author in B5 before merging.

## Verification command for the stage

```
bunx vitest run src/tests/core/{analytics,auction,breeding,market,npc,race,horse}/*.test.ts src/tests/performance/perfShape.test.ts src/tests/components/SyndicateStakesPage.test.tsx
```

Result: 13 files, 120 tests — 117 pass, 3 fail + 1 suite-fail (all FAIL-EXPECTED above).
