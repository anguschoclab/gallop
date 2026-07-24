## 2024-07-15 - Extracting Distance Specialist Insights

**Learning:** Historical race entries occasionally lack `distance` or `beyer` data depending on how the legacy race result was formatted, so derivations must explicitly check for the presence of these fields before aggregating. Using `undefined` in numeric aggregations causes `NaN` poisoning.
**Action:** Always filter or defensively access `distance` and `beyer` fields in `raceHistory` when deriving stats.
## 2024-07-17 - Tipster Insight Priority & Test Pollution
**Learning:** Adding new Tipster insights can cause unexpected test pollution if existing test fixtures inadvertently meet the criteria of the newly prioritized insight (e.g. testing surface affinity with monotonically increasing beyers falsely triggers an "Improving Form" insight).
**Action:** When adding insights that examine historical trends, carefully audit existing mock histories to ensure they don't contain spurious trends, or adjust the insight priority order if appropriate.
## 2024-07-24 - Identifying Seconditis and Addressing Test Pollution

**Learning:** Adding early exit insight checks (like "Seconditis" which checks for frequent 2nd place finishes) can intercept and pollute existing tests that carelessly use `position: 2` as generic dummy data for other insights (like Distance or Surface Affinity).
**Action:** When adding new early-triggering insights, always audit existing test dummy data to ensure it doesn't inadvertently trigger the new insight, adjusting dummy data (e.g., using `position: 3` instead of `2`) where necessary.
