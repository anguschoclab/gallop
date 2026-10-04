## 2025-02-28 - Removed 'any' cast from auctions phase horse resolution
**Learning:** In `src/core/time/phases/auctions.ts`, filtering `horse_creation` impacts and mapping them to `{ horse: unknown }` as `never` bypassed type safety and resulted in `any`-like behavior (or worse, `never` which shouldn't have passed strict typing but did). This masked the real structure of `HorseCreationImpact`.
**Action:** Always import the specific impact interface (like `HorseCreationImpact`) and cast to it, ensuring `(i as HorseCreationImpact).horse` is strongly typed and compiler-checked.
