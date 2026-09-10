## 2024-05-18 - Hoist Array Allocations in Render Loops
**Learning:** Arrays created inline inside `map` loops within high-frequency React components like `LiveSplitsTable` trigger excessive allocations and garbage collection per frame.
**Action:** Always extract static array literals and object definitions to module-level constants or use `useMemo` outside of mapping loops.
