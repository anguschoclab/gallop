# Megaplan 2026-11 Code Ledger

Per-file review ledger. Verdicts: `clean` / `fixed:<id>` / `noted:<smell>` / `generated` / `data` / `asset` / `adopted:<prior>`.

## Adopted from prior cycle (docs/megaplan/code-ledger.md)

- `src/shared` — COMPLETE, adopted. (`Brand<T,_B>=T` structural — Anvil-style cast PRs are cosmetic-only.)
- `src/platform` — engine/time/persistence COMPLETE, adopted. Re-read only files in this cycle's PR scope: `platform/resolver/handlers/*` (Mason), `platform/time/phases/*` (stale-carry only — no intent).
- Prior BUG-1/2/3 verified fixed on current main.

## Expected-red catalogue (Phase 3 test-first)

Tests written in Phase 3 that MUST fail until their implementation batch lands. Premature-green = intent already covered → re-triage.

| Test file / case                                  | Encodes                                                                                                         | Batch     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- |
| `core/horse/insightRegistry.test.ts`              | 27 detectors, new order (CareerMaiden @1.15, BoomOrBust @1.3, BigFieldSpecialist @1.96, FieldSizeAffinity @4.1) | C Tipster |
| `core/horse/insightFieldSizeAffinity.test.ts`     | large≥10/small≤7, ≥3 each, margin +8; "Traffic Weaver"/positive, "Needs Room"/negative                          | C         |
| `core/horse/insightBigField.test.ts`              | PR 595 contract verbatim (Crowd Surfer; ≥12 vs ≤8; needs ≥1 big win)                                            | C         |
| `core/horse/insightCareerMaiden.test.ts`          | PR 625 contract (≥10 winless; negative; placing count in context)                                               | C         |
| `core/horse/insightBoomOrBust.test.ts`            | PR 613 contract (≥6 starts; wins≥2; unplaced≥3; ≥0.8 ratio; neutral)                                            | C         |
| `core/narrative/followUpRaceNews.test.ts`         | ≥30 headlines incl. 4 named enriched templates; enriched bodies; guards intact                                  | A Herald  |
| `core/race/engine/blockingVelocity.test.ts`       | PR 585: `blockingHorseVelocity` cached on Runner; boxed-in cap uses it; cleared each detect                     | F Bolt    |
| `core/resolver/handlers/baseHandler.test.ts`      | all 10 handlers `instanceof BaseHandler`; dispatch map contract                                                 | E Mason   |
| `core/race/engine/trackGeometryModifiers.test.ts` | signature `(r, section, course)` — compile-red until Batch F                                                    | F         |
| `components/VetReport.test.tsx` (tweak)           | getAllByText — EmptyState render                                                                                | B UI      |
| `lib/arrayHelpers.test.ts` (edge cases)           | pins existing semantics pre-optimization — GREEN already                                                        | F         |

Already-green characterization (no new spec needed): `factorLedger.test.ts` (recordTick pinning), `handlerRegistry`/`handlerCanHandle`, `StableCompareTable` empty case, `SyndicateMarket` empty case, `sectionalAnalysis.test.ts` (ported 627 — will re-verify after Batch F rewrite).

## Files reviewed this cycle

- All 57 PR intent diffs read & classified (Phase 1–2). Equivalence verified: `getTrackSection` ≡ section of `getSectionAndProgress`; `detectBlocking`/`applyBlockingEffect` blocker selection identical (585 cache safe); 599/629 inline math equivalent; 579/622 classifyPhase hoist safe; arrayHelpers loop rewrite equivalent except NaN propagation (accepted, documented).
- `insightDetectors.ts` — clean pattern; registry order is a test-pinned contract (23→27).
- `resolver/handlers/*` — boilerplate pattern confirmed: `IMPACT_HANDLERS` dict + identical canHandle/handle. `ImpactHandlerFunction` already in types.ts.
- `npcActionRegistry.ts` — `estimateIntentCost` internal; 594's never-exhaustiveness is typecheck-gated.
- `newsSpotlight.ts` — `generateFollowUpRaceNews` guarded (G1/G2, top3, player-owned); rng.pick headline/body.
- BUG-4 FIXED (lint baseline 259 errors → 1 warning; commit 10b39a1b).

## Files reviewed this cycle
