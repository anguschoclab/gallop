## YYYY-MM-DD - Removing duplicate generateFanCountImpact
**Learning:** Found unused `generateFanCountImpact` in `src/core/race/impacts/energyFormFame.ts`
**Action:** Delete it, since fan count gains are processed elsewhere (`calculateFanGainsForRaces` in `src/core/horse/fans.ts` called from `npcCycle.ts` and `awards.ts` creates its own impacts directly).
