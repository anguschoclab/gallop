## 2025-03-05 - Type-safe Array Iteration
**Learning:** Array iteration methods like `.find()` or `.map()` often have explicit `any` typings on their callback arguments that obscure the underlying elements, bypassing the array's defined generic type.
**Action:** Enforce strict typing on these callbacks by importing and applying the correct element type from `@/game/types`.
