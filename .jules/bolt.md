## 2024-05-03 - [Optimize RaceBrowser Filtering and Options List Rendering]
**Learning:** In `src/routes/race-browser.tsx`, generating filter dropdown options (like tracking unique countries and tracks) derived from large static lists (`GRADED_RACES`) directly in the component body caused unnecessary map/Set creation and sorting on every render.
**Action:** Moving derived static options out of the component body prevents them from being recalculated. Wrapping heavy lists based on dynamic filter state in `useMemo` avoids redundant iteration logic over the 1050+ items.
Logging learning...
In src/game/auction.ts: Optimized resolveAuctionSale to use O(1) map lookups instead of O(N) Array.find to avoid quadratic time complexity, leading to ~30x speedup.
