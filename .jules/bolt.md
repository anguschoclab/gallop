## 2024-09-24 - Optimizing High-Frequency Loops
**Learning:** Chaining array methods like `.filter` and `.reduce` in high-frequency functions (like `buildFieldContext` called every frame) causes excessive intermediate allocations and iteration overhead.
**Action:** Replace chained array methods with a single imperative loop to eliminate multiple O(N) passes and intermediate memory allocation, significantly speeding up execution.
