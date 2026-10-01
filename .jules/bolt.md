## 2024-03-20 - Avoid Array Methods in High-Frequency Loops
**Learning:** Chaining array methods like `filter`, `reduce`, and `map` in high-frequency functions (like `buildFieldContext` which is called per frame) causes excessive intermediate memory allocations.
**Action:** Iterate over raw arrays directly with standard imperative `for` loops to eliminate garbage collection overhead.
