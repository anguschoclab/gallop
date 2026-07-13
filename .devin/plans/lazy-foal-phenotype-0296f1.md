# Lazy Phenotype Resolution

Universal deferred phenotype resolution for all horses created via `createHorseFromDNA`, splitting the expensive trait computation out of the creation hot path and resolving on first access.

---

## Spec Findings & Code Audit

### What the spec proposes (approved/disproved)

| Spec claim                                           | Verdict                                                  | Evidence                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `phenotypeResolved?: boolean` to `Horse`         | **Approved**                                             | Clean addition to `src/core/horse/types.ts:113-224`. No backward-compat needed per user.                                                                                                                                                                                                                                                                                                                            |
| `resolveDnaTraits()` is the expensive call to defer  | **Approved**                                             | `horseFactory.ts:125-143` — 16 resolve calls. But see below: the "cheap" path in `createHorseFromDNA` (lines 177-198) also calls `resolveStats`, `resolveCoatColor`, `resolveRunningStyle`, 4 aptitude resolvers, `resolveInjuryProneness`, `resolveSize`, `resolveGeneticMarkers`, `resolveHealthStatus`, and `generateAppearanceDNA`. **All phenotype resolution must be deferred, not just `resolveDnaTraits`.** |
| Split `resolveFoaling()` into cheap/expensive stages | **Approved, but scope is wider**                         | Since we're doing universal lazy resolution, the split happens inside `createHorseFromDNA` itself, not just in `resolveFoaling`.                                                                                                                                                                                                                                                                                    |
| `resolvePhenotype(horse)` is a pure function         | **Approved**                                             | Seeded RNG via `createRng(hashStr(horse.id))` guarantees determinism. All resolve functions in `phenotype.ts` are pure.                                                                                                                                                                                                                                                                                             |
| `resolveHorsePhenotype(horseId)` store action        | **Approved**                                             | Fits Zustand pattern in `store/index.ts:234-329`. Add to utility or core slice.                                                                                                                                                                                                                                                                                                                                     |
| `phenotype.ts` refactor into 6 modules               | **Approved with revision**                               | Current consumers: `horseFactory.ts` (21 imports), `runnerBuilder.ts` (`TRAIT_VALUES`, `fiberDistanceModifier`), `energy.ts` (`resolveEpmRisk`), `scouting.ts` (`resolveCoatColor`), `breedingSimulator.ts` (12 imports), `breedingCompatibility.ts` / `genotypeMatching.ts` / `traitCompatibility.ts` (`TRAIT_SCORE`). Barrel `index.ts` re-export keeps all external imports stable.                              |
| Trigger: horse detail page                           | **Approved**                                             | `stable.$horseId.tsx:403-414` — `useHorseActions` returns the horse. Resolve before render.                                                                                                                                                                                                                                                                                                                         |
| Trigger: race entry                                  | **Approved**                                             | `npcRaceEntryHelpers.ts:43` calls `isHorseEligibleForRace` → `calculateOverallRating` → reads `horse.stats.*`. `runnerBuilder.ts:209-380` reads every phenotype field. Must resolve before both.                                                                                                                                                                                                                    |
| Trigger: auction listing                             | **Approved**                                             | `auction.ts:646-689` — `personalityConsignmentPolicy` reads `h.peakAge`, `h.fame`, `h.potential`, `h.careerStarts`. `calculateNpcHorseValue` → `calculateOverallRating` → `horse.stats.*`. `generateBreezeSeconds` reads `horse.stats.speed/acceleration`. Must resolve before scoring.                                                                                                                             |
| Trigger: breeding                                    | **Approved**                                             | `strategy.ts:181` reads `stallion.fertility`. `canBreed` in `eligibility.ts` doesn't read phenotype fields directly (only gender, age, health status), but `breedingResolution.ts:60-61` reads `sire.stud?.atStud` which depends on setup-time data, not phenotype. The spec's concern is valid for NPC breeding in `npcBreeding.ts:86` where `calculateOverallRating(h)` is called on candidate mares.             |
| Backward compat (saves)                              | **Not needed** — user confirmed no save compat required. |

### Critical discovery: "cheap" vs "expensive" in `createHorseFromDNA`

The spec frames `resolveDnaTraits` (16 fields) as the expensive part, but `createHorseFromDNA:177-254` actually calls ~30 resolve functions total. The full list of fields that must be deferred:

**From `resolveDnaTraits` (lines 125-143):** `heartScore`, `fiberBias`, `strideType`, `trackPreference`, `mudAptitude`, `trainability`, `peakAge`, `recoveryRate`, `fertility`, `foalingEase`, `markings`, `bleederRisk`, `roarerRisk`, `ocdRisk`, `racingViable`, `heterozygosity`

**From the main body (lines 177-254):** `conformation`, `temperament`, `stats`, `coatColor`, `runningStyle`, `distanceAptitude`, `surfaceAptitude`, `climbingAptitude`, `corneringAptitude`, `injuryProneness`, `height`, `weight`, `geneticMarkers`, `healthStatus`, `appearance`

**Total: 31 phenotype-derived fields.** All must be populated by `resolvePhenotype()`.

### Fields that stay in the cheap path (identity/structure only)

`id`, `name`, `age`, `gender`, `hemisphere`, `silk`, `genotype`, `energy`, `form`, `potential`, `fame`, `raceHistory`, `owned`, `stableId`, `lifetimeEarnings`, `careerStarts`, `careerWins`, `healthStatusDay`, `isBlueHen`, `gelded`, `lifecycleStatus`, `courseVisits`, `foalsProduced`, `sireName`, `damName`, `pedigree`, `birthDay`, `fitness`, `fatigue`, `peakingIndex`, `bloodline`, `recoveryPoints`, `createdAtDay`

---

## Implementation Plan

### Phase 1: Data model + `resolvePhenotype` pure helper

1. **`src/core/horse/types.ts`** — Add `phenotypeResolved?: boolean` to `Horse` type.

2. **`src/core/horse/horseFactory.ts`** — Refactor `createHorseFromDNA`:
   - Extract all phenotype resolution into a new exported function `resolvePhenotype(horse: Horse): Horse`.
   - `resolvePhenotype` creates an RNG seeded with `hashStr(horse.id)`, calls all 31 resolve functions using `horse.genotype`, returns `{ ...horse, ...resolvedFields, phenotypeResolved: true }`.
   - `createHorseFromDNA` now only sets identity/structure fields + `phenotypeResolved: false`. Uses **safe defaults** for phenotype fields (zero stats, empty aptitudes, etc.) so TypeScript is satisfied.
   - Add a guard helper: `ensurePhenotypeResolved(horse: Horse): Horse` — returns horse unchanged if already resolved, otherwise calls `resolvePhenotype`.
   - Export both `resolvePhenotype` and `ensurePhenotypeResolved`.

3. **Keep `resolveFoaling` unchanged** — it calls `createHorseFromDNA` which now returns an unresolved horse. The foal gets `phenotypeResolved: false` automatically.

### Phase 2: Store action

4. **`src/game/store/slices/coreSlice.ts`** (or utility slice) — Add `resolveHorsePhenotype(horseId: string): void` action:
   ```
   finds horse → calls resolvePhenotype → patches horse in state.horses
   ```
5. **`src/game/store/index.ts`** — Wire the new action into the store type and composition. No need to add to `PERSISTED_KEYS` since `phenotypeResolved` is part of the `Horse` objects which are already in `horses`.

### Phase 3: Trigger points (NPC/pipeline side — pure function calls)

6. **`src/game/npcRaceEntry.ts:144`** — In `runNpcRaceEntry`, call `ensurePhenotypeResolved` on each horse returned by `selectHorsesForRaceEntry` before using it. Also resolve inside `selectHorsesForRaceEntry` (in `npcRaceEntryHelpers.ts:35`) before `isHorseEligibleForRace`.

7. **`src/game/auction.ts:646-689`** — In `personalityConsignmentPolicy`, resolve each `owned` horse before filtering. In `generateAuctionLots`, resolve `policy.consign` horses before `calculateNpcHorseValue`. Fresh NPC horses from `generateNpcHorse` are also unresolved now — resolve before pricing.

8. **`src/game/auction.ts:809-848`** — In `resolveAuctionSale`, resolve horse before `calculateNpcBid`.

9. **`src/game/npcBreeding.ts:76-86`** — Resolve candidate mares before `calculateOverallRating` filter. Resolve stallions before `scoreStallion` / `calculateAIStallionScore` (which reads `fertility`).

10. **`src/core/ai/auctionAI.ts:89-100`** — `calculateBiddingValue` receives a `Horse`; ensure caller resolves first (covered by step 8).

11. **`src/core/ai/auctionAI.ts:313-349`** — `shouldConsignHorse` calls `calculateOverallRating`; ensure caller resolves first (covered by step 7).

12. **`src/core/race/engine/runnerBuilder.ts:209`** — `buildRunner` reads every phenotype field. Add `h = ensurePhenotypeResolved(h)` as the first line. This is the safety net — if any caller forgets, the runner builder catches it.

13. **`src/core/time/phases/energy.ts:94`** — `resolveEpmRisk` reads from `h.genotype.health.epm` directly (not from a resolved field), so **no change needed**. It accesses the genotype, not the phenotype.

14. **`src/core/breeding/strategy.ts:181`** — Reads `stallion.fertility`. Callers in `npcBreeding.ts` must resolve first (step 9).

15. **`src/game/scouting.ts`** — `scoutHorse` generates a `ScoutReport` from horse stats. Callers should resolve first. Check `managementResolution.ts:268` where `scoutHorse` is called — add resolve there.

### Phase 4: Trigger points (UI side — store action)

16. **`src/routes/stable.$horseId.tsx`** — In `HorseDetail`, after getting `horse` from `useHorseActions`, check `horse.phenotypeResolved !== true` and call `resolveHorsePhenotype(horseId)`. Use `useEffect` or gate the render.

17. **`src/hooks/useHorseActions.ts`** — Alternative: resolve inline here so every consumer gets a resolved horse. Preferred approach: add `resolveHorsePhenotype` call inside this hook when horse exists and `phenotypeResolved !== true`.

### Phase 5: `phenotype.ts` refactor

18. Create `src/core/genetics/phenotype/` directory with six modules:

| File          | Functions moved from `phenotype.ts`                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color.ts`    | `resolveCoatColor` + internal color helpers (lines 49-96)                                                                                                                                                                                                                                          |
| `stats.ts`    | `resolveStats` (lines 103-120)                                                                                                                                                                                                                                                                     |
| `aptitude.ts` | `resolveDistanceAptitude`, `resolveSurfaceAptitude`, `resolveAptitudeMultiplier`, `resolveRunningStyle`, `fiberDistanceModifier`                                                                                                                                                                   |
| `health.ts`   | `resolveGeneticMarkers`, `resolveHealthStatus`, `resolveBleederRisk`, `resolveRoarerRisk`, `resolvePssmRisk`, `resolveRerRisk`, `resolveEpmRisk`, `resolveRacingViable`, `computeHeterozygosity`                                                                                                   |
| `traits.ts`   | `resolveHeartScore`, `resolveFiberBias`, `resolveStrideType`, `resolveTrackPreference`, `resolveMudAptitude`, `resolveTrainability`, `resolvePeakAge`, `resolveRecoveryRate`, `resolveFertility`, `resolveFoalingEase`, `resolveMarkings`, `resolveInjuryProneness`, `resolveSize`, `resolveTrait` |
| `index.ts`    | Re-exports everything. `TRAIT_VALUES`, `TRAIT_SCORE` constants live here.                                                                                                                                                                                                                          |

19. Delete original `phenotype.ts` after moving all content.

20. **Zero external import changes required** — all consumers import from `@/core/genetics/phenotype` which resolves to the `index.ts` barrel.

### Phase 6: Testing & verification

21. **`bunx tsc --noEmit`** — TypeScript clean.
22. **Run existing test suite** — `bunx vitest run` to catch regressions.
23. **Manual verification** per spec:
    - Advance through breeding season (no freeze)
    - Open newborn foal detail page (traits appear)
    - NPC auction phase (intelligent scoring, not zero-stat)
    - Enter foal in race (sim runs correctly)
    - Breed a foal (fertility validation works)
    - RNG determinism (same horse → same traits across sessions)

---

## Files Modified (exhaustive)

| File                                           | Change                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/core/horse/types.ts`                      | Add `phenotypeResolved?: boolean`                                                                         |
| `src/core/horse/horseFactory.ts`               | Extract `resolvePhenotype()`, `ensurePhenotypeResolved()`. Gut phenotype calls from `createHorseFromDNA`. |
| `src/game/store/slices/coreSlice.ts`           | Add `resolveHorsePhenotype` action                                                                        |
| `src/game/store/index.ts`                      | Wire action into store type                                                                               |
| `src/game/npcRaceEntry.ts`                     | Resolve horses before race entry                                                                          |
| `src/game/npcRaceEntryHelpers.ts`              | Resolve horse before eligibility check                                                                    |
| `src/game/auction.ts`                          | Resolve in `personalityConsignmentPolicy`, `generateAuctionLots`, `resolveAuctionSale`                    |
| `src/game/npcBreeding.ts`                      | Resolve mares + stallions before scoring                                                                  |
| `src/core/race/engine/runnerBuilder.ts`        | Safety-net resolve in `buildRunner`                                                                       |
| `src/core/time/phases/managementResolution.ts` | Resolve before `scoutHorse`                                                                               |
| `src/hooks/useHorseActions.ts`                 | Auto-resolve on access                                                                                    |
| `src/routes/stable.$horseId.tsx`               | Guard for unresolved horse                                                                                |
| `src/core/genetics/phenotype.ts`               | Delete (replaced by directory)                                                                            |
| `src/core/genetics/phenotype/color.ts`         | New                                                                                                       |
| `src/core/genetics/phenotype/stats.ts`         | New                                                                                                       |
| `src/core/genetics/phenotype/aptitude.ts`      | New                                                                                                       |
| `src/core/genetics/phenotype/health.ts`        | New                                                                                                       |
| `src/core/genetics/phenotype/traits.ts`        | New                                                                                                       |
| `src/core/genetics/phenotype/index.ts`         | New barrel + `resolveDnaTraits`                                                                           |

## Files NOT modified (and why)

| File                                                | Reason                                                                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/time/phases/pregnancy.ts`                 | Calls `resolvePregnancies` which calls `resolveFoaling` → `createHorseFromDNA`. Foals are created unresolved automatically. No change needed.                                                |
| `src/game/store/helpers/pregnancy.ts`               | Same — `resolveFoaling` returns unresolved foal, pushed to state. No change needed.                                                                                                          |
| `src/core/time/phases/energy.ts`                    | Reads `genotype.health.epm` directly, not a phenotype field. No change needed.                                                                                                               |
| `src/core/breeding/eligibility.ts`                  | `canBreed` only checks gender, age, health status, pregnancy — no phenotype fields. No change needed.                                                                                        |
| `src/core/resolver/validators/BreedingValidator.ts` | Only checks existence, gender, cash. No phenotype access. No change needed.                                                                                                                  |
| `src/core/time/phases/breedingResolution.ts`        | Reads `sire.stud?.atStud`, `sire.hemisphere` — structural fields. No change needed.                                                                                                          |
| `src/core/ai/auctionAI.ts`                          | Callers resolve before passing horse. No internal change needed.                                                                                                                             |
| `src/core/breeding/strategy.ts`                     | Callers resolve before passing stallion. No internal change needed.                                                                                                                          |
| `src/game/famousStallions.ts`                       | Calls `createHorseFromDNA` — horses are created unresolved. Famous stallions used at init time may need resolution, but the startup path already loops horses. Resolution happens on demand. |

---

## Risk notes

- **Safe defaults for unresolved horses**: Stats default to `{ speed: 0, stamina: 0, acceleration: 0, consistency: 0 }`. If any code path accidentally uses an unresolved horse in computation, it'll produce obviously wrong results (zero-stat) rather than subtle bugs. The `runnerBuilder` safety net catches the race sim path.
- **RNG determinism**: `resolvePhenotype` seeds with `hashStr(horse.id)`. The same horse ID always produces the same phenotype regardless of when resolution occurs. The `potential` field (which uses `rng.next()`) must be computed in the cheap path since it's non-phenotype but was previously RNG-dependent — it stays in `createHorseFromDNA`.
- **Mutation note**: `resolvePhenotype` returns a new object. `ensurePhenotypeResolved` also returns a new object — callers in pipeline code must use the returned value. The store action mutates in place via `set()`.
