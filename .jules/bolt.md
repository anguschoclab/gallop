## 2023-10-27 - Removing Set allocation from hot loops
**Learning:** `calculateTacticalAdjustment` is executed thousands of times per race simulation. Allocating a `new Set` on every call for extremely small arrays (like 1-3 rival IDs) causes significant GC pressure and CPU overhead.
**Action:** Always prefer `.includes()` over `Set` instantiation for tiny arrays evaluated inside tight performance-critical hot loops.
