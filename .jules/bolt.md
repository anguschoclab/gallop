## 2024-05-03 - [Optimize RaceBrowser Filtering and Options List Rendering]

**Learning:** In `src/routes/race-browser.tsx`, generating filter dropdown options (like tracking unique countries and tracks) derived from large static lists (`GRADED_RACES`) directly in the component body caused unnecessary map/Set creation and sorting on every render.
**Action:** Moving derived static options out of the component body prevents them from being recalculated. Wrapping heavy lists based on dynamic filter state in `useMemo` avoids redundant iteration logic over the 1050+ items.

## 2024-05-03 - [Replace O(n²) nested loop with O(n) hash map lookup in stable rivals]

**Learning:** When generating a list component (like rival stables in `src/routes/stable.tsx`) that maps over one array (e.g., `npcStables`) and requires counts or related data from a second global array (e.g., `allHorses`), running `.filter()` on the global array inside the map results in an O(n^2) operation that recalculates on every render. This creates a noticeable performance bottleneck as the data grows.
**Action:** Use a `useMemo` block to pre-calculate the required metrics (e.g., counting items with a Map) in a single pass (O(n)) before the render method. Then, inside the `.map()` loop, simply do an O(1) `.get()` lookup from the memoized Map.
