## 2024-05-18 - [Optimizing O(N) array lookups during renders]

**Learning:** React render loops and component maps can suffer from performance degradation when performing O(N) operations like `.find()` on large global state arrays (like `horses` in `useGame`).
**Action:** Always pre-calculate local hash maps using `useMemo(() => new Map(arr.map(x => [x.id, x])), [arr])` before the loop and use `map.get()` inside the loop for O(1) lookups. This improves rendering performance and avoids UI jank. Do not use global non-persisted store maps (like `horseMap`) directly in UI components if they are excluded from persisted keys and could be undefined.

## 2024-05-17 - O(N\*M) Loop Lookups in React Render

**Learning:** Found multiple instances where `.find()` on an array is used inside a `.map()` loop during React component renders (e.g., `BidHistoryPanel`, `PlayerConsignmentsPanel`). This can cause performance degradation, especially with potentially large datasets like `bidHistory`.
**Action:** Always pre-calculate a hash map (using `Map` and `useMemo`) for O(1) lookups before the mapping phase to change complexity from O(N\*M) to O(N+M). This pattern is particularly useful in this specific project since it utilizes multiple global context arrays (like `stables`, `horses`) that need to be correlated in UI components.
