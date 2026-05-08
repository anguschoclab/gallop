/**
 * Facility AI System
 * Multi-factor facility upgrade prioritization and maintenance
 */

import type { Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import type { FacilityType, FacilityLevel, PlayerFacilities } from "@/core/facilities";
import { FACILITY_CONFIGS } from "@/core/facilities/facilityConfigs";

export interface FacilityAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  upgradeHistory: FacilityUpgradeDecision[];
  roiTracking: Record<string, FacilityROI>;
}

export interface FacilityUpgradeDecision {
  facilityType: FacilityType;
  level: FacilityLevel;
  cost: number;
  stableId: string;
  day: number;
  success?: boolean; // True if ROI targets met after 90 days
  impact?: number; // Measured performance boost
}

export interface FacilityROI {
  facilityType: FacilityType;
  cumulativeCost: number;
  measuredBenefit: number;
  lastAssessmentDay: number;
}

/**
 * Create AI state for facility decisions
 */
export function createFacilityAIState(stable: Stable): FacilityAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    upgradeHistory: [],
    roiTracking: {},
  };
}

/**
 * Calculate facility upgrade priority score
 */
export function calculateUpgradePriority(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  currentFacilities: PlayerFacilities,
  stable: Stable,
): number {
  const config = FACILITY_CONFIGS[facilityType];
  const currentLevel = currentFacilities[facilityType]?.level || 0;
  
  // Can't upgrade beyond max level
  if (currentLevel >= 5) return 0;
  
  const nextLevel = (currentLevel + 1) as FacilityLevel;
  const upgradeCost = config.levels[nextLevel].cost;
  
  // Check budget constraint (max 30% of cash for upgrades)
  if (stable.cash < upgradeCost || upgradeCost > stable.cash * 0.3) return 0;

  let score = 0;

  // Base priority from personality
  const personality = aiState.personalityState.personality;
  if (personality === "aggressive" && (facilityType === "training_track" || facilityType === "vets_office")) score += 30;
  if (personality === "conservative" && (facilityType === "pastures" || facilityType === "fencing")) score += 30;
  if (personality === "win-now" && facilityType === "training_track") score += 40;

  // Utility factor modifiers
  const factors: Record<string, number> = {
    upgrade_cost: upgradeCost,
    current_level: currentLevel,
    stable_cash: stable.cash,
    stable_tier: stable.tier === "elite" ? 1 : stable.tier === "mid" ? 0.6 : 0.3,
  };

  score = calculateUtilityScore(aiState.personalityState, "facility_upgrade", factors);

  // ROI-based adjustment
  const roi = aiState.roiTracking[facilityType];
  if (roi) {
    const roiRatio = roi.measuredBenefit / (roi.cumulativeCost || 1);
    score += (roiRatio - 1) * 20;
  }

  // Learning-based adjustment
  const contextKey = `${facilityType}:${nextLevel}`;
  const successRate = getSuccessRate(aiState.learningState, "facility_upgrade", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 25;
  score += adaptiveBonus;

  return Math.max(0, score);
}

/**
 * Determine if stable should upgrade a facility
 */
export function shouldUpgradeFacility(
  aiState: FacilityAIState,
  currentFacilities: PlayerFacilities,
  stable: Stable,
  currentDay: number,
): FacilityType | null {
  const facilityTypes: FacilityType[] = ["training_track", "vets_office", "pastures", "fencing", "stable_block", "lab"];
  
  const scoredTypes = facilityTypes
    .map((type) => ({
      type,
      score: calculateUpgradePriority(aiState, type, currentFacilities, stable),
    }))
    .filter((f) => f.score > 60) // High threshold for facility investment
    .sort((a, b) => b.score - a.score);

  return scoredTypes.length > 0 ? scoredTypes[0].type : null;
}

/**
 * Record facility upgrade for learning
 */
export function recordUpgradeDecision(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  level: FacilityLevel,
  cost: number,
  stable: Stable,
  currentDay: number,
): FacilityAIState {
  const decision: FacilityUpgradeDecision = {
    facilityType,
    level,
    cost,
    stableId: stable.id,
    day: currentDay,
  };

  const newHistory = [...aiState.upgradeHistory, decision];
  
  // Update ROI tracking
  const roi = aiState.roiTracking[facilityType] || {
    facilityType,
    cumulativeCost: 0,
    measuredBenefit: 0,
    lastAssessmentDay: currentDay,
  };
  
  const updatedRoi = {
    ...roi,
    cumulativeCost: roi.cumulativeCost + cost,
  };

  return {
    ...aiState,
    upgradeHistory: newHistory,
    roiTracking: {
      ...aiState.roiTracking,
      [facilityType]: updatedRoi,
    },
  };
}
