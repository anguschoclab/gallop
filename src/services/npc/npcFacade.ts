/**
 * npcFacade.ts — Service-layer re-exports for NPC domain.
 * Routes component imports away from direct @/core/npc access.
 */

export { getDisplayableStats, calculateScoutCost } from "@/core/npc/scouting";
export { summarizeNpcCareer, careerStageLabel } from "@/core/npc/careerTracker";
export type { NpcCareerSummary } from "@/core/npc/careerTracker";
