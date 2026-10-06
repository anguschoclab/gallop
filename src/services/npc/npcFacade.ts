/**
 * npcFacade.ts — Service-layer re-exports for NPC domain.
 * Routes component imports away from direct @/core/npc access.
 */

export { getDisplayableStats, calculateScoutCost } from "@/core/npc/scouting";
export {
  buildNpcCareerTimeline,
  summarizeNpcCareer,
  careerStageLabel,
} from "@/core/npc/careerTracker";
export type { NpcCareerTimelineEvent } from "@/core/npc/careerTracker";
export { buildRivalCareerProfile, buildRivalCareerProfiles } from "@/core/npc/rivalCareerCompare";
export type { RivalCareerProfile, RivalMilestoneRecord } from "@/core/npc/rivalCareerCompare";
export { isNotableRival } from "@/core/npc/careerMilestones";
