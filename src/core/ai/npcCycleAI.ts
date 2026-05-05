/**
 * NPC Cycle AI Orchestration
 * Manages AI state persistence and strategic coordination across all NPC subsystems
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState } from "./learningModule";
import type { CampaignAIState } from "./campaignAI";
import type { TrainingAIState } from "./trainingAI";
import type { ClaimingAIState } from "./claimingAI";
import type { AuctionAIState } from "./auctionAI";
import type { JockeyAIState } from "./jockeyAI";
import type { JockeyStrategyAIState } from "./jockeyStrategyAI";
import type { FacilityAIState } from "./facilityAI";
import type { MarketAIState } from "./marketAI";
import type { UpkeepAIState } from "./upkeepAI";
import type { WithdrawalAIState } from "./withdrawalAI";
import type { HorseGenAIState } from "./horseGenAI";

/**
 * Per-stable AI state that persists across all NPC decision-making
 */
export interface StableAIState {
  stableId: string;
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: ReturnType<typeof createLearningState>;
  lastUpdateDay: number;
  // Subsystem-specific AI states (will be populated by respective AI modules)
  trainingAI?: TrainingAIState;
  claimingAI?: ClaimingAIState;
  auctionAI?: AuctionAIState;
  jockeyAI?: JockeyAIState;
  jockeyStrategyAI?: JockeyStrategyAIState;
  campaignAI?: CampaignAIState;
  facilityAI?: FacilityAIState;
  marketAI?: MarketAIState;
  upkeepAI?: UpkeepAIState;
  withdrawalAI?: WithdrawalAIState;
  horseGenAI?: HorseGenAIState;
}

/**
 * Global NPC AI state manager
 */
export interface NpcAIManager {
  stableStates: Map<string, StableAIState>;
  globalDay: number;
}

/**
 * Create initial AI state for a stable
 */
export function createStableAIState(stable: Stable, currentDay: number): StableAIState {
  return {
    stableId: stable.id,
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    lastUpdateDay: currentDay,
  };
}

/**
 * Create or get AI state for a stable
 */
export function getOrCreateStableAIState(
  manager: NpcAIManager,
  stable: Stable,
  currentDay: number,
): StableAIState {
  let state = manager.stableStates.get(stable.id);
  if (!state) {
    state = createStableAIState(stable, currentDay);
    manager.stableStates.set(stable.id, state);
  }
  return state;
}

/**
 * Update stable AI state after daily cycle
 */
export function updateStableAIState(
  state: StableAIState,
  currentDay: number,
): StableAIState {
  state.lastUpdateDay = currentDay;
  return state;
}

/**
 * Prune old learning data for all stables
 */
export function pruneAllLearningData(
  manager: NpcAIManager,
  cutoffDay: number,
): NpcAIManager {
  for (const state of manager.stableStates.values()) {
    // Prune learning state outcomes older than cutoff
    state.learningState.outcomes = state.learningState.outcomes.filter(
      (o) => o.day >= cutoffDay,
    );
  }
  return manager;
}

/**
 * Get strategic coordination insights for a stable
 */
export function getStrategicInsights(
  manager: NpcAIManager,
  stableId: string,
): {
  totalDecisions: number;
  overallSuccessRate: number;
  strategyConfidence: number;
  lastUpdate: number;
} | null {
  const state = manager.stableStates.get(stableId);
  if (!state) return null;

  const totalDecisions = state.learningState.outcomes.length;
  const successes = state.learningState.outcomes.filter((o) => o.success).length;
  const overallSuccessRate = totalDecisions > 0 ? successes / totalDecisions : 0.5;

  return {
    totalDecisions,
    overallSuccessRate,
    strategyConfidence: state.personalityState.strategyConfidence,
    lastUpdate: state.lastUpdateDay,
  };
}
