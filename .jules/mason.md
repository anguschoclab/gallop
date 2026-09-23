## 2025-02-20 - Deduplicate identical type definitions across parallel classes

**Learning:** When cleaning up repetitive local type definitions across a directory of parallel modules (like handlers), be careful to verify the signatures are *actually* identical. In `src/core/resolver/handlers`, 7 modules used the exact same `ImpactHandlerFunction` signature, while `HorseHandler.ts` used the *same name* but a *different signature*.
**Action:** Instead of blindly replacing all instances of a locally-named type, first use `grep` with context (`-A 5 -B 5`) to inspect all definitions of the type. For outliers, rename them locally (e.g., `HorseImpactHandlerFunction`) to improve readability and prevent them from being accidentally collapsed into the shared generic type later.
