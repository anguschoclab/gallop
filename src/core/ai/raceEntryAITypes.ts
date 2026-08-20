/**
 * raceEntryAITypes.ts - Types and state creation for race entry AI
 *
 * Extracted from raceEntryAI.ts for modularity.
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";

export interface RaceEntryAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  strategicPlan: StrategicPlan;
}

export interface StrategicPlan {
  targetRaces: Array<{
    raceId: string;
    day: number;
    priority: number;
    horseId?: string;
  }>;
  horseDevelopment: Record<string, HorseDevelopmentTrack>;
  budgetAllocation: Record<string, number>;
}

export interface HorseDevelopmentTrack {
  horseId: string;
  targetGrade: string;
  currentProgress: number;
  recentRaces: Array<{ raceId: string; position: number; beyer: number }>;
  projectedPeak: number;
}

/**
 * Create AI state for race entry decisions.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized race entry AI state
 */
export function createRaceEntryAIState(stable: Stable): RaceEntryAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    strategicPlan: {
      targetRaces: [],
      horseDevelopment: {},
      budgetAllocation: {},
    },
  };
}
