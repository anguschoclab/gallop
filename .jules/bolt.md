## 2024-05-24 - Hoist derived state out of render loops
**Learning:** In high-frequency components like the ~10Hz Track visualizer, mapping over arrays and calling O(N) derived state functions (like buildFieldContext) inside the loop causes O(N^2) complexity and severe performance degradation due to unnecessary re-computations and garbage collection on every frame.
**Action:** Always hoist expensive derived state calculations outside the internal mapping loop when rendering arrays in performance-critical components.
