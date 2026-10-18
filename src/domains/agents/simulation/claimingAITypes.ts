/**
 * claimingAITypes.ts - Types and state creation for claiming AI
 *
 * Extracted from claimingAI.ts for modularity.
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";

export interface ClaimingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  claimingHistory: ClaimingDecision[];
}

export interface ClaimingDecision {
  horseId: string;
  raceId: string;
  claimingPrice: number;
  horseRating: number;
  stableId: string;
  personality: Stable["personality"];
  horseAge: number;
  day: number;
  success?: boolean;
  value?: number;
  riskScore?: number;
}

export function createClaimingAIState(stable: Stable): ClaimingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    claimingHistory: [],
  };
}
