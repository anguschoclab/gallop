## 2025-02-13 - O(N) Loop Collapse in Sectional Splits
**Learning:** Hot loops inside simulation over-allocate by mapping arrays, creating Maps per snapshot, and accumulating objects per horse.
**Action:** Combine passes over the snapshot stream into a single linear pass that calculates split markers, handles accumulations, and tracks times in pre-allocated Float64Array primitives to avoid map lookup and garbage collection overhead.
