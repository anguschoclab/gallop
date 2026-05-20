## 2024-05-18 - [O(1) lookups in render loops]
**Learning:** Found a performance bottleneck where `horses.find()` was being used inside a `.map()` loop during component render, leading to O(N * M) time complexity where N is the number of rendered items and M is the total horses array.
**Action:** Always retrieve `horseMap` from Zustand using `useGameWithShallow((s) => s.horseMap)` and use `horseMap.get(id)` for O(1) lookups inside list mapping, resulting in O(N) complexity overall.

## 2024-05-17 - O(N) lookups inside requestAnimationFrame
**Learning:** Found a performance anti-pattern where O(N) array lookups (`.find()`) were being executed inside a 60fps `requestAnimationFrame` loop (`RaceVisualizer.tsx`). This causes O(N^2) complexity on every single frame, significantly reducing the frame budget and causing potential jank during animations.
**Action:** Always compute local `useMemo` lookup maps for O(1) access before the `requestAnimationFrame` loop, and use `.get()` inside the rendering function to maintain smooth 60fps performance.

## 2024-05-18 - O(N²) bottleneck in snapshot interpolation
**Learning:** The `interpolateSnapshots` function in `racePlaybackService.ts` had a nested O(N) operation (`.find()` inside `.map()`) creating O(N²) complexity. Called 60 times per second during race replay animation, this was the dominant performance bottleneck preventing true O(N) rendering.
**Action:** Pre-compute a lookup Map for the `next` snapshot before the interpolation loop, reducing the complexity from O(N²) to O(N). For typical race sizes (12-20 horses), this provides 12-20x performance improvement per frame.

## 2024-05-20 - Global State vs. Local Maps during Hydration
**Learning:** `Map` objects are not naturally serializable and are excluded from Zustand's `PERSISTED_KEYS`. When trying to optimize an `O(N)` loop by pulling a `horseMap` from the global state, it might be undefined during initial hydration since it has to be manually rebuilt (e.g. `onRehydrateStorage`). Falling back to `new Map()` inside the selector leads to returning a completely empty map and thus failing all lookups.
**Action:** When optimizing lookups in UI components that map over state arrays, pre-compute the lookup map *locally* within the component using `useMemo` on the state array (e.g., `const lookup = useMemo(() => new Map(items.map(i => [i.id, i])), [items])`), rather than relying on a potentially uninitialized global map.
