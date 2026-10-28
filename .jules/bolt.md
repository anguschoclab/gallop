## 2024-10-28 - Optimize hot loop velocity update
**Learning:** The race simulation engine evaluates the velocity update in `stepRunner` per runner per tick, making it a hot loop. Using standard Math methods like `Math.sign` and `Math.min(Math.abs())` adds measurable overhead compared to simple inline ternary conditionals.
**Action:** Substitute standard Math methods (`Math.min`, `Math.max`, `Math.abs`) with manual inline conditionals in simulation hot loops to avoid function call overhead.
