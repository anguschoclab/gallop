## 2024-05-20 - Testing insightMetrics
**Learning:** `insightMetrics` acts as a crucial data flatten tool to translate raw domain shapes (`Horse`) into UI-ready chart shapes (`InsightRow`). By lacking tests, any refactoring of its metrics calculations (e.g. `winRate` which has an edge case of divide-by-zero) or missing fields in `Horse` could silently break the scouting scatter plots.
**Action:** When translating domain entities to view models, add isolated tests that verify edge cases (like zero states) and ensure the mapping logic itself is stable and correctly defaults nullish values.
