## 2024-05-03 - [Optimize RaceBrowser Filtering and Options List Rendering]

**Learning:** In `src/routes/race-browser.tsx`, generating filter dropdown options (like tracking unique countries and tracks) derived from large static lists (`GRADED_RACES`) directly in the component body caused unnecessary map/Set creation and sorting on every render.
**Action:** Moving derived static options out of the component body prevents them from being recalculated. Wrapping heavy lists based on dynamic filter state in `useMemo` avoids redundant iteration logic over the 1050+ items.

## 2024-05-03 - [Replace O(n²) nested loop with O(n) hash map lookup in stable rivals]

**Learning:** When generating a list component (like rival stables in `src/routes/stable.tsx`) that maps over one array (e.g., `npcStables`) and requires counts or related data from a second global array (e.g., `allHorses`), running `.filter()` on the global array inside the map results in an O(n^2) operation that recalculates on every render. This creates a noticeable performance bottleneck as the data grows.
**Action:** Use a `useMemo` block to pre-calculate the required metrics (e.g., counting items with a Map) in a single pass (O(n)) before the render method. Then, inside the `.map()` loop, simply do an O(1) `.get()` lookup from the memoized Map.

## 2024-05-09 - [Avoid O(n²) array lookups during loop iterations in components]
**Learning:** When rendering complex UI lists across categories (e.g. grading categories mapping over upcoming races, and looking up entries in a global `horses` array using `.find()`), doing an inner array `.find()` results in a hidden O(n²) operation per frame/render if left unmemoized. This does not scale well with a growing list of entities like horses.
**Action:** Lift array-to-Map transformations (`new Map(horses.map(h => [h.id, h]))`) to the top of components and cache them with `useMemo` alongside the data loop. Replace the `.find()` usage inside inner loops with an efficient `map.get()` lookup.
## 2026-05-09 - [Avoid O(n²) array lookups during loop iterations in components]
**Learning:** When rendering UI lists that map over global state (like the `HallOfFame` mapping over global `horses`), an inner `.find()` on an array is an O(n²) operation per render that creates scaling bottlenecks.
**Action:** Always extract the array into a Map indexed by ID via `useMemo` and perform an O(1) `.get()` lookup instead. Document expected impact metrics in code comments explicitly.
