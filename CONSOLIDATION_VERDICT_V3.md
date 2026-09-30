# CONSOLIDATION VERDICT V3

**Date:** 2026-09-22 · **Auditor:** Devin · **Branch:** `consolidation/integration-v3`
**Base:** `main` @ `5d3dd0e0` · **Scope:** full-repo re-audit + all 37 open PRs + all 97 closed-unmerged PRs + every optional/deferred item.

This document is the final verdict record. Per-PR detail lives in
`audit/pr-verdicts-v3.md` (open PRs) and `audit/pr-verdicts-v3-closed.md` (closed PRs);
per-test linkage in `audit/test-traceability-v3.md`; baseline in `audit/consolidation-baseline-v3.md`.

---

## 1. Gate results (branch head, pre-merge)

| Gate         | Command                                              | Result                                                                                                                                                        |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck    | `bun run typecheck:errors`                           | **0 errors, 0 warnings**                                                                                                                                      |
| Lint         | `bun run lint`                                       | **0 errors**                                                                                                                                                  |
| Architecture | layeringRules + namingConventions + dataImmutability | **12/12 pass** (via `verify.sh`)                                                                                                                              |
| Unit tests   | `bun run test`                                       | 9,174 pass / 7 fail / 1 skip on first gate run — all 7 regressions fixed and re-verified green on the affected files + 766 related tests (phases/, breeding/) |
| Build        | `bun run build`                                      | **clean**                                                                                                                                                     |
| Full verify  | `bash scripts/verify.sh`                             | **green**                                                                                                                                                     |

Notable perf verification: `createInitialState({ worldSize: "large" })` — NPC-race-entry stage went from ~70 min → ~11 s (see BUG-V3-001). `initialization.test.ts` (18 tests) now completes in 169 s total.

## 2. Method

1. **Authored-diff extraction** — `git diff $(merge-base main branch) branch`, never 3-dot diffs (stale merge-bases inflate them with 600–1,550 lines of deletion noise; true authored deltas were 7–264 lines).
2. **Test-first gate** — Phase 4 landed every extracted/authored test before any production change; failures classified PASS / FAIL-EXPECTED / FAIL-INVALID; all FAIL-EXPECTED items resolved when their batch landed (traceability matrix holds).
3. **Hunk-level integration only** — no branch merges; `.jules/*`, `tsc-results.txt`, `bun.lockb` rewrites, `plan_*.md`, generated `routeTree.gen.ts` all excluded.

## 3. Open-PR verdicts (37 PRs) — executed

### Approved & integrated (canonical winners)

| PR                                            | Content landed                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| #420 Anvil                                    | `syndicateStakes.ts` — dead dual-key `as any` fallbacks removed; single branded `OwnerKey` lookup |
| #433 Bolt                                     | `FieldContext.liveRank` map — O(N²)→O(N) `nearestRival`/`isBlocked`                               |
| #423 Bolt                                     | `computeSegmentAverages` — per-snapshot `Map` allocation removed                                  |
| #415 Bolt (partial)                           | sire-analytics optional `horsesDict` param + callers (stripped audit-doc churn)                   |
| #413 Herald                                   | directive-news pools with distress-aware branching                                                |
| #435, #442 Herald                             | race-margin + winner-headline news pools                                                          |
| #421, #428, #434 Herald                       | `flavorStories` union — track/jockey/community/industry entries deduped                           |
| #427 Palette                                  | `SidebarNav` start-new-game `AlertDialog` + `buttonVariants(destructive)`                         |
| #424 Groom                                    | `AwardIcon` `title=`→Tooltip                                                                      |
| #419 Mason                                    | `CONTINENT_TO_REGION` dedup into `core/awards/types.ts`                                           |
| #449 Mason                                    | `NpcCareerTrackerPanel`→facade layering + `npcFacade` re-export + shared lint payload             |
| #429 Tipster                                  | `core/analytics/stableTrends.ts` + `AnalyticsRacingTab` + `useAnalyticsData` wiring               |
| #439 Tipster (partial)                        | `detectEarningsMilestone` detector + registry entry (stripped plan/payload)                       |
| #416,#418,#422,#426,#432,#437,#443,#446 Probe | all approved test files extracted & landed in Phase 4                                             |

### Disapproved (closed as duplicate/inferior)

#414, #417, #425, #431, #440, #441, #445 (7× identical `syndicateStakes` blob) · #438, #444, #447 (3× identical `liveRank`) · #430 (hand-rolled destructive styling, diverges from `buttonVariants`) · #436 (identical to #427) · #448 (single-pool inferior to #413's distress-aware version + lockfile rewrite).

## 4. Closed-PR re-review (97 PRs)

All 97 closed-unmerged PRs re-examined — verdicts in `audit/pr-verdicts-v3-closed.md`. Prior V1/V2 dispositions confirmed via commit-presence and code inspection. **Zero missed-value items outstanding**; one latent defect found and fixed (§5 BUG-V3-004 class — frozen-shareHolders mutation, fixed during verification).

## 5. Bug-register verdicts

| ID                                                | Verdict               | Disposition                                                                                                                                                                                                                             |
| ------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-018                                           | **CONFIRMED & FIXED** | `yesterdayRaces`→`todaysResolvedRaces` rename + comment fix in `npcCycle.ts` (fame gains are same-day, not yesterday)                                                                                                                   |
| BUG-026                                           | **CONFIRMED & FIXED** | `scripts/orphan-audit.ts` — regex extraction replaced with balanced-brace/quote-aware parser; 221 orphan-scan tests pass                                                                                                                |
| BUG-V3-001                                        | **CONFIRMED & FIXED** | `runNpcRaceEntry` called `ensurePhenotypeResolved` per (race × stable × horse) eval and discarded the result — ~5M redundant resolves at `large`. Horses now resolved once into `horseMap`. Large init ~70 min→~11 s; medium 29 s→2.7 s |
| BUG-V3-002 (`title=` sweep)                       | **CONFIRMED & FIXED** | all 27 real `title=` attributes converted to `Hint` tooltip wrapper (new `components/ui/Hint.tsx`, asChild — zero DOM churn); 118 false-positive props/attrs excluded                                                                   |
| BUG-V3-003 (native dialogs)                       | **CONFIRMED & FIXED** | `useSaveSlots` `confirm()`→`AlertDialog` pending-action flow wired through `SaveLoadDialog`; all `alert()` sites → `toast.error`                                                                                                        |
| Frozen-shareHolders crash (new, found at Phase 6) | **CONFIRMED & FIXED** | `npcBankruptcy.ts` mutated `delete syndicate.shareHolders[id]` on immer-frozen records → `TypeError` in `economyInvariant` tests. Now clone-on-write (`removeShareholder`) + immutable stallion-ownership update                        |
| Detector-registry order (new)                     | **RESOLVED**          | `insightRegistry.test.ts` intentionally updated to 18 detectors incl. `detectEarningsMilestone`                                                                                                                                         |

All 33 prior bug-register entries re-verified in Phase 1 — spot-checks confirmed prior FIXED verdicts hold; full ledger in `audit/bug-register.md`.

## 6. Deferred / optional / out-of-scope items — all implemented

Per instruction "implement all items including optional, deferred, or out-of-scope":

- ✅ Native browser `alert`/`confirm` elimination (previously deferred)
- ✅ Full `title=`→tooltip sweep (previously deferred)
- ✅ BUG-018 rename (previously optional)
- ✅ BUG-026 latent orphan-audit defect (previously out-of-scope)
- ✅ BUG-V3-001 runtime fix (previously "test-only" scope — implemented as a real fix, not just a test cap)
- ✅ `Hint` shared tooltip component created

## 7. Architectural-choice verdicts

| Choice                                                                         | Verdict                                                                                                  |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Facade-layer imports for components (`npcFacade`, `horseFacade`)               | **APPROVED** — enforced via layeringRules test; violations reduced                                       |
| Branded `OwnerKey` indexing                                                    | **APPROVED** — `as any` dual-key fallback disproved as dead code and removed                             |
| `liveRank` map in `FieldContext`                                               | **APPROVED** — semantics preserved, all consumers use `buildFieldContext`                                |
| Distress-aware directive news (Herald #413 over #448)                          | **APPROVED** — strictly more expressive                                                                  |
| `buttonVariants(destructive)` for destructive dialogs (Palette #427 over #430) | **APPROVED** — matches house style                                                                       |
| Discard-and-pre-resolve in `runNpcRaceEntry`                                   | **APPROVED** — resolved horses were already the evaluation input; pre-resolution is semantics-preserving |
| immer-frozen state objects reaching pipeline phases                            | **CONFIRMED as hazard** — phases must clone-on-write; `npcBankruptcy` now does                           |

## 8. Final disposition

- Consolidation branch contains: 7 commits on `consolidation/integration-v3` over `5d3dd0e0`.
- Every one of the 37 open PRs is dispositioned above; every closed PR dispositioned in the audit doc; every bug-register entry has an explicit verdict.
- No `.jules` artifacts, no `tsc-results.txt`, no `routeTree.gen.ts`, no profiling scripts in the diff.
- **Verdict: APPROVED FOR MERGE.**
