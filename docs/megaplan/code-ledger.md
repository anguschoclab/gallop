# Megaplan Code Ledger

Per-file review ledger. Verdicts: `clean` / `fixed:<id>` / `noted:<smell>` / `generated` / `data` / `asset`.
Findings with BUG IDs were fixed in Phase 4; SMELLs are documented only.

## src/shared — COMPLETE (see review-notes.md)

Verdict summary: `Brand<T,_B>=T` structural (documented; Anvil PRs are style-only); `fixed:BUG-1` dead `generateUUIDWithValidation` w/ CJS `require` deleted; uuidRegistry retained (self-tested infra).

## src/platform

| Area | Status |
| --- | --- |
| engine/{client,engine,protocol,transports,workerPool}.ts | clean (APPROVED — exemplary) |
| game/store/{engineSync,engineClient,postCommit,stateVersion,persistedKeys}.ts | clean w/ notes |
| time/{checksum,executor,advancePlan,scheduler,pipeline,advance,calendar}.ts | clean |
| persistence/{npcCompression,storage/*} | `fixed:BUG-2` npcCompression now persists/restores energy/fitness/fatigue/form/peakingIndex/recoveryPoints |
| time/phases/* (~25 reviewed) | `fixed:BUG-3` hallOfFame year off-by-one; `fixed` jockeyPhase `+90`→JOCKEY_CONTRACT_DAYS; smells noted |

## src/domains — see review-notes.md rollup

| Port | Status |
| --- | --- |
| resolver handlers (Diplomacy/Inbox dict routing) | ported (PR #568) |
| rankings branded-ID cast removal | ported (PR #563) |
| getDynamicProfile spread removal | ported (PR #557) |
| TransactionArchive topLot O(N) | ported (PR #570) |
| AuctionHouseDesk sale confirmation | ported (PR #556) |
| PrivateTrialDialog DisabledTooltipWrapper | ported (PR #559) |
| aria-labels (AuctionSalePage, DebtBanner, TransactionLedger) | ported (PRs #567, #572) |
| narrative template expansions (context/lead-surge/atmosphere) | ported (PRs #553, #560, #565) |
| insight detectors (distance-change; tiered earnings-per-start) | ported+merged (PRs #551, #566, #569) |

## src/routes, src/tests, scripts/, configs — see review-notes.md rollup

| Area | Status |
| --- | --- |
| routes/ | clean (generated routeTree gitignored) |
| tests/ architecture + layering | clean, zero violations |
| scripts/ (fingerprint, bench, typecheck) | clean |
| .github/workflows/ci.yml | `fixed` e2e fixture generation step added; linux baselines committed (PR #566-CI) |

## 2026-11-09 marker-scan batch

| Area | Status |
| --- | --- |
| platform/time/phases/raceResolution.ts + domains/race/simulation/liveResolution.ts | `fixed` live-race snapshots survive impact application (`snapshots: []` → intent/payload snapshots); live race_history entries gain pacePositions via sectionalSplits |
| tests/core/race/replayPersistence.test.ts | `fixed` gap-documenting tautology replaced by phase+applyImpacts round-trip regression tests |
| tests marker comments (inheritance, RivalIntelTab, scoring.tiebreaker, horseCareerValuation) | clean — BUG/FIX phrasing reworded to regression wording; repo scans 0 markers |
| generate_todos.py / search_todos.py | recreated repo-root marker-scan + query tools (originals never committed — unrecoverable) |

## 2026-11-10 perf-scan batch (bot findings triage)

20 findings in two patterns (`includes()` in filter/find → O(N*M); `Object.values(horses).filter()` → extra full-record scans). Audit: 10 fixed, 9 false-positive/negligible, 1 kept-optimized. All scans iterate `Object.values(state.horses)` — **never `context.horseMap`** (day-start snapshot; `state.horses` is replaced mid-pipeline by energy/raceResolution/npcCycle/archiving/exchangeSettlement). Determinism gate: `stateFingerprint.ts 90 large` checksum `ffae9318` identical before/after.

| Finding | Verdict |
| --- | --- |
| platform/time/scheduler.ts:190 `result.includes(d)` | `fixed` Set lookup (cold cycle-error path; identity-safe — same descriptor refs) |
| domains/agents/ui/AiActivityFeed.tsx:15 | `fixed` `NPC_CATEGORIES` → `ReadonlySet` + `.has()` |
| domains/dashboard/ui/AIActivityStrip.tsx:15 | `fixed` (unflagged identical twin — same change) |
| platform/time/phases/pastureRetirement.ts:109,165 | `fixed` two full-record scans merged into one pass (npcHorses + horsesToDelete, order preserved) |
| platform/time/phases/upkeep.ts:54 | `fixed` playerHorses filter + NPC-count loop merged into one pass |
| platform/time/phases/schedulerPhase.ts:82 | `fixed` for-of push (auto-entry path; fingerprint-invisible — unit test is sole guard) |
| platform/time/phases/stallionRetirement.ts:32 | `fixed` intermediate array dropped — direct for-of + guard |
| platform/time/phases/solvency.ts:262 | `fixed` filter+reduce → single-pass counters (insolvency-only path) |
| routes/strategyJournal.tsx:74 | `fixed` for-of inside existing useMemo |
| routes/race-advisor.tsx:59 | `fixed` for-of inside existing useMemo |
| routes/sire-watch.$stallionId.tsx:23 | `kept-optimized` `allStallions` is dead code — retained per owner decision, now memoized off shared `allHorses` (reused by `getSireAnalytics`); future-removal candidate |
| platform/time/advanceDayHelpers.ts:54 | `kept-optimized` `calculatePlayerUpkeep` has zero callers — retained per owner decision, body now single-pass count; future-removal candidate |
| routes/rankings-history.tsx:106→111 | `false-positive:string-includes` `name.includes(q)` is substring search, not array membership |
| domains/history/ui/AlmanacMilestones.tsx:22 | `false-positive:string-includes` |
| domains/agents/ui/pages/NpcStablesCompare.tsx:17 | `false-positive:string-includes` |
| routes/stable-rankings.tsx:123 | `false-positive:string-includes` |
| domains/dashboard/ui/RegionDrilldownDrawer.tsx:159 (+:253) | `negligible:tiny-N` `surfaceFilter` ⊆ `ALL_SURFACES` (3 elems); Set costs more than scan |
| domains/agents/ui/DiplomacyPanel.tsx:103 | `negligible:tiny-N` cartels×members ~ tens; per-cartel Set pointless |
| domains/agents/ui/RelationshipGraph.tsx:40 | `negligible:tiny-N` same pattern |
| domains/agents/simulation/trainingAI.ts:150 | `negligible:tiny-N` fixed 3-key record × ≤3 availableTypes; Set-per-call strictly worse |

Test-first protocol used: 4 new characterization tests written and green on unmodified code before any refactor (schedulerPhase `runDailyAutoEntry` filter, upkeep lifecycle exclusion, pastureRetirement scan ordering, new `advanceDayHelpers.test.ts`). Verification: typecheck 0 errors; 547 targeted tests pass; lint clean; fingerprint identical. Expected impact is modest hygiene — ~1–2 fewer 2–3k-element scans/day across 4 daily phases — not algorithmic wins.

## 2026-11-10 complexity-scan batch (bot findings triage)

20 findings, one pattern: functions exceeding the 150-line threshold needing helper extraction. Audit: all 20 `fixed` via extraction into focused hooks/sub-components; zero behavior changes. 4 dead-code items removed in the same pass. Test-first protocol used: 6 characterization tests written and green on unmodified code before any refactor (useAuctionTheater hook, AuctionTheater render, useSeasonPlanner hook, BiddingPanel, AuctionSalePage sale-found path, BreedingCompatibilityCard), plus BookmarksFilter.test.ts rewired onto the canonical model function.

| Finding | Verdict |
| --- | --- |
| domains/auction/application/hooks/useAuctionSaleData.ts:17 (207) | `fixed` bid/withdraw/buy-now actions + transient feedback → `useAuctionSaleActions`; hook now composes |
| domains/auction/application/hooks/useAuctionTheater.ts:25 (246) | `fixed` → `useTheaterUiState` + `useAuctionRunnerLifecycle` + `useTheaterHotkeys`; dual forceTick + handleSkip shadowing preserved exactly |
| domains/auction/ui/AuctionTheater.tsx:36 (281) | `fixed` → sub/{TheaterLiveView,TheaterRingCard,TheaterSideColumn,TheaterNotFound,TheaterFinished}; dead `horses` selector removed |
| domains/auction/ui/pages/AuctionSalePage.tsx:19 (204) | `fixed` → in-file SaleNotFound/SaleDetailContent/MissingHorse/EmptyLots sections |
| domains/auction/ui/UpcomingLedgerTable.tsx:29 (162) | `fixed` → in-file header/row/section helpers |
| domains/auction/ui/PrivateSaleOfferDialog.tsx:62 (182) | `fixed` → AttachmentSummary/QuickOffers/OfferOverride/OfferAmountField |
| domains/auction/ui/LotDetailPanel.tsx:29 (231) | `fixed` → header/portrait/pedigree/specs; dead `isPlayerConsigned`+`totalLots` props removed (BruceLowe test updated) |
| domains/auction/ui/BiddingPanel.tsx:41 (162) | `fixed` → header/controls/footer sections |
| domains/breeding/application/hooks/useSeasonPlanner.ts:20 (177) | `fixed` → `useMatingAssignments` + `useMatingPlanActions`; hook composes + retains derived season/fee state |
| domains/breeding/ui/SireWatchTab.tsx:57 (157) | `fixed` → `getClassificationColor` + `SireCard` |
| domains/breeding/ui/PlanSummaryBar.tsx:27 (182) | `fixed` → PlanMetrics/SavePlanControls/PlanSelectControls/ConfirmButton |
| domains/breeding/ui/BreedingCompatibilityCard.tsx:22 (152) | `fixed` → `buildRadarData` + `FactorRows`; unrendered `crossFamily` intentionally still not rendered |
| domains/breeding/ui/BredHorsesTab.tsx:25 (166) | `fixed` → `buildRows` + `BredHorseRow` |
| domains/breeding/ui/ActiveProgramView.tsx:48 (258) | `fixed` → ProgramHeaderCard/MilestonesCard/EnrolledMaresCard/HistoryCard; Set-membership optimization preserved |
| domains/agents/ui/pages/NpcStableDetailPage.tsx:26 (309) | `fixed` in-file (npcStables.test.tsx source-scans `tabular-nums` — kept) → StableNotFound/StableHeader/StableTabBar/StaffTabContent/AiProfileTabContent/HistoryTabContent |
| domains/agents/ui/pages/NpcStablesRivalCareers.tsx:108 (312) | `fixed` in-file → `useRivalCandidates`/`useRivalCareerData` hooks + SelectRivalsCard/RivalCandidateRow/CareerComparisonCard |
| domains/awards/ui/G1WinnerHistory.tsx:33 (213) | `fixed` → `groupRecordsByRace` + EmptyState/ByRaceAccordion/ChronologicalTable/WinnerRow |
| domains/awards/ui/AwardCeremony.tsx:29 (181) | `fixed` → CeremonyHeader/PlayerWinsBanner/AwardWinnersList/RunnerUpsSection/CeremonyFooter; Confetti stays in-file (Math.random allowlist); dead in-file `useAwardCeremony` removed + barrel export dropped |
| domains/bookmarks/ui/pages/BookmarksPage.tsx:63 (188) | `fixed` → BookmarkControls/TagFilterRow; filtering rewired through `model/bookmarkFilter.ts` `filterBookmarks`+`sortBookmarks` |
| domains/apprentice/ui/ApprenticeTracker.tsx:15 (172) | `fixed` → ApprenticeCard/GraduationProgress/SeniorTrackProgress/ContractExpiryNotice; dead `getStatusColor` removed |

Commits: `2f3feb94` characterization coverage; `3554356e` auction; `65fa364a` breeding; `37c97d67` agents; `c1d7c758` awards/bookmarks/apprentice. Verification: `bun run typecheck:errors` 0 errors/0 warnings; `bunx eslint .` 0 errors (1 pre-existing react-refresh warning, unrelated); `bun run build` green; all 20 target functions ≤146 lines. Full suite per `scripts/verify.sh` below.
