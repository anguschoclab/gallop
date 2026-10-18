/**
 * marketAITypes.ts - Types and state creation for market AI
 *
 * Extracted from marketAI.ts for modularity.
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";

export interface MarketAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  purchaseHistory: MarketPurchase[];
  portfolio: PortfolioState;
}

export interface MarketPurchase {
  horseId: string;
  horseRating: number;
  purchasePrice: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean;
  value?: number;
}

export interface PortfolioState {
  targetHorseCount: number;
  currentHorseCount: number;
  budgetRemaining: number;
  ageDistribution: Record<number, number>;
  qualityTarget: number;
}

/**
 * Create AI state for market decisions.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized market AI state
 */
export function createMarketAIState(stable: Stable): MarketAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    purchaseHistory: [],
    portfolio: {
      targetHorseCount: stable.personality === "prestige" ? 15 : 10,
      currentHorseCount: 0,
      budgetRemaining: stable.cash,
      ageDistribution: {},
      qualityTarget: 60,
    },
  };
}
