## 2024-05-19 - Narrowing Race History Entry in Context Builder
**Learning:** In `src/services/narrative/raceContextBuilder.ts`, the `horse.raceHistory` callback uses an explicit `any` type (`entry: any`), masking the true structure of a horse's race history.
**Action:** Replace `any` with the inferred type to ensure `raceName` and `raceId` properties are strictly typed as `HorseRaceHistoryEntry`.
