# Refactor B — Data Extraction

**Date:** 2026-05-09
**Order:** 2 of 5 (do after A — depends on nothing, unblocks C)
**Risk:** Low — moves static data out of logic files, no logic changes
**Scope:** Extract large static data arrays and lookup tables from logic files into dedicated data modules.

---

## Why this second

Three files are unreadable because hundreds of lines of static data (arrays, dictionaries) obscure the actual logic. Extracting the data makes the logic immediately visible and enables editors to fold/ignore the data. This is a prerequisite to the god-file extractions in cluster C, which operate on the same files.

---

## B1 — Stable pool data out of `npcStables.ts`

### Problem

`src/game/npcStables.ts` is 735 lines. Lines 1–530 are three static arrays of stable descriptors:

- `ELITE_POOL` — ~60 entries, each with `name`, `colors`, `description`, `country`, `personality`, `tier`, `breedingArchetype`
- `MID_POOL` — ~80 entries
- `BUDGET_POOL` — ~150 entries

These arrays are pure configuration data — no functions, no imports, no logic. They account for ~72% of the file. The actual generator functions (`generateAllStables`, etc.) start around line 540.

### Fix

1. Create `src/core/stable/stablePoolData.ts`.
2. Move `ELITE_POOL`, `MID_POOL`, `BUDGET_POOL` and their element type (`StableDescriptor` or equivalent) into the new file. Export all three arrays.
3. In `npcStables.ts`, replace the inline arrays with imports from `@/core/stable/stablePoolData`.
4. Verify `npcStables.ts` is now ≤250 lines and contains only generator functions and utilities.

### File structure after

```
src/core/stable/
  stablePoolData.ts   ← new: ELITE_POOL, MID_POOL, BUDGET_POOL + StableDescriptor type
  stableConfig.ts     ← existing: PERSONALITY_CONFIG
  types.ts            ← existing: Stable, StableTier, etc.
src/game/
  npcStables.ts       ← now ≤250 lines: generateAllStables + utility functions only
```

### Acceptance criteria

- `wc -l src/game/npcStables.ts` ≤ 250.
- `wc -l src/core/stable/stablePoolData.ts` contains all pool data with no logic.
- All tests that reference `npcStables` pass.
- No change to the shape of objects returned by `generateAllStables`.

---

## B2 — Farm mapping dictionary out of `npcStables.ts`

### Problem

`src/game/npcStables.ts` contains a `farmMapping` dictionary (approximately lines 661–711) that maps 40+ real-world stud farm name strings to game stable names. It is tightly coupled to `ELITE_POOL` and `MID_POOL` data but maintained separately, meaning a stable added to a pool may silently have no farm mapping.

### Fix

1. Create `src/core/stable/stallionFarmMapping.ts`.
2. Move the `farmMapping` record into the new file. Export it as `STALLION_FARM_MAPPING`.
3. In `npcStables.ts`, import `STALLION_FARM_MAPPING` from the new file.
4. Add a comment at the top of `STALLION_FARM_MAPPING` noting that entries must be kept in sync with `ELITE_POOL` and `MID_POOL` in `stablePoolData.ts`.
5. Consider adding a development-time invariant check: on first load in dev mode, assert that every entry in `farmMapping` corresponds to a name in `ELITE_POOL` or `MID_POOL`.

### Acceptance criteria

- `farmMapping` no longer appears in `npcStables.ts`.
- `mapStallionToStable` in `npcStables.ts` imports `STALLION_FARM_MAPPING` from the new file.
- No behaviour change.

---

## B3 — Affinity lookup tables out of `breedingCompatibility.ts`

### Problem

`src/game/breedingCompatibility.ts` is 449 lines. It mixes:

- Factor-scoring logic functions
- The orchestrating `calculateBreedingCompatibility` function
- Static lookup tables: `NICKING_AFFINITIES` (~lines 143–156) and `CROSS_FAMILY_AFFINITIES` (~lines 320–330)

Static lookup tables are configuration data. They do not belong in the same file as the scoring logic — they make the logic harder to read and the data harder to audit for completeness.

### Fix

1. Create `src/core/breeding/breedingAffinityData.ts`.
2. Move `NICKING_AFFINITIES` and `CROSS_FAMILY_AFFINITIES` (and any other static lookup tables in that file) into the new file. Export them.
3. In `breedingCompatibility.ts`, import them from `@/core/breeding/breedingAffinityData`.
4. Verify `breedingCompatibility.ts` contains no static data (only imports, functions, and the aggregate orchestrator).

### File structure after

```
src/core/breeding/
  breedingAffinityData.ts   ← new: NICKING_AFFINITIES, CROSS_FAMILY_AFFINITIES
  archetypes.ts             ← existing
  programs.ts               ← existing
src/game/
  breedingCompatibility.ts  ← scoring logic only, ≤350 lines
```

### Acceptance criteria

- `grep -n "NICKING_AFFINITIES\|CROSS_FAMILY_AFFINITIES" src/game/breedingCompatibility.ts` returns only import lines, not definitions.
- All breeding compatibility tests pass with identical scores.

---

## B4 — Named constants for magic day numbers

### Problem

`src/game/store/slices/coreSlice.ts` uses raw numbers in `advanceWeek`, `advanceMonth`, `advanceYear`:

```ts
advanceWeek: () => advanceMultipleDays(7, headless);
advanceMonth: () => advanceMultipleDays(30, headless);
advanceYear: () => advanceMultipleDays(365, headless);
```

`7`, `30`, and `365` appear in multiple files without being defined as named constants in `gameConstants.ts`.

### Fix

Add to `src/game/constants/gameConstants.ts`:

```ts
export const DAYS_PER_WEEK = 7;
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = 365;
```

Update `coreSlice.ts` and any other file that hardcodes `30` or `365` as a day-count to import these constants.

### Acceptance criteria

- `grep -rn "advanceMultipleDays(7\|advanceMultipleDays(30\|advanceMultipleDays(365" src` returns zero results.
- `grep -rn "DAYS_PER" src/game/constants/gameConstants.ts` shows all three constants defined.

---

## Implementation notes

- B1, B2, B3, B4 are fully independent of each other. They can be done in parallel or as separate PRs.
- B1 is highest value (removes ~530 lines from a logic file).
- No tests need to be written — existing tests cover the behaviour. The engineer should run the full suite before and after and confirm identical results.
- Use `git mv` where appropriate to preserve file history.
