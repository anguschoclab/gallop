## 2024-05-18 - Avoid chained array methods in high-frequency simulation loops
**Learning:** Chaining `.filter().map().reduce()` creates intermediate arrays and increases garbage collection overhead. This is especially problematic in high-frequency loops like race simulations.
**Action:** Replace chained array methods with single imperative `for` loops to minimize memory allocations and improve CPU efficiency in hot paths.
