## 2024-05-18 - Optimized tactical AI hot loops to reduce GC pressure
**Learning:** In performance-critical hot loops in the race engine (like `calculateTacticalAdjustment`), array methods (`.filter()`, `.find()`) and dynamic data structures (`new Set()`) cause significant garbage collection pressure.
**Action:** Always use single-pass `for` loops and leverage sorted arrays (e.g., `runners` sorted by position descending) to `break` early and minimize allocations.
