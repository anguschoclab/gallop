/**
 * facilityAITypes.ts - Facility AI types and state creation
 *
 * Extracted from facilityAI.ts for modularity.
 */

import type { FacilityType, FacilityLevel } from "@/core/facilities/facilityTypes";
import type { Stable } from "@/game/types";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";

export interface FacilityAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  investmentHistory: FacilityInvestment[];
  roiTracking: Record<string, FacilityROI>;
}

export interface FacilityInvestment {
  facilityType: FacilityType;
  fromLevel: FacilityLevel;
  toLevel: FacilityLevel;
  cost: number;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  roi?: number;
}

export interface FacilityROI {
  facilityType: FacilityType;
  level: FacilityLevel;
  totalInvestment: number;
  totalBenefit: number;
  daysOwned: number;
  lastUpdateDay: number;
}

export function createFacilityAIState(stable: Stable): FacilityAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    investmentHistory: [],
    roiTracking: {},
  };
}
