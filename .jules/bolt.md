## 2024-05-18 - [O(1) lookups in render loops]
**Learning:** Found a performance bottleneck where `horses.find()` was being used inside a `.map()` loop during component render, leading to O(N * M) time complexity where N is the number of rendered items and M is the total horses array.
**Action:** Always retrieve `horseMap` from Zustand using `useGameWithShallow((s) => s.horseMap)` and use `horseMap.get(id)` for O(1) lookups inside list mapping, resulting in O(N) complexity overall.
