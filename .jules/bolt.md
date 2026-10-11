## 2025-03-08 - Hoisting allocations out of simulation loops
**Learning:** High-frequency game loops like `runRaceToCompletion` suffer greatly when using array spreading (`[...array]`) and recreating object maps per tick due to garbage collection pressure.
**Action:** Always pre-allocate static-sized Arrays and Maps outside of tight ticks and reuse them by copying or clearing, eliminating per-tick allocation overhead.
