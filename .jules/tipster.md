## 2024-10-30 - Surfaced "Boom or Bust" Insight
**Learning:** Players often track horse consistency, but the inverse is just as useful. A horse that either wins or completely misses the board ("Boom or Bust") requires different race placement strategy than a consistent grinder.
**Action:** Implemented the `detectBoomOrBust` insight to flag horses with >= 6 starts where >= 80% of their starts are either wins or >3rd place finishes. It elegantly fills a gap in the behavioral analysis of the raceHistory without tracking new data.
