## 2024-03-24 - Test coverage for careerTracker.ts
**Learning:** `src/core/npc/careerTracker.ts` handles crucial simulation logic (advancing off-screen NPCS through their careers, generating races, fame, and earnings) but lacks dedicated testing. Testing this ensures the underlying game economy and NPC progression remain stable and deterministic.
**Action:** Created `src/tests/core/npc/careerTracker.test.ts` to cover `careerStage`, `isDueForOffscreenStart`, and `simulateOffscreenStart`.
