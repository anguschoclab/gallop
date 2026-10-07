# Per-PR Verdicts V4 — 59 Open PRs (#451–#509)

**Date:** 2026-10-05 · **Auditor:** Devin · **Base:** `main` @ `93e3cd45`
**Branch:** `consolidation/integration-v4` (includes baseline-repair commit `9b057905`)
**Method:** authored-diff extraction via `git diff $(merge-base) branch` per branch — merge-bases differ per branch (`874fb6b8`, `8dbdd9dd`, others). GitHub 3-dot file lists are inflated by stale merge-bases. Every PR carries gitignored artifacts (`.jules/*.md`, `bun.lockb` rewrites) and ~half carry a shared stray payload (below) — all stripped on integration.

## The shared stray payload (~25 PRs)

Many branches independently committed the same bundle of fixes for main's post-V3 lint breakage: JSDoc additions in `trackLedger.ts`, `energyFormFame.ts`, `performanceCareer.ts`, `raceSuitabilityScorers.ts`, `raceAdvisor.ts`, `schedulerPhase.ts`, `auctionHouseService.ts`; layering fixes in `ScoutingInsightsPanel.tsx`, `RivalCareerCompareTable.tsx`, `RivalCareerMilestoneTimeline.tsx`, `npc-stables.rival-careers.tsx`; `importedRealWorld` service moves (to varying paths — `services/data/` or `services/storage/`); and matching edits to `trackLedger.test.ts` / `raceForm.test.ts`.

**This payload is already superseded** by baseline-repair commit `9b057905` on the integration branch, which performed the same fixes authoritatively (verified against lint/typecheck/architecture gates). Branch copies are payload-noise — adjudicated per-PR, never merged.

Two distinct stale-route-name variants appear in old branches: `npc-stables.rival-careers.tsx`/`race-advisor.tsx`/`track-history.tsx` (current naming) vs `npcStables.rivalCareers.tsx`/`raceAdvisor.tsx`/`trackHistory.tsx` (pre-V3 naming — branches #480, #495 carry these, indicating a pre-rename merge-base).

## Cluster verdicts

### Bolt cluster — `buildFieldContext` single-pass optimization (13 PRs, all equivalent)

Target: `src/core/race/runnerConditionDerivation.ts:47+`. All variants replace `filter`/`reduce`/`[...]` spread chains with a single imperative `for` loop building `live`/`moving` arrays locally and summing velocity inline. **All 13 produce semantically identical output** — verified by full-file hash comparison (13 distinct blobs, cosmetic differences only: variable naming, brace style) and hunk-level read of every variant. `moving`/`live` are locally-constructed arrays, so in-place `.sort()` does not mutate caller input; `leaderPos` stays max-position across all runners; `meanVelocity` stays 0 on empty `moving`; `velocityRank` descending + `horseId` tie-break preserved.

| PR                                           | Files                         | Verdict                                                                                                            |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| #463 bolt-optimize-build-field-context-16852 | 1 (runnerConditionDerivation) | **APPROVE — canonical** (smallest clean diff, 51 lines, clearest structure)                                        |
| #451 bolt-optimize-build-field-context-14325 | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #479 bolt-optimize-build-field-context-91488 | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #484 bolt-optimize-build-field-context-10480 | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #488 bolt/optimize-build-field-context-16373 | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #491 bolt-optimize-build-field-context-59782 | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #496 bolt-optimize-build-field-context-10048 | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #504 bolt-build-field-context-perf-11369     | 1                             | DISAPPROVE — equivalent duplicate                                                                                  |
| #459 bolt/optimize-track-field-context-77208 | 14                            | DISAPPROVE — contaminated; payload hunk is semantically identical to #463 anyway (`movingVelocitySum` rename only) |
| #464 bolt/optimize-build-field-context-21323 | 14                            | DISAPPROVE — contaminated                                                                                          |
| #468 bolt-opt-buildFieldContext-10551        | 14                            | DISAPPROVE — contaminated                                                                                          |
| #483 bolt-optimize-build-field-context-86676 | 14                            | DISAPPROVE — contaminated (payload includes its own `importedRealWorld`→services move, superseded)                 |
| #507 bolt-opt-build-field-context-85887      | 14                            | DISAPPROVE — contaminated                                                                                          |

**Test-first gate:** existing `runnerConditionDerivation` tests do not pin `liveRank` ordering or empty-`moving` `meanVelocity` — characterization tests land before this refactor (Phase 3).

### Bolt singleton — `beyer.ts` + `runnerBuilder.ts` loop conversion (1 PR)

| PR                                     | Verdict                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #474 bolt-optimize-beyer-history-14851 | **APPROVE** — clean 2-file refactor; `filter+map+reduce+Math.max(...)` → single pass computing `beyerSum`/`beyerCount`/`careerBest`. Semantics verified identical (`beyerCount >= PATTERN_JUMP_MIN_HISTORY`, avg fallback 80). Needs characterization tests for `detectPatternJump` edge cases (empty history, exactly-threshold jumps) before integration. |

### Mason cluster — `ImpactHandlerFunction` centralization (12 PRs)

Target: `ImpactHandlerFunction` type duplicated across 8 resolver handlers (`Breeding`, `Finance`, `Horse`, `Infrastructure`, `Market`, `Racing`, `Syndication`, `System`) → centralize in `src/core/resolver/handlers/types.ts`. **Handler files are byte-identical across all candidates**; only `types.ts` comment placement differs.

| PR                                                   | Files | Verdict                                                                                                                                                                                               |
| ---------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #472 mason-centralize-impact-handler-function-17079  | 9     | **APPROVE — canonical** — places the type after the `ImpactHandler` interface with an accurate doc comment ("Standard function signature for impact handling functions used in handler dictionaries") |
| #453 mason-deduplicate-impact-handler-function-96862 | 9     | DISAPPROVE — equivalent; doc comment mislabels it as "Base interface"                                                                                                                                 |
| #461 mason-centralize-impact-handler-type-93228      | 9     | DISAPPROVE — equivalent duplicate                                                                                                                                                                     |
| #481 mason-dedupe-handler-function-type-17049        | 9     | DISAPPROVE — equivalent duplicate                                                                                                                                                                     |
| #486 mason-dedupe-handler-type-63104                 | 9     | DISAPPROVE — equivalent duplicate                                                                                                                                                                     |
| #502 mason-dedup-impacthandler-16615                 | 9     | DISAPPROVE — equivalent duplicate                                                                                                                                                                     |
| #477 mason-dedupe-impact-handler-function-50098      | 36    | DISAPPROVE — contaminated; handler hunks identical to canonical                                                                                                                                       |
| #480 mason-deduplicate-impact-handler-16714          | 66    | DISAPPROVE — heavily contaminated (pre-rename route files, 11 unrelated test files, e2e specs); handler hunks identical to canonical                                                                  |
| #497 mason/dedupe-impact-handler-function-14701      | 27    | DISAPPROVE — contaminated; handler hunks identical to canonical                                                                                                                                       |
| #508 mason-dedupe-handler-type-51268                 | 29    | DISAPPROVE — contaminated (drags `race-advisor.tsx` +147, `importedRealWorld.ts`, routes); handler hunks identical to canonical                                                                       |
| #465 mason-dedup-impact-handler-10913                | 21    | DISAPPROVE — **empty payload**: zero handler/type files despite the branch name; pure stray-payload                                                                                                   |
| #495 mason/dedupe-impact-handler-function-27882      | 29    | DISAPPROVE — **empty payload**: zero handler/type files; pure stray-payload (pre-rename merge-base)                                                                                                   |

### Herald cluster — narrative content (10 PRs)

Content additions to template pools are complementary, not competing — union-merge per target file.

| PR                                                 | Target                                                                    | Verdict                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| #460 herald-directive-news-variety-69980           | directiveNewsGenerator.ts (+8 distress headlines, +8 normal, +8+8 bodies) | **APPROVE-UNION** — clean                                                                                                             |
| #466 herald-directive-news-variety-14814           | directiveNewsGenerator.ts                                                 | **APPROVE-UNION** — clean                                                                                                             |
| #471 herald/enrich-directive-news-69115            | directiveNewsGenerator.ts                                                 | **APPROVE-UNION** — clean                                                                                                             |
| #478 herald-directive-news-variety-13559           | directiveNewsGenerator.ts                                                 | **APPROVE-UNION** — clean                                                                                                             |
| #492 herald-directive-variety-88959                | directiveNewsGenerator.ts                                                 | **APPROVE-UNION** — clean                                                                                                             |
| #506 herald/enrich-directive-news-13233            | directiveNewsGenerator.ts                                                 | **APPROVE-UNION** — clean                                                                                                             |
| #485 feature/herald-directive-news-variety-80887   | directiveNewsGenerator.ts + 16 stray files                                | **APPROVE-EXTRACT** — extract its directiveNews additions into the union; discard stray payload                                       |
| #498 herald-grudge-match-defeat-news-variety-16160 | `rivalryGrudgeMatch.ts` (+6 player-loss headlines) + stray files          | **APPROVE-EXTRACT** — extract rivalryGrudgeMatch hunk only                                                                            |
| #454 herald/flavor-story-variety-17615             | `flavorStories.ts` (new entries across themes)                            | **APPROVE** — clean single-file                                                                                                       |
| #501 herald-thematic-naming-expansion-18337        | `thematicNaming.ts` patterns 4→14/theme + test update                     | **APPROVE** — clean; test is _improved_ (asserts placeholder interpolation instead of hardcoded words — robust to future pool growth) |

Union-merge rule for directiveNewsGenerator: dedupe near-identical strings (e.g. "A New Era Begins" variants), preserve all distinct templates. `rng`-selected pools — test asserts pool size growth + placeholder substitution, not exact strings.

### Palette cluster — accessibility tooltips/aria-labels (5 PRs)

| PR                                          | Scope                                                                                    | Verdict                                                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| #455 palette-aria-labels-52116              | aria-label on 3 icon-only nav buttons (CircuitWidget, HQOpsWidget, StableRosterWidget)   | **APPROVE** — clean, minimal, correct                                                                                                               |
| #500 palette-icon-button-tooltips-12865     | tooltips on PriceAlertsPanel delete, StableCompareBar clear, StewardsDigestToast dismiss | **APPROVE — canonical** — canonical Tooltip pattern (`TooltipProvider`/`asChild`), **preserves aria-labels**                                        |
| #470 palette-add-tooltips-16026             | 3 tooltip files + 17 stray                                                               | DISAPPROVE — identical tooltip scope to #500 (verified: all other component diffs are prettier/lint stray payload, zero Tooltip adds); contaminated |
| #487 palette-icon-tooltips-86709            | same 3 files + stray                                                                     | DISAPPROVE — identical duplicate; contaminated                                                                                                      |
| #458 palette-tooltip-stablecomparebar-42539 | StableCompareBar only + stray                                                            | DISAPPROVE — subset duplicate; contaminated                                                                                                         |

Correction from initial file-list triage: counting only `+Tooltip` lines reveals all four tooltip PRs cover the identical 3 files — the apparent broader coverage was stray lint payload. All variants preserve `aria-label` alongside tooltips (verified per-hunk).

### Groom cluster (3 PRs)

| PR                                               | Verdict                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #505 groom-destructive-alertdialog-actions-11162 | **APPROVE** — `buttonVariants({variant:"destructive"})` on Geld + Retire-to-Stud `AlertDialogAction`s; matches house style (V3 #385/#427 precedent)                                                                                                               |
| #456 groom-use-disabled-tooltip-wrapper-14698    | **APPROVE-EXTRACT** — real hunks: optional `aria-label` prop on existing `DisabledTooltipWrapper` + adoption in `StableRosterCompareBar` (behavior-identical refactor); discard 11 stray files                                                                    |
| #473 jules-3502437288261778609                   | **DISAPPROVE — regression** — wraps StableCompareBar clear button in tooltip but **removes `aria-label`**, then weakens the test to `container.querySelector("button:last-child")` (positional, masks the lost accessible name). #500 covers this file correctly. |

### Probe cluster — test-only additions (11 PRs)

| PR                                   | Test file                                                 | Verdict                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| #452 probe-private-sale-decision     | `privateSaleDecision.test.ts` (+60)                       | **APPROVE** — clean; tests `computePrivateSaleDecision`/`buildPrivateSaleDecisionTrace` thresholds                                               |
| #462 probe-runner-condition-grinding | `runnerConditionDerivation.test.ts`                       | **APPROVE** — clean; Grinding-condition tests; doubles as Bolt characterization coverage                                                         |
| #467 probe-award-tiebreakers         | `scoring.tiebreaker.test.ts`                              | **APPROVE** — clean; documents current insertion-order tie resolution (characterization — flags a determinism gap, see bug register)             |
| #469 probe-raceadvisor-tests         | `raceAdvisor.test.ts` (+167)                              | **APPROVE** — clean; pace-scenario tests via real `generateHorse`/`generateRace`                                                                 |
| #482 probe-jockey-effects-tests      | `jockeyEffects.test.ts`                                   | **APPROVE** — clean                                                                                                                              |
| #490 probe-awards-scoring            | `scoring.test.ts` (+5 tests)                              | **APPROVE — canonical** for scoring.test.ts union                                                                                                |
| #494 probe-wind-effects-tests        | `windEffects.test.ts` (+202)                              | **APPROVE** — clean                                                                                                                              |
| #475 probe-awards-scoring-tests      | `scoring.test.ts` (+5 _different_ tests) + 18 stray files | **APPROVE-EXTRACT** — extract the 5 unique tests (graded wins, distance eligibility); discard stray payload                                      |
| #503 probe-awards-scoring            | `scoring.test.ts` (+1 test) + stray incl. V3 audit docs   | **APPROVE-EXTRACT** — extract the SA-2YO-gender bug-documentation test only (registers a real behavioral question for the bug list)              |
| #457 probe/cross-family-affinity     | `compatibilityFactors.test.ts` (+62) + 12 stray           | **APPROVE-EXTRACT** — extract the test file; assertion values (0.4/0.8/0.6 + descriptions) verified against `compatibilityFactors.ts` in Phase 3 |
| #509 probe/awards-scoring-edge-cases | 22 files, **zero test content**                           | **DISAPPROVE — empty payload**: despite the name, the authored diff contains no award tests — only the shared stray payload                      |

### Tipster cluster (2 PRs)

| PR                               | Verdict                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #489 tipster-jockey-chemistry    | **APPROVE** — clean 5-file feature: `detectJockeyChemistry` (≥3 starts, ≥2 wins, ≥50% rate), optional `jockeyId` on `HorseInsight`, `{jockeyName}` placeholder resolved in `HorseAnalyticsSection` with "Unknown Jockey" fallback, +2 test files. Detector ordering before `detectConsistency` is a defensible priority choice. |
| #476 tipster-perfect-partnership | **APPROVE-EXTRACT** — real hunks: `Perfect Partnership` detector in `core/jockey/insights.ts` (jockey's win-rate on horse ≥ +40pp vs other riders) + its test file; checked before `Favorite Mount` — intentional priority. Discard 20 stray files.                                                                             |

### Anvil cluster (2 PRs)

| PR                                      | Verdict                                                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #493 anvil/strict-build-campaign-intent | **APPROVE** — strict discriminated-union typing on `buildCampaignIntent` (`type: TType`, payload `Omit<Extract<AnyIntent,{type:TType}>, keyof Intent                                     | "type">`). Caught a real test bug: the old test passed `targetRaceKey`where the intent field is`raceKey` — the loose generic had masked it. |
| #499 anvil-fix-auction-phase-typing     | **APPROVE** — replaces `(i as {horse:unknown}).horse) as never` with `(i as HorseCreationImpact).horse` in `auctions.ts` — removes one of the `as never` findings from the bug register. |

## Summary

| Verdict                                                  | Count | PRs                                                                                                        |
| -------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| APPROVE (canonical/clean)                                | 18    | #452, #454, #455, #462, #463, #467, #469, #472, #474, #482, #489, #490, #493, #494, #499, #500, #501, #505 |
| APPROVE-UNION (Herald content merge)                     | 6     | #460, #466, #471, #478, #492, #506                                                                         |
| APPROVE-EXTRACT (hunks from contaminated PRs)            | 7     | #456, #457, #475, #476, #485, #498, #503                                                                   |
| DISAPPROVE — equivalent duplicate                        | 15    | #451, #453, #458, #461, #470, #479, #481, #484, #486, #487, #488, #491, #496, #502, #504                   |
| DISAPPROVE — contaminated (payload superseded/identical) | 9     | #459, #464, #468, #477, #480, #483, #497, #507, #508                                                       |
| DISAPPROVE — empty/mislabeled payload                    | 3     | #465, #495, #509                                                                                           |
| DISAPPROVE — regression                                  | 1     | #473                                                                                                       |

**Integration manifest** (Phase 4 order): Bolt #463 + #474 → Mason #472 → Herald union (#460/466/471/478/485/492/506 + #498 + #454 + #501) → Palette (#455 + #500) → Groom (#505 + #456) → Probe tests → Tipster (#489 + #476) → Anvil (#493 + #499). All stray payload excluded; every hunk mapped to a Phase-3 test gate.
