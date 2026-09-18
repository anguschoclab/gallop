## 2024-10-18 - Optimized array lookups in runner condition derivation

**Learning:** When calculating race conditions (`deriveRunnerConditions`) in the presentation loop, computing properties that require knowing a runner's index relative to others (like `nearestRival` or `isBlocked`) can inadvertently cause O(N^2) complexity if using `Array.prototype.findIndex()` inside the O(N) mapping loop over runners.

**Action:** Add pre-computed map indexes (e.g., `liveRank`) to the outer context (`FieldContext`) generated once per frame to turn these O(N) internal lookups into O(1) map lookups, effectively transforming the overall frame computation from O(N^2) to O(N).
