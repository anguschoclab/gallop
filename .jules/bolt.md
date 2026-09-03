## 2025-02-12 - Hoisting Expensive Field Calculations in Render Loops
**Learning:** In high-frequency components like `Track.tsx`, putting expensive derived state calculations (like `buildFieldContext` which involves array sorting) inside `.map()` loops for rendering creates O(N^2) performance degradation on every frame.
**Action:** Always hoist expensive array or field derivations outside of rendering loops, especially when the derived value represents the entire collection state.
