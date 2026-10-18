/**
 * npcFacade.ts — Service-layer re-exports for NPC domain.
 * Routes component imports away from direct @/domains/agents/simulation/npc access.
 */

export { getDisplayableStats, calculateScoutCost } from "@/domains/agents/simulation/npc/scouting";
export {
  buildNpcCareerTimeline,
  summarizeNpcCareer,
  careerStageLabel,
} from "@/domains/agents/simulation/npc/careerTracker";
export { careerStage } from "@/domains/agents/simulation/npc/careerTracker";
export type { NpcCareerTimelineEvent } from "@/domains/agents/simulation/npc/careerTracker";
export {
  buildRivalCareerProfile,
  buildRivalCareerProfiles,
} from "@/domains/agents/simulation/npc/rivalCareerCompare";
export type {
  RivalCareerProfile,
  RivalMilestoneRecord,
} from "@/domains/agents/simulation/npc/rivalCareerCompare";
export { isNotableRival } from "@/domains/agents/simulation/npc/careerMilestones";
export { rankingsComparisonDays } from "@/core/market/rankingsComparison";
export { stableRankingsDays } from "@/core/stable/stableRankings";
export { rivalRankingsForDay } from "@/core/market/rivalRankingsComparison";
export type { RankingsBaseline, RivalRankingsColumn } from "@/core/market/rivalRankingsComparison";
export type { NpcCareerStage } from "@/core/horse/types";
