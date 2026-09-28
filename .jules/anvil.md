## 2024-05-24 - Fixed missing JSDoc and layering violations
**Learning:** Components should not import directly from `@/core` to respect architectural boundaries. Service facades (like `npcFacade`, `horseFacade`, `calendarFacade`) should be used instead. Missing JSDocs on exported functions fail strict linting rules.
**Action:** Replaced direct `@/core` imports with facade imports in components, and added missing JSDoc comments with `@returns` tags to functions in `importedRealWorld.ts` and `auctionHouseService.ts`.
