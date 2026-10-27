## 2025-10-26 - Big Field Specialist Insight
**Learning:** Evaluated how to analyze track affinity, but `raceHistory` doesn't explicitly store `trackId` in an easily accessible way across all race types. Instead, `fieldSize` is consistently present in `raceHistory` and offers an interesting insight about traffic and large fields.
**Action:** Created `detectBigFieldSpecialist` to surface horses that run significantly better in large fields vs small fields, using `fieldSize` and `beyer` data.
