## 2026-09-26 - Centralize ImpactHandlerFunction Signature

**Learning:** Duplicate type definitions `ImpactHandlerFunction` existed across seven different files in `src/core/resolver/handlers/` (BreedingHandler, FinanceHandler, InfrastructureHandler, MarketHandler, RacingHandler, SyndicationHandler, SystemHandler). A slightly different signature (`HorseImpactHandlerFunction`) was used in `HorseHandler`. I successfully centralized the shared `ImpactHandlerFunction` type into `src/core/resolver/handlers/types.ts` and updated the importing files.

**Action:** Before deduplicating shared types across parallel handler modules, always check for signature variations. Outliers like `HorseHandler` may use identical local type names for different signatures, requiring local renaming (e.g., `HorseImpactHandlerFunction`) instead of centralization to avoid breaking changes.
