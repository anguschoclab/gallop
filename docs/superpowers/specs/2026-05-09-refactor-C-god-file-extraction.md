# Refactor C — God File Extraction

**Date:** 2026-05-09
**Order:** 3 of 5 (do after A and B — some extractions import utilities fixed in A)
**Risk:** Medium — moves functions between files, import graph changes
**Scope:** Break apart files that mix 3+ unrelated responsibilities into focused single-purpose modules.

---

## Why this third

After A and B, the pool data and shared utilities are in clean locations. Now the god files can be broken apart cleanly — the extracted modules will import from `@/core/horse/stats` (A1), `@/core/horse/gender` (A4), and `@/core/stable/stablePoolData` (B1) instead of re-inventing them.

---

## C1 — `npcRaceEntry.ts` has four unrelated responsibilities

### Problem

`src/game/npcRaceEntry.ts` is 384 lines and mixes four distinct concerns that have no logical dependency on each other:

| Lines | Concern |
|---|---|
| 1–214 | NPC race entry AI — evaluates upcoming races, assigns jockeys, files entry intents |
| 215–249 | `fillRaceWithFillerHorses` — populates sparse race fields with anonymous horses |
| 255–329 | `runNpcTraining` — NPC horse training simulation (completely separate domain) |
| 330–383 | `updateHorseFame` — post-race fame mutation (post-race lifecycle, not entry) |

`runNpcTraining` has no relationship to race entry. `updateHorseFame` fires after race results, not before. `fillRaceWithFillerHorses` is race administration, not NPC stable strategy.

### Fix

Extract into three new files:

**`src/game/npcTraining.ts`** — receives `runNpcTraining`
- Contains training evaluation, training intent generation
- Depends on: horse stats, stable personality config

**`src/game/npcPostRace.ts`** — receives `updateHorseFame`
- Contains post-race horse stat mutations (fame, form, energy recovery)
- Depends on: race results, horse data

**`src/game/raceFieldManager.ts`** — receives `fillRaceWithFillerHorses`
- Contains race field population with anonymous filler entries
- Depends on: race data, RNG

`npcRaceEntry.ts` after extraction: **≤220 lines**, containing only `runNpcRaceEntry`, `selectHorsesForRaceEntry`, `shouldEnterHorse`, and related entry-decision helpers.

### Callers to update

After extraction, find and update all call sites:
- `runNpcTraining` — called from `src/core/time/phases/training.ts` or similar; update import
- `updateHorseFame` — called from race resolution phase; update import
- `fillRaceWithFillerHorses` — called from race generation; update import

Run `grep -rn "runNpcTraining\|updateHorseFame\|fillRaceWithFillerHorses" src` to find all call sites before starting.

### Acceptance criteria

- `wc -l src/game/npcRaceEntry.ts` ≤ 220.
- Each new file has a single clearly-stated purpose in its first comment.
- `grep -rn "runNpcTraining" src/game/npcRaceEntry.ts` returns zero results.
- All NPC race entry, training, and post-race tests pass.

---

## C2 — `npcHorseGen.ts`: `generateFamousStallions` is an unrelated concern

### Problem

`src/game/npcHorseGen.ts` mixes two independent code paths:

1. **`generateStableHorses` / `generateAllNpcHorses`** — procedural NPC horse generation using AI state, age categories, and personality config. Depends on `horseFactory`, `horseGenAI`, `bruceLowe`, population genetics.

2. **`generateFamousStallions`** — seeds real-world stallion data from `activeStallions2020s`. Reads from a static dataset, maps to game stables, assigns hard-coded stud careers. Has no logical dependency on `generateStableHorses`.

3. **`calculateNpcHorseValue` / `getStudFee` / `getBroodmareFee`** — already duplicated in `src/core/horse/pricing.ts` (see Refactor A1). These should be deleted here and imported from pricing.

### Fix

**Create `src/game/famousStallions.ts`** — receives `generateFamousStallions`
- Imports: `activeStallions2020s`, `createHorseFromDNA`, `generateResearchBasedGenotype`, `mapStallionToStable`, `resolveBloodline`, `rollProceduralFamily`
- Single export: `generateFamousStallions(stables, rng)`

**In `npcHorseGen.ts`:**
- Delete `generateFamousStallions` (moved to `famousStallions.ts`)
- Delete `calculateNpcHorseValue`, `getStudFee`, `getBroodmareFee` — after A1 is done, these are imported from `@/core/horse/pricing`
- Update `src/game/store/initialization.ts` to import `generateFamousStallions` from `@/game/famousStallions`
- Update `src/workers/initialization.worker.ts` similarly if it calls `generateFamousStallions`

### Acceptance criteria

- `wc -l src/game/npcHorseGen.ts` ≤ 150.
- `src/game/famousStallions.ts` exists and exports only `generateFamousStallions`.
- `grep -rn "calculateNpcHorseValue" src/game/npcHorseGen.ts` returns zero results (deleted, imported from pricing).
- Game initialization produces the same number of famous stallions as before.

---

## C3 — `personalitySystem.ts` duplicates `learningModule.ts`

### Problem

`src/core/ai/personalitySystem.ts` (~277 lines) and `src/core/ai/learningModule.ts` both maintain:
- An `outcomes[]` array
- Success rate calculation
- Memory depth trimming
- Strategy adaptation based on success rate

The `recordOutcome`, `shouldAdaptStrategy`, and `adaptStrategy` methods in `personalitySystem.ts` are a parallel implementation of what `learningModule.ts` already provides cleanly. Both maintain separate state tracking for the same "did this action succeed?" question.

### Fix

1. Audit what `learningModule.ts` already exports. It should provide (or be extended to provide):
   - `recordOutcome(state, category, contextKey, success, value, timestamp, day, memoryDepth)`
   - `getSuccessRate(state, category, contextKey)`
   - `pruneOldOutcomes(state, cutoffDay)`

2. In `personalitySystem.ts`, delete the `outcomes` array, `recordOutcome`, `shouldAdaptStrategy`, and `adaptStrategy` methods. Replace all internal calls with delegation to `learningModule` functions.

3. `getPersonalityAIState` should return a state shape that includes a `LearningState` field rather than its own parallel outcomes array.

4. Update `breedingAI.ts` and any other file that calls `personalitySystem.recordOutcome` to call `learningModule.recordOutcome` directly, or through the unified personality state.

### Important

Do **not** delete the personality-specific configuration (risk tolerance, strategy confidence thresholds, decision weights) from `personalitySystem.ts` — only the duplicated learning state machinery.

The `strategyConfidence` field on `PersonalityAIState` is mutated directly by `breedingAI.ts:adaptBreedingStrategy`. This mutation must continue to work after the refactor — either keep `strategyConfidence` on `PersonalityAIState` (field is fine, only the `outcomes[]` array and its methods move out), or thread `strategyConfidence` updates through the returned state from `learningModule`.

### Acceptance criteria

- `grep -n "outcomes\s*[:=]\s*\[\]" src/core/ai/personalitySystem.ts` returns zero results.
- `grep -n "shouldAdaptStrategy\|adaptStrategy" src/core/ai/personalitySystem.ts` returns zero results.
- All AI-related tests pass (breeding AI, NPC cycle, personality tests).
- No regression in NPC stable behaviour as observed through simulation tests.

---

## C4 — `npcStables.ts` generator functions remain after B1/B2

### Problem

After B1 (pool data extracted) and B2 (farm mapping extracted), `npcStables.ts` will still contain generator functions and utility functions mixed with each other. This item ensures the remaining code is clean.

### Fix (after B1 and B2 are complete)

Verify `npcStables.ts` after B1 and B2 contains only:
- `generateAllStables` — the factory function
- Utility helpers: `getStableById`, `getMajorStables`, `getStablesByTier`, `getStartingCashForTier`, `getTargetHorseCountForTier`, `mapStallionToStable`

If utility helpers that are conceptually "query a list of stables" are mixed with "generate stables", consider moving the query helpers to a `src/core/stable/stableQueries.ts`. This is optional if the file is ≤200 lines after B1/B2.

### Acceptance criteria

- `wc -l src/game/npcStables.ts` ≤ 200 (post B1 and B2).
- No static data arrays remain in the file.

---

## Implementation notes

- C1 is highest priority (4 concerns in one file, `runNpcTraining` has bugs that are hard to find because it's buried).
- C2 depends on A1 being done first (to delete the duplicate `calculateNpcHorseValue`).
- C3 is highest risk in this cluster — test AI behaviour before and after with a multi-day simulation snapshot test.
- C4 is a cleanup item, not a refactor — do it as part of closing out B.
- All changes should be accompanied by a `grep -rn "import.*from.*<old-file>"` to find and update all importers.
