## 2025-01-20 - Surfaced Field Size Affinity insight
**Learning:** Added a new detector `detectFieldSizeAffinity` to identify horses that prefer large fields ("Traffic Weaver") vs small fields ("Needs Room") based on Beyer differences. The field size data is accurately stored in `raceHistory`.
**Action:** Added to `INSIGHT_DETECTORS` registry and ensured test safety. Did not touch core loop.
