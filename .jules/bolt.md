## 2025-02-23 - Avoid Chained Array Methods in High-Frequency Contexts
**Learning:** Using chained array methods (like `.filter().map().reduce()`) or spreading arrays (`[...arr]`) inside high-frequency functions (like `buildFieldContext` which is called per frame) leads to numerous intermediate array allocations, resulting in excessive GC pressure and degraded performance.
**Action:** Refactor critical path functions to use single-pass, imperative `for` loops to construct data structures and update aggregates simultaneously, and mutate sorted copies directly instead of spreading arrays.
