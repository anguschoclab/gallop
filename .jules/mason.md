## 2024-02-27 - Deduplicating ImpactHandlerFunction

**Learning:** Duplicate local type aliases with the same name across parallel files (`type ImpactHandlerFunction = ...`) can hide slight signature variations. Most `*Handler.ts` files shared identical `ImpactHandlerFunction` definitions, but `HorseHandler.ts` silently had a different signature (it took an extra `horse` param).

**Action:** Before extracting a duplicated local type to a shared definitions file, use tools like `grep` to quickly audit all implementations to ensure their signatures are truly identical. If an outlier exists, rename it locally (e.g. `HorseImpactHandlerFunction`) rather than trying to force it into the centralized type.
