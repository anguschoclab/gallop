## 2024-05-24 - Array findIndex in Hot Paths
**Learning:** O(N) array lookups like `findIndex` inside tight O(N) mapping loops (e.g. runner condition evaluation per frame) silently degrade performance by causing O(N^2) execution time.
**Action:** When working with sorted or structured arrays accessed repeatedly across elements in hot paths, proactively build an O(1) lookup Map during the single-pass context generation phase to avoid quadratic scaling.
