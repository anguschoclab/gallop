# Closed-PR Dispositions — V3 Re-Review (97 closed-unmerged PRs)

**Date:** 2026-09-22 · **Auditor:** Devin · **Scope:** every closed-unmerged PR (#315–#412 minus merged)

All 97 PRs re-examined against current `main` (`5d3dd0e0`). Evidence tiers used:
- **[commit-verified]** — the closing comment cites a cherry-pick/merge commit; commit confirmed present in `main` history.
- **[code-verified]** — target file/behavior inspected directly on current `main`.
- **[doc-verified]** — disposition already recorded in `audit/pr-verdicts.md` (V1, #382–#397) or `CONSOLIDATION_VERDICT_V2.md` (#398–#412); spot-verified against code.

## A. Documented rounds (#315–#412): all prior verdicts stand

### V2 round (#398–#412) — verdicts in `CONSOLIDATION_VERDICT_V2.md`, commits verified on main
| PR | Verdict (V2) | V3 re-check |
|---|---|---|
| #398 | Approved → `1b8db9fc` | commit in history ✓ [commit-verified] |
| #399 | Approved → `a16e54f2` | commit in history ✓; insuranceIntents has no `as any` [code-verified] |
| #400 | Partial → `8536a0f7` | commit in history ✓ |
| #402 | Partial → `345e7ae1` | commit in history ✓ |
| #403 | Disapproved (superseded by #408) | #408 integrated ✓ |
| #404 | Disapproved (superseded by #408) | same ✓ |
| #405 | Approved → `e97ddad2` | commit in history ✓ — **note:** `src/core/race/raceSimulationService.ts` still exists on main (see V3 findings) |
| #406 | Partial → `345e7ae1` | commit in history ✓ |
| #407 | Approved → `1b8db9fc` | commit in history ✓ |
| #408 | Partial → `8536a0f7` | commit in history ✓ |
| #409 | Approved → `5d82f8f8` | commit in history ✓ |
| #410 | Partial → `345e7ae1` | commit in history ✓ |
| #411 | Partial → `a16e54f2` | commit in history ✓ |
| #412 | Approved → `1b8db9fc` | commit in history ✓ |

### V1 round (#382–#397) — verdicts in `audit/pr-verdicts.md`, integrated via merged PR #401
| PR | Verdict (V1) | V3 re-check |
|---|---|---|
| #382 | Approved (HQOpsWidget rank fix) | `f?.level` present at HQOpsWidget.tsx ✓ [code-verified] |
| #383 | Partial (auctionResolution.test.ts kept) | file exists ✓ |
| #384 | Approved (commentary templates) | templates.ts extended ✓ |
| #385 | Approved (AlertDialog retire) | HorseManagementSection uses AlertDialog ✓ [code-verified] |
| #386 | Partial (expense tests kept) | expenseTypes.test.ts exists ✓ |
| #387 | Disapproved (cosmetic-only — V1 flagged "verify during execution") | **Confirmed correct rejection:** `priceAlerts.ts` on main has multi-line union; no perf change lost [code-verified] |
| #388 | Partial (a11y kept, `as any` rejected) | ReplaysLibrary has aria attrs; no `as any` in priceAlerts.ts ✓ |
| #389 | Approved (canonical consignment tests) | auctionConsignment.test.ts exists ✓ |
| #390 | Approved (flavor stories) | landed ✓ |
| #391 | Approved (runner-condition early breaks) | landed ✓ (further O(1) work in open #433 cluster) |
| #392 | Disapproved (empty PR) | confirmed — superseded by #394 ✓ |
| #393 | Partial (insuranceIntents kept) | landed ✓ |
| #394 | Approved (LiveAnnualTimeline tooltip) | landed ✓ |
| #395 | Partial (jockeyEffects loop) | landed ✓ |
| #396 | Partial (foaling tests) | foaling.test.ts exists ✓ |
| #397 | Partial (bidding tests + DefaultErrorComponent canonical) | auctionResolution.bidding.test.ts exists; DefaultErrorComponent uses `instanceof` guard ✓ |

### Pre-V1 round (#315–#381) — adjudicated via closing comments citing cherry-pick commits
Cherry-pick commits cited in comments verified present on `main`: `751574d1`(#315), `c14ea05e`(#316), `441b0b90`(#317), `cf82d552`(#318), `39b4470c`(#319), `2afa7c47`(#320-supersede fix), `22827943`(#323), `9d24eef1`(#322), `fccaab0f`(#324), `f4eb7cc4`(#325), `6a6b22fc`(#326), `6859c66b`(#327). [commit-verified]

| PR range | Disposition | V3 re-check |
|---|---|---|
| #315–#328 | merged/superseded per comments | commits verified above; supersede chains resolve to landed PRs (#320→fix commit, #321/#328→#323) |
| #343,#347,#352,#353,#357,#359,#361,#363,#364,#366,#369,#371,#373,#374,#378–#381 | "merged via cherry-pick" per comments | spot-verified: #364 tacticalAI Set→includes present (no `Set(` in tacticalAI.ts); #373 DisabledTooltipWrapper present; #380 buildFieldContext hoist covered by perfShape test ✓ [code-verified] |
| #344,#351 | mega-branch; test file cherry-picked per comment | transportCost.test.ts / transactionTypes tests exist ✓ |
| #345,#346,#348,#350,#354–#356,#360,#362,#365,#367,#368,#370,#375–#377 | superseded per comments (winners: #364,#379,#373,#378,#361,#380) | all cited winners verified landed ✓ [code-verified] |
| #349,#372 | mega-branch closed per comments | rejected correctly — diffs were contaminated; value recoverable via winners ✓ |

## B. Silent closures — reviewed fresh this round (17 PRs)

| PR | Title | V3 verdict | Evidence |
|---|---|---|---|
| #297 | Anvil: Remove explicit any from RaceFeed props | **INTEGRATED** | no `any` in `RaceFeed.tsx` [code-verified] |
| #298 | Anvil: Forged explicit types for RaceFeed props | **SUPERSEDED** by #297 | same [code-verified] |
| #299 | Herald: Enriched biographical race commentary | **SUPERSEDED** | merged PR #214 delivered biographical templates; commentaryGenerator present [code-verified] |
| #329 | Probe: rivalry friction constraints tests | **OBSOLETE** | no `friction` module exists in `src/`; rivalry coverage exists via `rivalry.test.ts`, `rivalryNewsGenerator.*.test.ts` (4 files) [code-verified] |
| #330 | Herald: expert insight surface-fit templates | **INTEGRATED** | `src/assets/narrative/expertInsightTemplates.ts` exists with surface-fit content [code-verified] |
| #331 | Anvil: type staffByStable array | **INTEGRATED** | `Map<string, Map<StaffRole, StaffMember>>` / `Map<string, StaffMember[]>` typed in `energy.ts`, `upkeep.ts` [code-verified] |
| #332 | Herald: enriched flavor stories | **SUPERSEDED** | consolidated into flavorStories.ts via #379-era merges (file now 1,083 lines) [code-verified] |
| #333 | Bolt: memoize horse-record building in valuation | **SUPERSEDED** | mega-branch (57 files); the underlying dict-rebuild concern is re-delivered by open **#415** (`horsesDict` param) — verdict in open-PR adjudication |
| #334 | Probe: resolveBloodline tests | **SUPERSEDED-BY-OPEN** | open **#422** delivers `populationGenetics.resolveBloodline.test.ts` |
| #335 | Bolt: combine tacticalAI allocations | **SUPERSEDED** | #364 landed (no `Set(` in tacticalAI.ts) [code-verified] |
| #336 | Bolt: tacticalAI calculations | **SUPERSEDED** | same ✓ |
| #337 | Palette: breeding planner icon tooltips | **INTEGRATED** | `MarePlannerRow.tsx` has Tooltip + `aria-label` [code-verified] |
| #338 | Probe: auction valuation modifiers | **INTEGRATED** | `src/tests/core/auction/auctionValuation.test.ts` exists [code-verified] |
| #339 | Herald: track/jockey flavor stories | **SUPERSEDED** | flavorStories.ts consolidated ✓ |
| #340 | Palette: ARIA labels icon buttons | **INTEGRATED** | 16 `aria-label` sites in `src/components/stable/` alone [code-verified] |
| #341 | Groom: compare-limit tooltip | **INTEGRATED** | `DisabledTooltipWrapper` in StableRosterGallery/Ledger [code-verified] |
| #342 | Bolt: tacticalAI hot loops | **SUPERSEDED** | same as #335 ✓ |

## Missed-value harvest

**None outstanding.** Every silent-closure PR's value either already exists on main or is being re-delivered by an open PR (#422 for #334; #415 for #333's concern). No harvest tickets carried into Phase 5.

## Explicit disprovals of prior findings

- V1 flagged #387 as "DISAPPROVE (pending verification)" — **verified correct**: the PR was cosmetic-only; no value lost.
- V2 claimed deprecated proxies `raceSimulationService.ts`, `raceImpactGenerator.ts`, `raceSimulationExecutor.ts` were deleted — **PARTIALLY DISPROVED**: `raceSimulationService.ts` and `raceSimulationExecutor.ts` + `raceImpactGenerator.ts` still exist under `src/core/race/` (moved, not deleted — services proxies were removed, core modules remain and are live). Doc wording corrected in V3; no action needed.
