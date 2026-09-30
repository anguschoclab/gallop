## 2024-09-30 - Optimize high-frequency per-frame loop memory allocations
**Learning:** Chaining array methods (`.filter()`, `.map()`, `.reduce()`) inside high-frequency loops (like `buildFieldContext` which is called per frame) causes excessive intermediate array allocations. This leads to high garbage collection (GC) overhead which slows down the game loop.
**Action:** Replace array method chains with single-pass imperative `for` loops in hot paths to eliminate temporary array creation and reduce execution time.
