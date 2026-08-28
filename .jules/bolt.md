## 2024-05-20 - Avoid dynamic Set allocations in hot loops
**Learning:** Dynamic data structures like `new Set()` instantiated inside hot loops (e.g., `calculateTacticalAdjustment` evaluated ~1Hz per horse during a race) create unnecessary GC pressure and CPU overhead, especially when checking small arrays where `.includes()` is extremely fast.
**Action:** Prioritize single-pass checks or standard array methods (`.includes()`, loops) for small, bounded lookups inside simulation step loops instead of allocating object-based sets or maps.
