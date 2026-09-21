## 2025-02-23 - Prevent O(N^2) complexity in high-frequency runner mappings
**Learning:** To prevent O(N^2) complexity in high-frequency presentation or simulation loops (e.g., `deriveRunnerConditions`), avoid using `Array.prototype.findIndex()` inside the O(N) runner mapping loop.
**Action:** Pre-compute index maps (e.g., `liveRank`) in the single-pass outer context (`FieldContext`) to enable O(1) lookups for properties that depend on relative positioning.
