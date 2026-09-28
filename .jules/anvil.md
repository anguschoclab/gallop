## 2024-05-24 - Fixed missing JSDoc and layering violations
**Learning:** Components should not import directly from `@/core` to respect architectural boundaries. Service facades (like `npcFacade`, `horseFacade`, `calendarFacade`) should be used instead. Missing JSDocs on exported functions fail strict linting rules.
**Action:** Replaced direct `@/core` imports with facade imports in components, and added missing JSDoc comments with `@returns` tags to functions in `importedRealWorld.ts` and `auctionHouseService.ts`.
## 2024-05-24 - Preserved data directory immutability invariant
**Learning:** Files in `@/data` must be completely free of mutable state (`let`, `var`, `localStorage`, etc) because they are designed to be purely imported by the core game logic. Adding state or side-effects breaks the architectural invariants.
**Action:** Relocated `importedRealWorld.ts` which has local storage sync side-effects into `src/services/data/`, updated its consumers, and regenerated the naming convention test baseline.
