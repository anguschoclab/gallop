## 2025-03-09 - Extracted race entry bump resolution logic
**Learning:** The logic to find the weakest NPC entry that can be bumped by a challenger when a race is full was duplicated exactly across three different files (`src/core/npc/raceEntry.ts`, `src/core/time/phases/raceEntryResolution.ts`, and `src/game/store/slices/coreSlice.ts`).
**Action:** Created `src/core/race/entry/bumpResolver.ts` to centralize this logic into a single `findBumpableEntryIndex` function, reducing duplication and ensuring consistent behavior for both player and NPC entry bumping across the codebase.
