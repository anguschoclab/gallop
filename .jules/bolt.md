## 2024-08-16 - Memoization in render loops
**Learning:** React components that render large lists (like `HorsePickerPanel` when dealing with many horses) can suffer from performance issues if they perform expensive operations (like sorting or filtering with nested function calls, e.g. `calculateOverallRating`) during every render.
**Action:** Always wrap heavy list manipulations (`filter` and `sort`) in `useMemo` when they are inside a component, especially if they are re-executed often or part of a frequently-updated UI (like a picker panel).
