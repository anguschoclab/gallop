## 2024-07-15 - Extracting Distance Specialist Insights
**Learning:** Historical race entries occasionally lack `distance` or `beyer` data depending on how the legacy race result was formatted, so derivations must explicitly check for the presence of these fields before aggregating. Using `undefined` in numeric aggregations causes `NaN` poisoning.
**Action:** Always filter or defensively access `distance` and `beyer` fields in `raceHistory` when deriving stats.
