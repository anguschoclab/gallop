## 2024-07-15 - Extracting Distance Specialist Insights

**Learning:** Historical race entries occasionally lack `distance` or `beyer` data depending on how the legacy race result was formatted, so derivations must explicitly check for the presence of these fields before aggregating. Using `undefined` in numeric aggregations causes `NaN` poisoning.
**Action:** Always filter or defensively access `distance` and `beyer` fields in `raceHistory` when deriving stats.

## 2024-07-17 - Tipster Insight Priority & Test Pollution

**Learning:** Adding new Tipster insights can cause unexpected test pollution if existing test fixtures inadvertently meet the criteria of the newly prioritized insight (e.g. testing surface affinity with monotonically increasing beyers falsely triggers an "Improving Form" insight).
**Action:** When adding insights that examine historical trends, carefully audit existing mock histories to ensure they don't contain spurious trends, or adjust the insight priority order if appropriate.

## 2024-07-26 - Test Pollution from Generic Attributes
**Learning:** Adding new Tipster insights that evaluate generic attributes (like race `position` across all entries) can easily conflict with existing mock histories. Earlier mocks used `position: 2` universally for distance specialist tests, which falsely triggered the new `>80% top 3` Consistency insight.
**Action:** When adding insights based on common race statistics, audit all existing mock objects in tests and adjust them to use neutral dummy data (e.g., `position: 4`) to prevent false positives and test pollution.

## 2025-02-12 - Tipster Insight: Model of Consistency
**Learning:** Adding aggregate historical insights requires careful precedence ordering relative to "hot streaks", and ensuring the sample size (min 5 starts) is sufficient before presenting percentage-based metrics.
**Action:** Prioritize active streaks (like win streaks) over long-term consistency metrics by placing their evaluation earlier in the `getHorseInsight` pipeline.

## 2024-07-26 - Gap Analysis requires Chronological sorting
**Learning:** Checking for layoff trends requires knowing the gap in days between consecutive races. Relying on the default array order can lead to bugs if history arrays are prepended vs appended in different contexts.
**Action:** Always create a shallow copy and explicitly sort chronological historical data (`[...history].sort((a,b) => a.day - b.day)`) before computing interval-based insights.

## 2024-10-15 - Exploring Neutral Streaks
**Learning:** Insight logic isn't limited to just positive accolades; adding neutral analysis like a "Bridesmaid" (consistent 2nd place) streak adds flavorful texture to the data and points out interesting statistical quirks.
**Action:** Look for other consistent failure-to-win patterns or "almost-there" streaks in the data as potential insights that tell a story about the horse's luck or limitations.
