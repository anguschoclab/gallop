## 2024-05-24 - Pre-compute lookups in high-frequency loops
**Learning:** In high-frequency simulation or presentation loops (like `deriveRunnerConditions` called every frame per runner), avoiding `Array.prototype.findIndex()` inside the O(N) mapping loop prevents O(N²) complexity.
**Action:** Pre-compute index maps (like `liveRank`) in the single-pass outer context (`FieldContext`) to enable O(1) lookups for properties that depend on relative positioning, especially when the field size can be large.
