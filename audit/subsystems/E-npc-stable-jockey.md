# Audit: NPC, Stable, Jockey, Staff (Subsystem E)

**Scope:** `src/core/npc/` (20 files), `src/core/stable/` (28 files), `src/core/jockey/` (10 files), `src/core/staff/` (4 files)

## Cross-cutting checks

| Pattern | Count | Locations |
|---------|-------|-----------|
| `as any` | 4 | `insuranceIntents.ts:71-74` (PR #393 fixes) |
| `as unknown as` | 0 | — |
| `console.*` | 7 | `intentGenerators.ts:293`, `npcRegionalDominance.ts:321,347`, `npcFame.ts:90`, `raceEntry.ts:103`, `npcCycle.ts:180,201` |
| TODO/FIXME | 0 | — |
| Non-null assertions (`!`) | 8 | `raceEntry.ts:186,187,190`, `raceEntryIntents.ts:45`, `breeding.ts:130,131,145,174` |

## Files requiring action

### FIX: `src/core/npc/intents/insuranceIntents.ts:71-74`
4 `as any` casts accessing `horse.currentGrade` and `horse.racing?.speed` — non-existent properties on `Horse` type. The graded-horse branch is logically unreachable. **PR #393 fixes this.**

### FIX: `src/core/stable/stableSelection.ts:26`
`shuffleAndPick` uses `array.sort(() => rng.next() - 0.5)` — biased, non-deterministic shuffle. Replace with Fisher-Yates.

### FIX: `src/core/npc/npcCycle.ts:109`
`yesterdayRaces` filter uses `r.day === currentDay` but variable name says "yesterday" — off-by-one. Should be `currentDay - 1` or `< currentDay`.

### FIX: `src/core/npc/stables.ts:119`
`rng.pick(midTierArchetypes).id` unguarded for empty array (elite/specialist branches have guards, this one doesn't).

### REFACTOR: `src/core/npc/breeding.ts`
- l.229: `tempState as GameState` unsafe cast from `Partial<GameState>`
- l.130,131,145,174: multiple `s.stud!`/`sire.stud!` non-null assertions

### REFACTOR: `src/core/npc/raceEntry.ts:186-190`
`chosenJockey!.id` non-null assertions — could throw if `selectBestFreeAgentJockey` returns null.

### REFACTOR: `src/core/npc/npcFame.ts:90`
`console.error` in catch — swallows errors, returns empty map.

### REFACTOR: `src/core/npc/npcRegionalDominance.ts:293,310,321,347`
Non-null assertions + `console.error` calls.

### REFACTOR: `src/core/npc/intentGenerators.ts:119,293`
Inline type annotation bypasses real entry type; `console.warn` in catch.

### REFACTOR: `src/core/npc/intents/raceEntryIntents.ts:45,85`
`race.graded!.key` non-null assertion; `allJockeys[0]` fallback assigns arbitrary jockey.

## All other files: KEEP
62 files audited, 9 requiring action, 53 KEEP.
