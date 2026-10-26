## 2024-05-31 - Strengthen rngRef typing
**Learning:** Found explicit `any` usage for `rngRef` in core racing logic (`useRacePageData` and tests) which weakened type-safety around RNG interactions in simulation.
**Action:** Replaced `useRef<any>` with `useRef<Rng | null>` and propagated type safely to ensure correct usage of random state bounds.
