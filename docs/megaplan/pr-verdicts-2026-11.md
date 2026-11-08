# PR Verdicts — Consolidation 2026-11

Scope: all 57 open PRs (#573–#629), frozen 2026-11-02. Verdicts:

- **PORT** — unique intent, ported to `consolidation/2026-11` (delta only; stale-carry never merged).
- **SYNTHESIZE** — duplicate cluster; one best-of implementation written, all variants closed.
- **ALREADY-COVERED** — intent already in main (evidence cited).
- **REJECT** — harmful/empty/stale-only (evidence cited).

Cross-cutting rejections (apply to every PR that carries them, never ported):
`.jules/*`, `.Jules/*` (capital-J evades `.gitignore` on case-sensitive fs), `*.patch`,
`patch_*.cjs`, `bun.lockb` drift, `test-results/`, `*-chromium-linux.png` e2e snapshots,
stale `docs/megaplan*` copies, stale carry of ~25 files predating the rival-stakes/valuation/
auction feature set (rivalStakes*, valuationBreakdown, trackFilterPresets, dailyStatsSummary,
auctionBidding, raceBooking, auctionValuation, phases/auctions|horseDeath, breedingSlice +
their tests + campaignManifest.json).

**Guardrail attack (documented):** PRs 594, 605, 621 each weaken
`src/tests/architecture/protectedArtifacts.test.ts` to admit their own `.jules/` file
(594 whitelists `anvil.md`, 605 whitelists `probe.md`, 621 comments the assertion out).
Those hunks are REJECTED; main's guard stays intact.

| PR  | Intent (real files)                                                    | Verdict                                                                | Notes                                                  |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| 573 | EmptyState → `routes/stableCampaign.tsx`                               | PORT                                                                   | Clean, 1 file.                                         |
| 574 | `tests/core/breeding/sireAnalyticsSummary.test.ts`                     | PORT                                                                   | Strip 3 linux snapshots.                               |
| 575 | `arrayHelpers.ts` reduce→loops                                         | PORT                                                                   | Bolt; equivalence test first.                          |
| 576 | `tests/core/market/priceAlertMessages.test.ts`                         | PORT                                                                   | Rest = stale carry incl. docs.                         |
| 577 | `tests/core/market/syndicateInvestorActions.test.ts`                   | SYNTHESIZE-A                                                           | Same file as 605 — take better superset.               |
| 578 | ARIA on `BloodstockGrid.tsx` valuation btn                             | SYNTHESIZE (w/586)                                                     | Same file, different intent — apply both.              |
| 579 | `factorLedger.ts` recordTick opt                                       | SYNTHESIZE (w/622)                                                     | Pick better impl; checksum gate.                       |
| 580 | `tests/domains/horse/simulation/famousStallions.test.ts`               | PORT                                                                   | Clean.                                                 |
| 581 | Disabled tooltip `AuctionHouseDesk.tsx`                                | SYNTHESIZE (w/590)                                                     | Same file, same intent.                                |
| 582 | `tests/core/breeding/pedigreeGraph.test.ts`                            | PORT                                                                   | Clean intent.                                          |
| 583 | Field-size affinity insight                                            | SYNTHESIZE field-size (583/591/600/609)                                | Feeds one detector impl.                               |
| 584 | rngRef typing `useRacePageData.ts` + test                              | PORT                                                                   | Also touches `useLiveRaceSimulation.test.tsx`.         |
| 585 | Blocking-velocity cache `runnerTypes.ts`,`jockeyEffects.ts`            | PORT (checksum gate)                                                   | Sim-critical.                                          |
| 586 | DisabledTooltipWrapper `BloodstockGrid.tsx`                            | SYNTHESIZE (w/578)                                                     | See 578.                                               |
| 587 | `tests/core/horse/pricing.test.ts` fanCount                            | PORT                                                                   |                                                        |
| 588 | `jockeyTemplates.ts` commentary                                        | PORT                                                                   | Content.                                               |
| 589 | `RecruitmentPool.tsx` props typing                                     | SYNTHESIZE (w/608,620)                                                 |                                                        |
| 590 | Disabled tooltip `AuctionHouseDesk.tsx`                                | SYNTHESIZE (w/581)                                                     |                                                        |
| 591 | Field-size affinity + `insightFieldSizeAffinity.test.ts`               | SYNTHESIZE                                                             | Brings own dedicated test — likely best test source.   |
| 592 | `insights.test.ts` earnings-milestone boundary                         | PORT                                                                   | Additive to existing file.                             |
| 593 | Track-section lookups `simulation.ts`+`trackGeometryModifiers.ts`+test | SYNTHESIZE (w/601)                                                     | Same 3 files in both.                                  |
| 594 | `npcActionRegistry.ts` exhaustiveness                                  | PORT intent; REJECT guard-weakening + `.jules` + `fix_protected.patch` | Verify exhaustiveness approach compiles.               |
| 595 | Big-field insight + `insightBigField.test.ts`                          | PORT (into insightDetectors batch)                                     | Distinct detector; brings test.                        |
| 596 | EmptyState `routes/race-advisor.tsx`                                   | PORT                                                                   | Clean.                                                 |
| 597 | EmptyState `SyndicateMarket.tsx`                                       | PORT                                                                   | Rest stale + snapshots.                                |
| 598 | (empty diff — 0 files)                                                 | REJECT                                                                 | No-op branch; title intent covered by 594 cluster.     |
| 599 | Velocity update `simulation.ts`                                        | SYNTHESIZE sim-batch (w/593/601/629)                                   | Overlaps same hot file.                                |
| 600 | Field-size insight (dup)                                               | SYNTHESIZE                                                             | +bun.lockb artifact.                                   |
| 601 | Track-geometry lookups (dup of 593)                                    | SYNTHESIZE                                                             | +bun.lockb artifact.                                   |
| 602 | EmptyState `JockeyPlanPanel.tsx`                                       | PORT                                                                   | Rest stale + lockb + docs.                             |
| 603 | `BaseHandler.ts` + 10 handlers                                         | SYNTHESIZE (603/610/616)                                               | Cleanest file set (no stale carry).                    |
| 604 | `newsSpotlight.ts` follow-up news                                      | SYNTHESIZE (604/611/618/626)                                           | Same file ×4.                                          |
| 605 | `syndicateInvestorActions.test.ts`                                     | SYNTHESIZE-A (w/577); REJECT guard-weakening                           | Also touches protectedArtifacts (rejected).            |
| 606 | `tests/core/breeding/sireAnalytics.test.ts`                            | PORT                                                                   | Distinct from 574's Summary file.                      |
| 607 | EmptyState `VetReport.tsx` + test                                      | SYNTHESIZE (607/621/628)                                               | Has own test changes.                                  |
| 608 | `RecruitmentPool.tsx` casts (dup of 589)                               | SYNTHESIZE                                                             |                                                        |
| 609 | Field-size insight (dup)                                               | SYNTHESIZE                                                             |                                                        |
| 610 | BaseHandler + handlers + `index.ts`                                    | SYNTHESIZE                                                             | Also stale carry; index.ts delta worth diffing vs 603. |
| 611 | `newsSpotlight.ts` (dup of 604)                                        | SYNTHESIZE                                                             |                                                        |
| 612 | EmptyState `StableCompareTable.tsx`                                    | PORT                                                                   | +bun.lockb artifact.                                   |
| 613 | Boom-or-bust `insightDetectors.ts` + tests                             | PORT (into insightDetectors batch)                                     | Rest stale + snapshots + lockb.                        |
| 614 | DisabledTooltipWrapper `ExchangePanel.tsx`                             | PORT                                                                   | `.Jules` capital + lockb artifacts.                    |
| 615 | `sectionalAnalysis.ts` loop opt                                        | PORT (checksum gate)                                                   | Sim-adjacent; verify determinism.                      |
| 616 | BaseHandler refactor (dup of 603/610)                                  | SYNTHESIZE                                                             |                                                        |
| 617 | `tests/core/genetics/genotypeCache.test.ts`                            | PORT                                                                   | Rest stale.                                            |
| 618 | `newsSpotlight.ts` (dup)                                               | SYNTHESIZE                                                             |                                                        |
| 619 | Tooltips `PriceAlertsPanel.tsx`                                        | PORT                                                                   | Rest stale + snapshots.                                |
| 620 | Staff labels `RecruitmentPool.tsx`+`StaffTeamList.tsx`                 | SYNTHESIZE (w/589/608)                                                 |                                                        |
| 621 | VetReport EmptyState (dup)                                             | SYNTHESIZE; REJECT guard-weakening + `patch_arch_test.cjs`             |                                                        |
| 622 | `factorLedger.ts` recordTick (dup of 579)                              | SYNTHESIZE                                                             |                                                        |
| 623 | `tests/domains/market/simulation/marketRefresh.test.ts`                | PORT                                                                   | Rest stale.                                            |
| 624 | Dedup `tests/store/helpers/mockState.ts` + 2 tests                     | PORT                                                                   | Clean, test-side only.                                 |
| 625 | Career-maiden `insightDetectors.ts` + registry test                    | PORT (into insightDetectors batch)                                     |                                                        |
| 626 | `newsSpotlight.ts` (dup)                                               | SYNTHESIZE                                                             |                                                        |
| 627 | `tests/core/race/simulation/sectionalAnalysis.test.ts`                 | PORT                                                                   | Clean.                                                 |
| 628 | VetReport EmptyState (dup)                                             | SYNTHESIZE                                                             |                                                        |
| 629 | Inline math `lateralMovement.ts`+`simulation.ts`                       | SYNTHESIZE sim-batch                                                   | Overlaps 599/593/601 on simulation.ts.                 |

## Cluster synthesis plan

| Cluster                        | PRs                                                                                                         | Approach                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| field-size affinity/preference | 583, 591, 600, 609                                                                                          | Diff all four detectors; take union of best test coverage (591 ships dedicated file); one detector + registry entries |
| newsSpotlight follow-up        | 604, 611, 618, 626                                                                                          | Union template set, dedupe near-identical entries                                                                     |
| BaseHandler                    | 603, 610, 616                                                                                               | Compare abstractions; 610 adds `index.ts` routing — adopt if cleaner; port handler-by-handler                         |
| factorLedger recordTick        | 579, 622                                                                                                    | Benchmark both vs baseline; keep faster, must checksum-identical                                                      |
| track-section lookups          | 593, 601                                                                                                    | Near-identical; compare impl + test deltas                                                                            |
| RecruitmentPool                | 589, 608, 620                                                                                               | Union: props typing + cast removal + staff-label strictness (+StaffTeamList)                                          |
| VetReport EmptyState           | 607, 621, 628                                                                                               | One implementation + strongest test additions                                                                         |
| BloodstockGrid                 | 578+586                                                                                                     | Both intents (ARIA + tooltip) — non-conflicting hunks                                                                 |
| AuctionHouseDesk               | 581+590                                                                                                     | Same intent; pick cleaner tooltip wiring                                                                              |
| simulation.ts hot path         | 593/601 (sections) + 599 (velocity) + 629 (inline math) + 585 (blocking cache in jockeyEffects/runnerTypes) | Single coordinated rewrite of the tick path; equivalence tests + checksum gate per change                             |
| syndicateInvestorActions test  | 577+605                                                                                                     | Superset of assertions                                                                                                |
