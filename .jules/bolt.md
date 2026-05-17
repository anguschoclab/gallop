
## $(date +%Y-%m-%d) - Component State Map Assumptions vs. Zustand Store
**Learning:** Zustand stores often use plain JavaScript objects (e.g. arrays or records) for serialization compatibility. Attempting to directly destructure non-serializable objects (like `Map`) from the store in a UI component, or assuming they will consistently be populated upon hydration, can lead to undefined properties or unexpected `TypeError`s at runtime (e.g. `TypeError: s.horseMap is undefined` or `s.horseMap.get is not a function`).
**Action:** When implementing O(1) optimizations in React components that iterate over global arrays, ALWAYS construct the `Map` locally using `useMemo` (e.g., `useMemo(() => new Map(horses.map(h => [h.id, h])), [horses])`) instead of relying on non-persisted mapping properties from the Zustand store. This guarantees type safety, avoids crashes if the store's hydration is incomplete, and keeps components modular and safe.

## 2024-05-17 - O(N) lookups inside requestAnimationFrame
**Learning:** Found a performance anti-pattern where O(N) array lookups (`.find()`) were being executed inside a 60fps `requestAnimationFrame` loop (`RaceVisualizer.tsx`). This causes O(N^2) complexity on every single frame, significantly reducing the frame budget and causing potential jank during animations.
**Action:** Always compute local `useMemo` lookup maps for O(1) access before the `requestAnimationFrame` loop, and use `.get()` inside the rendering function to maintain smooth 60fps performance.
