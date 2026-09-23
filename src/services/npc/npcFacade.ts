/**
 * npcFacade.ts — Service-layer re-exports for NPC domain.
 * Routes component imports away from direct @/core/npc access.
 */

export { getDisplayableStats, calculateScoutCost } from "@/core/npc/scouting";
export { summarizeNpcCareer, careerStageLabel } from "@/core/npc/careerTracker";
export { buildRivalCareerProfile, buildRivalCareerProfiles } from "@/core/npc/rivalCareerCompare";
export type { RivalCareerProfile, RivalMilestoneRecord } from "@/core/npc/rivalCareerCompare";
