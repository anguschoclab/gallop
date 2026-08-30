## 2026-08-30 - [O(N^2) Bottleneck in React Render Loop]
**Learning:** The `Track.tsx` visualizer was calling `buildFieldContext(runners)` inside a `runners.map` loop. Since the visualizer updates at 10Hz and `buildFieldContext` iterates over the runners, this resulted in an O(N^2) calculation on every frame, which degrades performance for large fields.
**Action:** Always compute aggregate data structures once outside of mapping loops, especially in performance-critical hot loops or frame-driven render functions.
