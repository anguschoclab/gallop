
## 2024-05-18 - Optimized high-frequency loop buildFieldContext
**Learning:** Chaining functional array methods (`.filter()`, `.map()`, `.reduce()`) in a high-frequency simulation loop creates excessive temporary arrays and function calls, causing memory allocations and CPU overhead, especially when calculating conditions frame by frame per runner.
**Action:** Replace functional array chaining with a single imperative `for` loop in high-frequency execution paths to reduce overhead and memory pressure, avoiding creating new arrays unnecessarily.
