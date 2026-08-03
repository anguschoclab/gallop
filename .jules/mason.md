## 2025-07-05 - Duplicate unused files removed

**Learning:** Found an editor-created duplicate `src/core/race/impacts/index 2.ts` and `src/tests/core/uuid/uuidRegistry.test 2.ts` which are structurally identical to the original ones. These files do not belong to the codebase and shouldn't be included in git version control.
**Action:** Remove editor-created duplicate files.

## 2026-07-17 - Deduplicated RaceResult and RaceEntry interfaces in impact generators

**Learning:** Found multiple duplicate local definitions of `RaceResultEntry` and `RaceEntry` across different race impact generators (`jockeyStatsTracking.ts`, `financialBreeding.ts`, `performanceCareer.ts`). These should use the shared `RaceResult` and `RaceEntry` types already defined and exported from `@/game/types`.
**Action:** Remove local type definitions and replace them with imports from the shared types file to maintain a single source of truth.
## 2024-08-03 - Deduplicate Breeding Impacts Module
**Learning:** Found that `breedingImpacts.ts` was merely a passthrough to `financialBreeding.ts` inside a loop, causing unnecessary array allocation and file overhead for a single isolated function.
**Action:** Inlined the logic directly into `financialBreeding.ts` (as the filename implies it should contain both) to reduce module count and eliminate O(N) array allocation. Kept `index.ts` clean by removing the dead export.
