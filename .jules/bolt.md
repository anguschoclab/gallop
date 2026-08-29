## 2025-03-01 - Avoid Object Allocation in Hot Loops
**Learning:** The race engine simulation hot loops (like `calculateTacticalAdjustment`, which runs ~10 times per second for every runner) can suffer from significant garbage collection pressure and CPU overhead when allocating objects dynamically (like `new Set(rivalHorseIds)`).
**Action:** For small data sizes, such as rival arrays, prefer zero-allocation checks like `Array.prototype.includes` instead of constructing a temporary Set on every simulation tick.
