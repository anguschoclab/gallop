## 2024-05-18 - Optimized Nearest Rival Search in Condition Derivation
**Learning:** O(N^2) loops inside `nearestRival` and `isBlocked` (called continuously for every runner during the race visualizer) were checking the entire `sortedLive` array. Because `sortedLive` is already sorted by position, searching for the "nearest" rival or a horse "ahead" can use early returns based on distance, preventing full array iterations.
**Action:** Use early breaks in sorted array iterations.
