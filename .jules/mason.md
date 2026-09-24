## 2024-03-22 - Centralized ImpactHandlerFunction
**Learning:** Found multiple identical declarations of `type ImpactHandlerFunction` duplicated across parallel files in `src/core/resolver/handlers/`. Some instances slightly deviated (e.g., `HorseHandler` added a `horse` argument), which could create confusion when refactoring global handler types.
**Action:** Centralized the common signature into `src/core/resolver/handlers/types.ts` and renamed outliers (`HorseHandler`) to explicitly reflect their unique signature (e.g., `HorseImpactHandlerFunction`), deduplicating parallel logic.
