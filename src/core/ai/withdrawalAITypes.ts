/**
 * withdrawalAITypes.ts - Types and state creation for withdrawal AI
 *
 * Extracted from withdrawalAI.ts for modularity.
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";

export interface WithdrawalAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  withdrawalHistory: WithdrawalDecision[];
}

export interface WithdrawalDecision {
  horseId: string;
  raceId: string;
  stableId: string;
  personality: Stable["personality"];
  horseAge: number;
  day: number;
  withdrew: boolean;
  reason?: string;
  riskScore?: number;
  outcome?: {
    horseResult?: number;
    alternativeRaceResult?: number;
  };
}

export function createWithdrawalAIState(stable: Stable): WithdrawalAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    withdrawalHistory: [],
  };
}
