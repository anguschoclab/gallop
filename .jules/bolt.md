## 2024-10-27 - Optimize track section lookups in simulation hot loop
**Learning:** In the race simulation hot loop, `getTrackSection` and `getSectionAndProgress` were both called, meaning the course sections array was iterated over twice per runner per tick.
**Action:** Consolidate to a single `getSectionAndProgress` call early in the loop and pass the resolved section object down to geometry and wind effect calculators.
