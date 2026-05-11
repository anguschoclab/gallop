# Refactor A — Utility Consolidation

**Date:** 2026-05-09
**Order:** 1 of 5 (do first — foundation all other refactors depend on)
**Risk:** Low — pure extractions with no behaviour change
**Scope:** Consolidate duplicated utility functions scattered across the codebase into single authoritative locations.

---

## Why this first

Every other refactor cluster (B–E) imports or inlines logic that belongs in shared utilities. Doing A first means B–E can import clean helpers rather than creating new duplication. It also fixes a silent bug: the `overallRating` formula has two subtly different implementations that produce inconsistent horse valuations in different game contexts.

---

## A1 — `overallRating` / stat summary (5+ duplicate locations)

### Problem

The canonical four-stat average `(speed + stamina + acceleration + consistency) / 4` already exists as `calculateOverallRating` in `src/core/horse/stats.ts:14`. It is independently re-implemented in:

| File | Location | Name | Notes |
|---|---|---|---|
| `src/core/breeding/strategy.ts` | line 70 | `overallRating` | Direct copy |
| `src/core/horse/pricing.ts` | line 10 | inlined | Inside `calculateBaseHorseValue` |
| `src/core/horse/pricing.ts` | line 31 | inlined | Inside `horsePrice`, again |
| `src/game/npcHorseGen.ts` | line 234 | inlined | Inside `calculateNpcHorseValue` |

A three-stat variant `(speed + stamina + acceleration) / 3` (missing `consistency`) appears in:

| File | Line |
|---|---|
| `src/core/ai/trainingAI.ts` | ~63 |
| `src/core/ai/jockeyStrategyAI.ts` | ~207 |
| `src/core/ai/jockeyAI.ts` | ~139 |
| `src/core/ai/campaignAI.ts` | ~68 |
| `src/core/stable/personalityModifiers.ts` | ~19 |
| `src/core/time/phases/market.ts` | ~38 |

### Fix

1. Confirm `calculateOverallRating(horse: Horse): number` in `src/core/horse/stats.ts` is correct and exported.
2. Add `calculateRaceRating(horse: Horse): number` (the 3-stat variant) to the same file with a doc comment explaining it is used where consistency is intentionally excluded (AI race suitability contexts).
3. Delete every inline copy and every local alias. Update all importers to use `calculateOverallRating` or `calculateRaceRating` from `@/core/horse/stats`.
4. The `overallRating` export in `src/core/breeding/strategy.ts` line 70 must be deleted (not kept as a re-export — this caused the duplication in the first place).

### Acceptance criteria

- `grep -r "overallRating\b\|speed.*stamina.*acceleration.*consistency" src --include="*.ts" | grep -v "stats.ts\|import"` returns zero results.
- `grep -r "(speed + stamina + acceleration) / 3\|/ 3.*speed" src --include="*.ts"` returns zero results.
- All existing tests pass.

---

## A2 — `getDayOfYear` duplicated in `raceSchedule.ts`

### Problem

`src/core/calendar/dateFormatting.ts` exports `dayOfYear(day)` → `((day - 1) % 365) + 1`.

`src/game/raceSchedule.ts` lines 28–35 defines its own `getDayOfYear(gameDay)` with byte-for-byte identical logic and `getCurrentYear(gameDay)` → `Math.floor((gameDay-1)/365) + 1`.

`getCurrentYear` is imported in at least 11 files (coreSlice, liveRaceResolution, campaignPlanner, RaceEntry, stable.$horseId, and others). `gameYearNumber` from `dateFormatting` exists but is used in fewer places — the two functions return different things (1-based game year vs 2026-based calendar year) and both are legitimate, but `getDayOfYear` is a pure duplicate.

### Fix

1. Delete `getDayOfYear` from `src/game/raceSchedule.ts`.
2. In every file that imported `getDayOfYear` from `raceSchedule`, replace with `dayOfYear` from `@/core/calendar/dateFormatting`.
3. Leave `getCurrentYear` in `raceSchedule.ts` — it is conceptually distinct (1-based game year counter) from `gameYearNumber` (2026-based calendar year). Add a JSDoc comment to both clarifying the difference.
4. Add `DAYS_PER_YEAR = 365` and `DAYS_PER_MONTH = 30` to `src/game/constants/gameConstants.ts` (currently `advanceWeek/Month/Year` in `coreSlice.ts` use magic numbers 7, 30, 365 with no named constant). Update `coreSlice.ts` to import them.

### Acceptance criteria

- `grep -rn "getDayOfYear" src` returns zero results.
- `grep -rn "advanceMultipleDays(30\|advanceMultipleDays(365" src` returns zero results (replaced by named constants).
- Calendar-related tests pass.

---

## A3 — `formatCurrency` housed in a UI component

### Problem

`formatCurrency` is a pure string formatter defined in `src/components/HorseBits.tsx`. It is imported by:

- `src/game/store/slices/marketSlice.ts` line 23
- `src/game/store/slices/systemsSlice.ts` line 17
- `src/game/claiming.ts` line 7

Store slices must not import React component files. This blocks tree-shaking in non-browser contexts and makes slices untestable without a DOM environment.

### Fix

1. Create `src/lib/formatting.ts` (or add to an existing `src/lib/utils.ts` if it already has formatting functions).
2. Move `formatCurrency`, and any other pure formatting functions currently in `HorseBits.tsx` (`formatOdds`, `formatDistance`, etc. — audit the file) into `src/lib/formatting.ts`.
3. Update `HorseBits.tsx` to import from `@/lib/formatting`.
4. Update `marketSlice.ts`, `systemsSlice.ts`, `claiming.ts` to import from `@/lib/formatting`.
5. Verify no other store or core file imports from a `src/components/` path.

### Acceptance criteria

- `grep -rn "from.*components.*" src/game/store src/core src/game/*.ts` returns zero results (no core/store importing from components).
- `formatCurrency` exists in `src/lib/formatting.ts` and is re-exported from `HorseBits.tsx` for backward compatibility if needed.

---

## A4 — Gender utility functions incomplete in `gender.ts`

### Problem

`src/core/horse/gender.ts` exports only `isGenderEligible` and `rollGender`. The following patterns appear across 13+ files:

- `horse.gender !== "horse" && horse.gender !== "colt"` — checks if not male (npcHorseGen, systemsSlice)
- Gender symbol display (`♂`, `♀`, icon selection) repeated in HorseCard, auction components, BreedingTimeline, and route files
- `DAM_GENDERS`, `SIRE_GENDERS` arrays defined in `eligibility.ts` but not exported for general use

### Fix

Add to `src/core/horse/gender.ts`:

```ts
export function isMaleHorse(gender: HorseGender): boolean
export function isFemaleHorse(gender: HorseGender): boolean
export function genderLabel(gender: HorseGender): string   // "Colt" | "Filly" | "Horse" | "Mare" | "Gelding"
export function genderSymbol(gender: HorseGender): string  // "♂" | "♀" | "⚧"
export const SIRE_GENDERS: HorseGender[]  // move from eligibility.ts
export const DAM_GENDERS: HorseGender[]   // move from eligibility.ts
```

Delete inline implementations across all files. Update `eligibility.ts` to import from `gender.ts`.

### Acceptance criteria

- `grep -rn '"horse" && horse.gender !== "colt"\|gender === "colt" || gender === "horse"' src` returns zero results.
- `grep -rn '♂\|♀' src --include="*.ts" --include="*.tsx"` returns results only in `gender.ts`.

---

## A5 — `getCareerStats` missing, scattered inline filters

### Problem

`raceHistory.filter(r => r.position === 1)` and positional variants appear in at least 8 files:

- `src/game/breedingCompatibility.ts` lines 258, 265, 269, 275
- `src/game/npcRaceEntry.ts` lines 347–366
- `src/core/breeding/leaderboardService.ts`
- `src/core/breeding/progenyLeaderboards.ts`
- `src/core/breeding/sireAnalytics.ts`
- `src/game/awards/scoring.ts`
- `src/core/time/phases/stallionRetirement.ts`
- `src/core/time/phases/hallOfFame.ts`

### Fix

Add to `src/core/horse/stats.ts`:

```ts
export interface CareerStats {
  starts: number;
  wins: number;
  places: number;   // finished exactly 2nd
  shows: number;    // finished exactly 3rd
  gradedWins: number;
  g1Wins: number;
  g2Wins: number;
  g3Wins: number;
  earnings: number;
}

export function getCareerStats(horse: Horse): CareerStats
```

Replace all inline `raceHistory.filter(r => r.position === 1)` chains with `getCareerStats(horse)` property access. Use the existing `raceHistory` array and race grade lookup for graded classification.

### Acceptance criteria

- `grep -rn "position === 1\|\.position <= 3\|\.position <= 2" src --include="*.ts" --include="*.tsx"` returns results only inside `src/core/horse/stats.ts` (the implementation) and tests.
- Leaderboard and award scoring produce identical outputs before and after the change (snapshot or regression tests recommended).

---

## A6 — `requireOwned` ownership guard repeated 10+ times

### Problem

The string `"You don't own this horse."` and the pattern:

```ts
if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
```

appears in at least 10 locations across `coreSlice.ts`, `marketSlice.ts`, `systemsSlice.ts`, `racingSlice.ts`.

### Fix

Add to `src/game/store/guards.ts` (new file):

```ts
export function requireOwned(horse: Horse | undefined): { ok: false; reason: string } | null {
  if (!horse) return { ok: false, reason: "Horse not found." };
  if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
  return null;
}

export function requireHorse(horses: Horse[], id: string): Horse | undefined {
  return horses.find(h => h.id === id);
}
```

Replace all inline ownership guards across all slices. The guard strings must be identical after — check for any slight variations in current wording.

### Acceptance criteria

- `grep -rn "don't own\|do not own" src` returns results only in `src/game/store/guards.ts`.
- All action handler tests pass.

---

## A7 — `hypotheticalCoi` construction repeated

### Problem

When code needs to estimate COI for a *prospective* mating (before a foal exists), it manually constructs a snapshot pedigree object:

```ts
const prospectivePedigree = {
  sireId: sire.id,
  damId: dam.id,
  sirePedigree: sire.pedigree,
  damPedigree: dam.pedigree,
};
computeCoiFromSnapshot(prospectivePedigree as any);
```

This pattern appears in `npcBreeding.ts` and `breedingCompatibility.ts`. The `as any` cast is a red flag.

### Fix

Add to `src/core/breeding/populationGenetics.ts`:

```ts
export function computeProspectiveCoi(sire: Horse, dam: Horse): number
```

This wraps the snapshot construction internally. Delete all inline constructions and replace with the wrapper.

### Acceptance criteria

- `grep -rn "sirePedigree.*sire.pedigree\|as any.*coi\|COI.*as any" src` returns zero results.

---

## Implementation notes

- All changes in this cluster are pure refactors: zero behaviour change, zero new features.
- Each A-item can be a separate PR.
- Recommended order within A: A3 first (unblocks store testing), then A1 (fixes the valuation bug), then A5 (enables A-level regression test for award scoring), then A2, A4, A6, A7.
- The engineer should run `npx vitest run` before and after each item and confirm identical pass/fail counts.
