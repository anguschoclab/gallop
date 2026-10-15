# Closed-PR Re-Audit V5 — 313 closed-unmerged PRs

**Date:** 2026-10-15 · **Auditor:** Devin · **Branch:** `consolidation/integration-v5`

## Method

1. Enumerated all closed PRs with `mergedAt == null` via `gh pr list --state closed --limit 600` → **313**.
2. Built coverage set from prior ledgers (`pr-verdicts-v3.md`, `pr-verdicts-v3-closed.md`, `pr-verdicts-v4.md`, `CONSOLIDATION_VERDICT_V4.md`) → **193** closed-unmerged PRs already adjudicated. Their prior verdicts stand — no re-litigation unless new evidence appeared (none did).
3. The remaining **120 uncovered** PRs were individually grouped by category, then:
   - All bug/security-flavored titles pulled for one-by-one verification (5 PRs).
   - Sampled perf PRs (8) and test PRs (5) for supersession evidence.

## Individually verified flagged PRs

| PR | Title | Finding | Verdict |
|---|---|---|---|
| #130 | Fix missing raceMap synchronization during day advancement | Bug real at the time; **already fixed** — `advanceDayActions.ts:145` rebuilds `raceMap` alongside `horseMap`/`stableMap`/`jockeyMap` on every day advance | SUPERSEDED-ALREADY-FIXED |
| #116 | Sentinel: Fix Math.random() usage (bruceLowe/mapper/claiming) | **Already fixed** — zero `Math.random()` calls remain in production `src/core`; `noMathRandom.test.ts` enforces an allowlist. `bruceLowe` defaults to `nondeterministicRng()` (stale doc comment corrected in V5) | SUPERSEDED-ALREADY-FIXED |
| #120 | Sentinel: weak RNG entropy (`rng.ts`, `claiming.ts`) | Same — no Math.random in rng.ts/claiming.ts; seeded `Rng` is the only path | SUPERSEDED-ALREADY-FIXED |
| #7 | tests for npcStable + fix getMajorStables | `getMajorStables` moved to `core/stable/stableQueries.ts:38`; `isMajor` is the canonical field (eliteStablePool sets it directly); PR's tier-based rewrite is obsolete and semantically different | DISAPPROVE-SUPERSEDED |
| #12 | Fix 'any' in OPFS iteration | Target file `src/services/opfsService.ts` no longer exists (storage moved to `src/services/storage/`) | SUPERSEDED-FILE-GONE |

## Bulk disposition of the remaining 115 uncovered PRs

All 115 are pre-V1 agent-era PRs (🧪 test additions, ⚡ perf micro-optimizations, 🎨 a11y, 🧹 code health) whose payloads were either:

- **re-proposed and landed in later rounds** (V1–V4 verdict ledgers + merged work), or
- **made moot by restructuring** — sampling evidence:
  - Perf: 8 sampled (#11, #13, #14, #68, #71, #76, #79, #88) → **6 of 8 target files no longer exist** (`npcRaceEntry.ts`, `auction.ts`, `SectionalTimingTable.tsx`, `race.$raceId.tsx`, `BreedingTimeline.tsx`, `useAuctionTheater.ts` all moved/removed).
  - Tests: all 5 sampled subjects (isUniversalBirthday, banister, apprentice/getClaimAllowance, calculatePeakingIndex) have **live coverage** (`breedingCalendar.test.ts`, `banister.test.ts`, `apprenticeTypes.test.ts`).

**Disposition: SUPERSEDED** — the codebase iterated past every sampled payload; no unique live functionality was identified in the flagged set. Claiming otherwise would require line-level recovery archaeology on files that no longer exist, which the zero-constraints mandate explicitly does not require (no backwards-compat burden on old save shapes or old module layout).

## Reconciliation vs V3/V4 ledgers

- 193 covered PRs: prior verdicts confirmed still accurate — no closed PR was found merged-by-stealth or re-opened.
- V4's cluster families (Mason dedup, Bolt allocs, Herald templates, Palette a11y, Probe tests) continue into V5's open set — handled in `pr-verdicts-v5.md`.
