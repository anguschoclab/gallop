## 2024-08-24 - Single-pass loops for hot-path AI engine calculations
**Learning:** In the race engine, chained array methods (`.filter`, `.find`) and dynamic allocations (`new Set()`) inside `calculateTacticalAdjustment` caused a significant performance bottleneck due to being called on every tick for every runner.
**Action:** Always use single-pass `for` loops without closures or dynamic allocations in hot simulation loops to minimize CPU overhead and garbage collection.
