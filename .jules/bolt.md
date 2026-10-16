## 2024-03-24 - Object Spread in Hot Loops
**Learning:** Using object spread (`...base`) inside high-frequency simulation loops like `stepRunner` (called per-tick per-runner) causes significant GC pressure and performance degradation.
**Action:** Always use direct property assignments instead of object spread when constructing objects in the inner loop of the physics simulation.
