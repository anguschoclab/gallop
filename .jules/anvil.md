## 2025-02-28 - Removed any from fileClaim in RaceFeed
**Learning:** `fileClaim` was typed as `any` in `RaceFeedProps`, which obscured the expected signature and allowed potential runtime errors if the arguments were incorrect. `horses` was also typed as `any[]`.
**Action:** Typed `fileClaim` correctly using its signature from `privateSaleSlice.ts` (`(raceId: string, horseId: string) => { ok: boolean; reason?: string }`) and `horses` to `Horse[]`. Narrowing parameter types in component props prevents bugs where incorrect callbacks are passed down.
