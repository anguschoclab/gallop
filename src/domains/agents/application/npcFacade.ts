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
export { rankingsComparisonDays } from "@/domains/market/simulation/rankingsComparison";
export { stableRankingsDays } from "@/domains/stable/simulation/stableRankings";
export { rivalRankingsForDay } from "@/domains/market/simulation/rivalRankingsComparison";
export type {
  RankingsBaseline,
  RivalRankingsColumn,
} from "@/domains/market/simulation/rivalRankingsComparison";
export type { NpcCareerStage } from "@/domains/horse/simulation/types";
