## 2026-08-30 - [Strengthened raceHistoryEntry in buildRaceContext]
**Learning:** Found an `any` typing on `entry: any` when filtering `horse.raceHistory` in `buildRaceContext` inside `src/services/narrative/raceContextBuilder.ts`. This obscured the shape of the `raceHistory` entries making it hard to track properties like `raceName` and `raceId`.
**Action:** Replaced `any` with `HorseRaceHistoryEntry` type from `@/core/horse/types` to provide proper typing and auto-completion when dealing with horse's race history.
