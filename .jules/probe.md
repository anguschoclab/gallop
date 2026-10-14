## 2024-05-18 - recordDailyProgress drops historical snapshots for deceased/sold horses

**Learning:** The `recordDailyProgress` function creates a completely new history object each day, populating it only with active player-owned horses. It drops history for deceased horses and horses that were sold. This is an important behavior to test because breaking it could cause silent memory/save bloat.

**Action:** Wrote an isolated test documenting this current behavior (`drops horses that are no longer active player horses`) in `src/tests/core/horse/dailyProgress.test.ts`. Future refactors to `recordDailyProgress` must ensure they don't accidentally start accumulating orphaned snapshot arrays for dead or sold horses.
