## 2025-05-18 - Remove unsafe any casts in insurance intents
**Learning:** Found an `any` cast used to access `currentGrade` and `racing.speed` on the `Horse` object which masks bugs since `Horse` uses `raceHistory` to track grades and `stats.speed` for ratings.
**Action:** Use `getCareerStats(horse)` to safely compute grades from `raceHistory`, and safely access `horse.stats?.speed` directly, removing the need for `any` assertions entirely.
