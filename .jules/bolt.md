## 2024-05-18 - Avoid chaining array methods in high-frequency game engine frames
**Learning:** In high-frequency loops (e.g. `buildFieldContext` called per frame in the race simulation), chaining array methods like `.filter()`, `.map()`, or `.reduce()` causes excessive intermediate memory allocations and subsequent garbage collection pauses.
**Action:** Iterate over raw arrays directly with standard imperative `for` loops to compute derived aggregations and eliminate unnecessary intermediate array allocations and GC overhead.
