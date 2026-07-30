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
**Action:** Replaced `.find()` with a local `useMemo`-backed hash map lookup (`localHorseMap.get()`) to reduce complexity from O(M\*N) to O(M+N).

## 2024-05-19 - [Optimizing O(N) Array Lookups in Game Event Loops]

**Learning:** React hooks that process batches of game events (e.g., `useAuctionEventProcessor.ts` processing `result.events` arrays generated from game simulation steps) can suffer from significant performance degradation if they use `.find()` and `.findIndex()` on global arrays (like `stables`) inside the loop, especially as the number of events scales up.
**Action:** In game engine event loops or hooks that process batches of events, pre-calculate local hash maps (`stableMap`, `stableIndexMap`, `lotMap`) using `useMemo()` immediately before the event loop starts. This turns O(N\*M) processing into O(N+M) and prevents the simulation/UI pipeline from stuttering during heavy game logic.

## 2026-06-10 - Pre-calculating maps for cross-referencing multiple conditional matches in arrays

**Learning:** When searching for an item within an array in a render loop with multiple conditions (like `fromStableId === undefined && status === 'pending'`), using `array.find()` inside `.map()` is O(N^2).
**Action:** Instead of just `new Map(arr.map(x => [x.id, x]))`, you can iterate the array once inside `useMemo` and conditionally `map.set()` the matched items by their target key (e.g., `horseId`). This allows O(1) conditional lookup inside the render loop without modifying global state or storing unneeded entries in the map.

## 2025-03-09 - [Optimizing O(N) chained array lookups in report generation]

**Learning:** Found an inefficient nested operation in `jockeyReport.ts` generating `ranksByHorse` that was doing `splits.map(s => s.entries.find(...)).filter(...)`. This meant looping over all splits to map them to an entry, then doing a `.find()` iteration over entries, and then looping over the mapped array to `.filter()` out undefineds. This degraded generation speed via O(3 _ M _ N) traversal.
**Action:** When filtering or mapping data where nested `find` or multiple iterations occur, replace chained functional map/filter/find with a single traditional `for` loop with an early `break` for optimal execution.

## 2024-05-18 - Optimize StaffSupportPanel lookups

**Learning:** When trying to eliminate consecutive `.find()` lookups over filtered arrays using a `Map`, beware of inline array filters (like `.filter() ?? []`) creating unstable references. Using an unstable array as a dependency in `useMemo` invalidates the cache on every render, resulting in worse performance due to object allocation overhead.
**Action:** Compute the filter _and_ the HashMap in a single pass inside a `useMemo` that depends on stable source objects (e.g. `hiredStaff` and `stableId`) to avoid unstable reference invalidation.

## 2026-07-01 - [Optimizing O(N*M) loop lookups with Set in React Renders]

**Learning:** When filtering or mapping arrays (like `races` or `horses`) and checking membership in another array (e.g., `tracks.includes(...)` or `.some(...)`), React renders can suffer from O(N*M) performance bottlenecks if both arrays are large.
**Action:** Replace `.includes()` and `.some()` inside `.filter()` or `.map()` loops with a pre-calculated `Set` using `useMemo` (e.g., `useMemo(() => new Set(arr), [arr])`) to perform O(1) membership checks, reducing overall complexity to O(N+M).

## 2024-05-19 - [O(N) Lookups in NominationsTab]

**Learning:** Found an O(N) array lookup (`horses.find()`) inside a loop mapping over nominations in `src/components/racing/NominationsTab.tsx`. This causes O(M*N) complexity during rendering, degrading performance.
**Action:** Always pre-calculate a local `useMemo`-backed hash map lookup for stable items (e.g. `horseMap = new Map(horses.map(h => [h.id, h]))`) to reduce complexity from O(M*N) to O(M+N). Avoid chaining array methods inline when possible.

## 2024-05-20 - [Optimizing chained array lookups with sets in game event loops]

**Learning:** When attempting to find intersections between two arrays (e.g. checking if a horse ID from the result array exists in an entry array), chaining `.filter()` and `.some()` operations results in O(N*M) complexity, creating significant bottlenecks in hot paths like the NPC logic cycle.
**Action:** When filtering arrays using membership checks against another array, pre-calculate a `Set` and replace the `.some()` loop with a `.has()` check to enable O(1) lookups and change the operation from O(N*M) to O(N).

## 2024-05-21 - [Optimizing O(N*M) loop lookups with Set in React Renders]

**Learning:** When filtering or mapping arrays and checking membership in another array (e.g., `program.enrolledDamIds.includes(h.id)`), React renders can suffer from O(N*M) performance bottlenecks if both arrays are large, such as in `ActiveProgramView.tsx`.
**Action:** Replace `.includes()` and `.some()` inside `.filter()` or `.map()` loops with a pre-calculated `Set` using `useMemo` (e.g., `useMemo(() => new Set(arr), [arr])`) to perform O(1) membership checks, reducing overall complexity to O(N+M).

## 2024-07-06 - O(1) Lookups in Awards Scoring

**Learning:** During the awards phase (`calculateAwardPoints`), checking category eligibility and calculating points iterates over each race in a horse's history, running an O(N) `.find()` on the global `races` array. Across multiple categories, regions, and horses, this results in an O(Regions * Categories * Horses * RacesHistory * TotalRaces) nested bottleneck.
**Action:** Always prefer `Map` lookups (O(1)) over `Array.prototype.find()` inside deeply nested loops. When processing data that requires repeated lookups against a static array, precompute a `Map` structure at the outermost scope and pass it down the pipeline.

## 2024-07-28 - [Optimizing O(N) Lookups in Pipeline Phases]

**Learning:** Functions invoked during pipeline phases over multiple entities, like `computeFounderInfluence`, when iterated over arrays of candidates, can result in serious bottlenecks if they individually recreate temporary maps or rely on nested `.find()` searches against large arrays (like `allHorses`).
**Action:** Lift the initialization of necessary hash maps (like `horseMap` or `parentToChildrenMap`) outside the loop in the calling context (e.g., inside the phase executor) and pass them as optional arguments to the lower-level processing functions to ensure O(1) lookups and single-allocation mapping.

## 2024-05-22 - [Optimizing O(N*M) derived arrays with unstable dependencies]

**Learning:** When trying to memoize an O(N*M) array derivation (like `consignablePairs` using `horses.map(h => find(activeUpcoming))`), using an inline derived array (like `activeUpcoming` initialized via `.filter().sort().slice()`) as a `useMemo` dependency causes the hook to fail its equality check on every render. This turns the optimization into a regression because the application pays the overhead of the `useMemo` hook without reaping its caching benefits.
**Action:** Always verify that all variables in a `useMemo` dependency array are referentially stable. If a dependency is a dynamically derived array, move its derivation inside the `useMemo` block and depend on the stable root source (e.g. `auctions` instead of `activeUpcoming`).

## 2024-05-24 - [Avoid Set allocation inside loop for Map keys check]

**Learning:** When checking if a value exists as a key in a global `Map` (like `GRADED_RACES_BY_TRIPLECROWN_KEY`) from inside a filter loop over a large array, instantiating `new Set(map.keys())` creates an O(N) allocation bottleneck per loop iteration.
**Action:** Always use the `Map.prototype.has()` method directly inside the loop instead of mapping keys to a `Set` to prevent massive memory allocation and performance degradation during rendering or filtering.

## 2025-04-10 - O(N) array lookups in StableRosterView rendering

**Learning:** In React components like `StableRosterView`, using `horses.find()` inside array mapping structures (like `.map(id => horses.find(...))`) both in `useMemo` hooks and JSX render loops results in O(N*M) complexity which degrades performance when rendering UI with potentially large datasets.
**Action:** Always pre-calculate a local hash map using `useMemo(() => new Map(arr.map(x => [x.id, x])), [arr])` before the mapping loops and use `.get()` to achieve O(1) conditional lookup, transforming O(N*M) time into O(N+M).

## 2024-05-25 - [Optimizing O(N^2) loop lookups with Map in Head-to-Head Compare renders]

**Learning:** When generating lightweight odds and monte carlo sim results inside `HeadToHeadSection`, using `.find()` inside a `horses.map()` render loop leads to O(N^2) performance degradation during rendering.
**Action:** Pre-calculate hash maps using `useMemo` (e.g. `new Map(odds.map(o => [o.horseId, o]))`) for O(1) lookups inside the render loop, changing the complexity to O(N).
## 2025-05-18 - Lift invariant calculation out of loop in deriveEligibleRaces
**Learning:** In `deriveEligibleRaces`, `estimateJockeyFee` was called inside the `for (const race of upcoming)` loop. However, the calculation depends only on `horse` and `jockeys`, not on the individual race.
**Action:** Lift invariant calculations out of loops to prevent redundant execution and improve performance when processing large arrays.
