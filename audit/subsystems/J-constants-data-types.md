# Audit: Constants, Data, Types, Lib (Subsystem J)

**Scope:** `src/constants/` (37 files), `src/data/` (11 files), `src/core/common/` (13 files), `src/core/types/`, `src/lib/` (1 file)

## Cross-cutting checks

| Pattern | Hits |
|---------|------|
| `as any` | 0 |
| `as unknown as` | 0 |
| `console.*` | 0 |
| TODO/FIXME | 0 |

## Files requiring action

### FIX (cleanup): Dead imports
- `src/data/gradedRaces.ts:16` — unused `import { generateUUID }`
- `src/data/tracks.ts:13` — unused `import { generateUUID }`

### FIX (cleanup): Stale JSDoc dependency comments
- `src/data/pedigreeData.ts:8` — references `@/game/rng` (actual: `@/core/common/rng`)
- `src/data/gradedRaces.ts:7` — references `@/game/tracks` (actual: `@/data/gradedRaces`)
- `src/core/common/classBonus.ts:7` — references `@/game/gradedRaces` (actual: `@/data/gradedRaces`)
- `src/core/common/random.ts:7` — references `@/game/rng` (actual: `@/core/common/rng`)
- `src/core/common/types.ts:7` — references `@/game/rng` (actual: `@/core/common/rng`)

### REFACTOR: `src/core/types/branded.ts`
(See subsystem C audit for details) — `Brand<T,_B> = T` provides no nominal safety. 18 branded types are all plain `string` aliases.

### KEEP with notes
- `pipelineConstants.ts` — 55 `PHASE_ORDER_*` constants, some appended out of numeric order (execution still correct by value sort)
- `raceClassificationConstants.ts:64-72,151-154` — `MAIDEN_GUARANTEE` block duplicated
- `src/data/famousStallions.ts:54` — dead write to `horse.ownership` immediately overwritten at l.59; `as string` cast at l.59
- `src/data/realWorldMarketIndices.ts:314,317` — `realWorldSeries` returns `undefined` silently for unknown grade/track
- `src/core/common/rng.ts` — `createTestRng` NOT exported from here (lives in `src/tests/helpers.ts`); `nondeterministicRng()` throws if `crypto.getRandomValues` unavailable
- `src/core/common/arrayHelpers.ts` — `as number` casts in `maxBy` (l.73-74), `as Record` in `groupBy`/`countBy`

## Files: KEEP
62 files audited, 2 requiring action (dead imports + stale JSDoc), 60 KEEP.
