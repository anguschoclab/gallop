## 2025-02-28 - Optimize buildFieldContext by eliminating Array Method Chaining
**Learning:** Found a major performance bottleneck where `buildFieldContext` was causing O(N) array intermediate allocations via `.filter()`, `.reduce()`, and spread operators. In high-frequency rendering contexts, this rapidly overwhelms the GC.
**Action:** Replace functional chaining loops with a single imperative `.push()` loop when constructing contextual fields like live runners and moving counts.
