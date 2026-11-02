## 2024-11-02 - Manual inline conditionals for hot loop Math methods
**Learning:** In the race simulation engine's tight per-tick loop, standard `Math` methods like `Math.min`, `Math.max`, and `Math.abs` introduce measurable overhead.
**Action:** Substitute standard Math methods with manual inline conditionals in highly executed hot paths (like velocity and lateral movement updates) to minimize overhead.
