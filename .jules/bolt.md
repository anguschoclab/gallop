## 2024-05-18 - [Optimizing O(N) array lookups during renders]

**Learning:** React render loops and component maps can suffer from performance degradation when performing O(N) operations like `.find()` on large global state arrays (like `horses` in `useGame`).
**Action:** Always pre-calculate local hash maps using `useMemo(() => new Map(arr.map(x => [x.id, x])), [arr])` before the loop and use `map.get()` inside the loop for O(1) lookups. This improves rendering performance and avoids UI jank. Do not use global non-persisted store maps (like `horseMap`) directly in UI components if they are excluded from persisted keys and could be undefined.

## 2024-05-17 - O(N\*M) Loop Lookups in React Render

**Learning:** Found multiple instances where `.find()` on an array is used inside a `.map()` loop during React component renders (e.g., `BidHistoryPanel`, `PlayerConsignmentsPanel`). This can cause performance degradation, especially with potentially large datasets like `bidHistory`.
**Action:** Always pre-calculate a hash map (using `Map` and `useMemo`) for O(1) lookups before the mapping phase to change complexity from O(N\*M) to O(N+M). This pattern is particularly useful in this specific project since it utilizes multiple global context arrays (like `stables`, `horses`) that need to be correlated in UI components.
## 2025-02-12 - Optimize O(N^2) render loop in Progeny Table
**Learning:** O(N) global arrays like `horses` evaluated inside `.map()` loops directly in React component rendering trees (e.g., `horses.find(h => h.id === p.foalId)`) can rapidly degrade performance.
**Action:** When rendering elements mapping over arrays that cross-reference global state, pre-calculate a hash map locally using `useMemo` (e.g. `new Map(horses.map(...))`) instead of `.find()` to reduce component rendering complexity from O(N^2) to O(N). Avoid depending on global, non-persisted store maps like `horseMap` if they are susceptible to hydration issues, to guarantee stability.

## 2024-05-19 - O(N) lookup inside progeny list render

**Learning:** Found an O(N) array lookup (`horses.find()`) inside a loop mapping over progeny pregnancies in `src/routes/stable.$horseId.tsx`. While the number of progenies might not be huge, the number of horses can grow large, and performing `.find` on each render loop item degrades performance.
**Action:** Replaced `.find()` with a local `useMemo`-backed hash map lookup (`localHorseMap.get()`) to reduce complexity from O(M*N) to O(M+N).
