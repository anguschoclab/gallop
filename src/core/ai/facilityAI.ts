/**
 * facilityAI.ts - Facility AI system
 *
 * This file provides strategic investment decisions, budget management,
 * and upgrade priority scoring for NPC stables.
 *
 * Dependencies: @/game/types (Stable), @/core/facilities/facilityTypes (FacilityType, FacilityLevel, PlayerFacilities, FACILITY_UPGRADE_COSTS), ./personalitySystem (calculateUtilityScore), ./learningModule (getSuccessRate, getAdaptiveThreshold), ./facilityAITypes (types, createFacilityAIState), ./facilityAIRoi (recordFacilityInvestment, updateFacilityROI, getFacilityInsights), ./facilityAIStrategies (shouldUpgradeForCapacity, getSpecializationPriority, shouldDivestFacility)
 * Related files: npcCycleAI.ts (uses facility AI), personalitySystem.ts (provides personality state)
 */

import type {
  FacilityType,
  FacilityLevel,
  PlayerFacilities,
} from "@/core/facilities/facilityTypes";
import type { Stable } from "@/game/types";
import { calculateUtilityScore } from "./personalitySystem";
import { getSuccessRate, getAdaptiveThreshold } from "./learningModule";
import { FACILITY_UPGRADE_COSTS } from "@/core/facilities/facilityTypes";
import { FACILITY_UPGRADE_BASE_THRESHOLD, DEFAULT_SUBSYSTEM_WEIGHT } from "@/constants/aiConstants";
import type { FacilityAIState, FacilityInvestment, FacilityROI } from "./facilityAITypes";
import { createFacilityAIState } from "./facilityAITypes";
import { recordFacilityInvestment, updateFacilityROI, getFacilityInsights } from "./facilityAIRoi";

// Re-export types and functions for backward compatibility
export type { FacilityAIState, FacilityInvestment, FacilityROI } from "./facilityAITypes";
export { createFacilityAIState } from "./facilityAITypes";
export { recordFacilityInvestment, updateFacilityROI, getFacilityInsights } from "./facilityAIRoi";
export {
  shouldUpgradeForCapacity,
  getSpecializationPriority,
  shouldDivestFacility,
} from "./facilityAIStrategies";

/**
 * Calculate investment priority score for a facility upgrade.
 *
 * Evaluates the priority of upgrading a facility based on facility type,
 * current level, budget, ROI learning, and personality modifiers.
 *
 * @param aiState - Current facility AI state
 * @param facilityType - The facility type to evaluate
 * @param currentLevel - Current level of the facility
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Upgrade priority score (0-100+)
 */
function calculateFacilityUpgradePriority(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  currentLevel: FacilityLevel,
  stable: Stable,
  currentDay: number,
): number {
  let score = 0;

  // Can't upgrade from elite
  if (currentLevel === "elite") return 0;

  const upgradeCost = FACILITY_UPGRADE_COSTS[currentLevel] || 0;
  if (upgradeCost === null || upgradeCost === 0) return 0;

  // Base priority from facility importance
  const facilityPriority = getFacilityPriority(facilityType, aiState.personalityState.personality);
  score += facilityPriority;

  // Current level penalty (lower levels have higher priority)
  const levelBonus = { basic: 30, standard: 20, premium: 10 }[currentLevel as string] || 0;
  score += levelBonus;

  // Budget consideration
  const budgetRatio = stable.cash / upgradeCost;
  if (budgetRatio < 2) score -= 20; // Too expensive
  if (budgetRatio > 5) score += 10; // Affordable

  // ROI learning
  const roiKey = `${facilityType}:${currentLevel}`;
  const roi = aiState.roiTracking[roiKey];
  if (roi && roi.daysOwned > 30) {
    const dailyROI = roi.totalBenefit / roi.daysOwned;
    if (dailyROI > 50) score += 20; // Good ROI
    if (dailyROI < 10) score -= 15; // Poor ROI
  }

  // Personality modifiers
  const factors: Record<string, number> = {
    facility_priority: facilityPriority,
    current_level_bonus: levelBonus,
    budget_ratio: budgetRatio,
    upgrade_cost: upgradeCost,
  };

  score = calculateUtilityScore(aiState.personalityState, "facility_upgrade", factors);

  // Learning-based adjustment
  const contextKey = `${stable.personality}:${facilityType}`;
  const successRate = getSuccessRate(aiState.learningState, "facility_upgrade", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 10;
  score += adaptiveBonus;

  return Math.max(0, score);
}

/**
 * Get base priority for a facility type based on personality.
 *
 * Returns a base priority score for each facility type, adjusted for
 * personality preferences. Higher priority for essential facilities like
 * main_track and barn.
 *
 * @param facilityType - The facility type to evaluate
 * @param personality - The stable personality for adjustment
 * @returns Base priority score (0-50)
 */
function getFacilityPriority(
  facilityType: FacilityType,
  personality: Stable["personality"],
): number {
  const basePriorities: Record<string, number> = {
    main_track: 50, // Essential for training
    barn: 40, // Recovery is important
    veterinary_clinic: 35, // Health management
    exercise_pool: 25, // Injury prevention
    treadmill: 20, // Training variety
    starting_gates: 25, // Start improvement
    spa: 20, // Recovery
    nutrition_lab: 15, // Growth optimization
    rehab_center: 15, // Injury recovery
    transport: 10, // Logistics
  };

  let priority = basePriorities[facilityType] || 20;

  // Personality adjustments
  if (personality === "developer") {
    if (facilityType === "nutrition_lab") priority += 15;
    if (facilityType === "barn") priority += 10;
  } else if (personality === "prestige") {
    if (facilityType === "main_track") priority += 10;
    if (facilityType === "spa") priority += 15;
  } else if (personality === "conservative") {
    if (facilityType === "veterinary_clinic") priority += 15;
    if (facilityType === "transport") priority += 10;
  } else if (personality === "win-now") {
    if (facilityType === "main_track") priority += 15;
    if (facilityType === "starting_gates") priority += 10;
  }

  return priority;
}

/**
 * Determine if stable should upgrade a facility.
 *
 * Evaluates whether to upgrade based on priority score, adaptive threshold,
 * and personality-based threshold adjustment.
 *
 * @param aiState - Current facility AI state
 * @param facilityType - The facility type to evaluate
 * @param currentLevel - Current level of the facility
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param weight - Subsystem weight that modulates upgrade willingness (default 1.0)
 * @returns True if stable should upgrade the facility
 */
export function shouldUpgradeFacility(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  currentLevel: FacilityLevel,
  stable: Stable,
  currentDay: number,
  weight = DEFAULT_SUBSYSTEM_WEIGHT,
): boolean {
  // Weight ≤ 0 → never upgrade
  if (weight <= 0) return false;

  const priorityScore = calculateFacilityUpgradePriority(
    aiState,
    facilityType,
    currentLevel,
    stable,
    currentDay,
  );

  // Get adaptive threshold
  const contextKey = `${stable.personality}:${facilityType}`;
  const baseThreshold = FACILITY_UPGRADE_BASE_THRESHOLD;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "facility_upgrade",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  // Personality-based threshold adjustment
  const config = aiState.personalityState;
  let threshold = adaptiveThreshold;

  if (config.personality === "aggressive") threshold -= 10;
  if (config.personality === "conservative") threshold += 10;
  if (config.personality === "developer") threshold -= 5; // Developers invest more

  // Weight modulates threshold: higher weight → lower threshold → more likely to upgrade
  threshold /= weight;

  return priorityScore > threshold;
}

/**
 * Calculate facility budget allocation.
 *
 * Calculates the total facility budget as a percentage of cash
 * and allocates it between upgrades and maintenance based on personality.
 *
 * @param aiState - Current facility AI state
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Object with totalBudget, upgradeBudget, and maintenanceBudget
 */
export function calculateFacilityBudget(
  aiState: FacilityAIState,
  stable: Stable,
  currentDay: number,
): {
  totalBudget: number;
  upgradeBudget: number;
  maintenanceBudget: number;
} {
  // Base budget is percentage of cash
  const totalBudget = stable.cash * 0.15; // 15% of cash for facilities

  // Personality-based allocation
  const config = aiState.personalityState;
  let upgradeRatio = 0.6; // Default 60% for upgrades, 40% for maintenance

  if (config.personality === "conservative") {
    upgradeRatio = 0.4; // More for maintenance
  } else if (config.personality === "aggressive") {
    upgradeRatio = 0.8; // More for upgrades
  } else if (config.personality === "developer") {
    upgradeRatio = 0.7; // Invest in growth
  }

  const upgradeBudget = totalBudget * upgradeRatio;
  const maintenanceBudget = totalBudget * (1 - upgradeRatio);

  return {
    totalBudget,
    upgradeBudget,
    maintenanceBudget,
  };
}

/**
 * Select best facility to upgrade.
 *
 * Evaluates all facilities and selects the one with the highest
 * priority score that fits within the upgrade budget.
 *
 * @param aiState - Current facility AI state
 * @param facilities - Current facility levels
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Best facility type to upgrade or null if none suitable
 */
export function selectFacilityToUpgrade(
  aiState: FacilityAIState,
  facilities: PlayerFacilities,
  stable: Stable,
  currentDay: number,
): FacilityType | null {
  const budget = calculateFacilityBudget(aiState, stable, currentDay).upgradeBudget;

  let bestFacility: FacilityType | null = null;
  let bestScore = 0;

  for (const [facilityType, facility] of Object.entries(facilities)) {
    if (!facility) continue;
    const currentLevel = facility.level || "basic";
    const upgradeCost = FACILITY_UPGRADE_COSTS[currentLevel as FacilityLevel];

    if (!upgradeCost || upgradeCost > budget) continue;

    const score = calculateFacilityUpgradePriority(
      aiState,
      facilityType as FacilityType,
      currentLevel as FacilityLevel,
      stable,
      currentDay,
    );

    if (score > bestScore) {
      bestScore = score;
      bestFacility = facilityType as FacilityType;
    }
  }

  return bestFacility;
}
