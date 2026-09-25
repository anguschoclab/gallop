## 2024-05-18 - Deduplicate ImpactHandlerFunction

**Learning:** `ImpactHandlerFunction` was duplicated across 8 files in `src/core/resolver/handlers/`. However, `HorseHandler.ts` had a slightly different signature taking an additional `horse` argument, meaning it couldn't just be replaced but instead needed to be renamed to prevent confusion.
**Action:** Always verify identical signatures across files before extracting types or interfaces to central locations. Rename outliers rather than forcefully coercing them into shared definitions.
