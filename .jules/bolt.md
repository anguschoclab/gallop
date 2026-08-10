## 2025-05-18 - Pre-calculate Maps for O(1) Lookups in Renders
**Learning:** In React components that iterate over lists, performing O(N) array `.find()` inside the `.map()` loop causes O(N*M) time complexity during renders, leading to potential UI jank.
**Action:** Always extract O(N) operations out of render loops and pre-calculate O(1) lookup structures like `Map` or `Set` using `useMemo`.
