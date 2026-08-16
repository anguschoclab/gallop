/**
 * facilityAI.ts - Facility AI system
 *
 * This file provides learning from facility ROI, strategic investment decisions,
 * and budget management for NPC stables.
 *
 * Dependencies: @/game/types (Stable), @/core/facilities/facilityTypes (FacilityType, FacilityLevel, PlayerFacilities, FACILITY_UPGRADE_COSTS), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), ./learningModule (learning functions)
 * Related files: npcCycleAI.ts (uses facility AI), personalitySystem.ts (provides personality state)
 */

/**
 * Facility AI System
 * Learning from facility ROI, strategic investment decisions, budget management
 */

import type {
  FacilityType,
  FacilityLevel,
  PlayerFacilities,
} from "@/core/facilities/facilityTypes";
import type { Stable } from "@/game/types";
import {
  getPersonalityAIState,
  recordPersonalityOutcome,
  calculateUtilityScore,
} from "./personalitySystem";
import {
  createLearningState,
  recordLearningOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { FACILITY_UPGRADE_COSTS } from "@/core/facilities/facilityTypes";
import { FACILITY_UPGRADE_BASE_THRESHOLD, DEFAULT_SUBSYSTEM_WEIGHT } from "@/constants/aiConstants";

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

/**
 * Create AI state for facility decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * investment history, and ROI tracking.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized facility AI state
 */
export function createFacilityAIState(stable: Stable): FacilityAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    investmentHistory: [],
    roiTracking: {},
  };
}

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

/**
 * Record facility investment for learning.
 *
 * Records the facility investment in history and initializes
 * ROI tracking for the upgraded facility.
 *
 * @param aiState - Current facility AI state
 * @param facilityType - The facility type being upgraded
 * @param fromLevel - Previous level before upgrade
 * @param toLevel - New level after upgrade
 * @param cost - Cost of the upgrade
 * @param stable - The stable making the investment
 * @param currentDay - Current game day
 * @returns Updated facility AI state
 */
export function recordFacilityInvestment(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  fromLevel: FacilityLevel,
  toLevel: FacilityLevel,
  cost: number,
  stable: Stable,
  currentDay: number,
): FacilityAIState {
  const investment: FacilityInvestment = {
    facilityType,
    fromLevel,
    toLevel,
    cost,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  const newHistory = [...aiState.investmentHistory, investment];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Initialize ROI tracking
  const roiKey = `${facilityType}:${toLevel}`;
  const existingRoi = aiState.roiTracking[roiKey];

  const roi = existingRoi
    ? {
        ...existingRoi,
        totalInvestment: existingRoi.totalInvestment + cost,
      }
    : {
        facilityType,
        level: toLevel,
        totalInvestment: cost,
        totalBenefit: 0,
        daysOwned: 0,
        lastUpdateDay: currentDay,
      };

  return {
    ...aiState,
    investmentHistory: trimmedHistory,
    roiTracking: {
      ...aiState.roiTracking,
      [roiKey]: roi,
    },
  };
}

/**
 * Update facility ROI tracking.
 *
 * Updates the ROI tracking for a facility with new benefit data,
 * calculates days owned, and updates the learning state.
 *
 * @param aiState - Current facility AI state
 * @param facilityType - The facility type to update
 * @param level - The facility level to update
 * @param benefit - Benefit value to add
 * @param currentDay - Current game day
 * @returns Updated facility AI state
 */
export function updateFacilityROI(
  aiState: FacilityAIState,
  facilityType: FacilityType,
  level: FacilityLevel,
  benefit: number,
  currentDay: number,
): FacilityAIState {
  const roiKey = `${facilityType}:${level}`;
  const roi = aiState.roiTracking[roiKey];

  if (roi) {
    const updatedRoi = {
      ...roi,
      totalBenefit: roi.totalBenefit + benefit,
      daysOwned: roi.daysOwned + (currentDay - roi.lastUpdateDay),
      lastUpdateDay: currentDay,
    };

    // Update learning state
    const contextKey = facilityType;
    const success = benefit > 50; // Benefit threshold
    const newPersonalityState = recordPersonalityOutcome(
      aiState.personalityState,
      "facility_upgrade",
      { facilityId: `${facilityType}:${level}` },
      success,
      benefit,
      currentDay,
    );

    return {
      ...aiState,
      personalityState: newPersonalityState,
      roiTracking: {
        ...aiState.roiTracking,
        [roiKey]: updatedRoi,
      },
    };
  }

  return aiState;
}

/**
 * Get facility insights for a stable.
 *
 * Calculates facility statistics including total investments,
 * average ROI, total facilities owned, and facility levels.
 *
 * @param aiState - Current facility AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with facility statistics
 */
export function getFacilityInsights(
  aiState: FacilityAIState,
  stableId: string,
): {
  totalInvestments: number;
  avgROI: number;
  totalFacilities: number;
  facilityLevels: Record<string, FacilityLevel>;
} {
  const stableInvestments = aiState.investmentHistory.filter((i) => i.stableId === stableId);
  const totalInvestments = stableInvestments.length;
  const totalInvestedAmount = stableInvestments.reduce((sum, i) => sum + i.cost, 0);

  const rois = Object.values(aiState.roiTracking);
  const totalBenefit = rois.reduce((sum, r) => sum + r.totalBenefit, 0);
  const avgROI =
    totalInvestedAmount > 0 ? (totalBenefit - totalInvestedAmount) / totalInvestedAmount : 0;

  const facilityLevels: Record<string, FacilityLevel> = {};
  for (const investment of stableInvestments) {
    facilityLevels[investment.facilityType] = investment.toLevel;
  }

  return {
    totalInvestments,
    avgROI,
    totalFacilities: Object.keys(facilityLevels).length,
    facilityLevels,
  };
}

// ─── Capacity-Driven Upgrades ────────────────────────────────────────────────

/**
 * Determine if a facility should be upgraded based on stable capacity utilization.
 *
 * If a stable's horse count is at or near the facility's capacity, the facility
 * should be upgraded to support more horses. This prevents bottlenecks in
 * training, breeding, or recovery.
 *
 * @param facilityType - The type of facility to evaluate
 * @param currentLevel - Current facility level
 * @param horseCount - Number of horses in the stable
 * @param stableCash - Available cash for upgrades
 * @returns True if the facility should be upgraded
 */
const LEVEL_CAPACITY: Record<FacilityLevel, number> = {
  basic: 5,
  standard: 10,
  premium: 15,
  elite: 20,
};

export function shouldUpgradeForCapacity(
  facilityType: FacilityType,
  currentLevel: FacilityLevel,
  horseCount: number,
  stableCash: number,
): boolean {
  const capacity = LEVEL_CAPACITY[currentLevel] ?? 5;

  // At 80%+ capacity, recommend upgrade
  if (horseCount >= capacity * 0.8) {
    const upgradeCost = FACILITY_UPGRADE_COSTS[currentLevel];
    if (upgradeCost === null) return false; // Already at max level
    // Only upgrade if stable can afford it without going broke
    if (stableCash > upgradeCost * 2) {
      return true;
    }
  }

  return false;
}

// ─── Specialization Strategy ─────────────────────────────────────────────────

/**
 * Determine the optimal facility specialization for a stable.
 *
 * Based on stable personality, recommend which facility to prioritize:
 * - Breeder: breeding barn and nursery
 * - Aggressive/win-now: training track and pool
 * - Developer: training track and vet clinic
 * - Trader: training track (quick turnaround)
 *
 * @param personality - The stable's personality type
 * @returns Ordered list of facility types to prioritize
 */
export function getSpecializationPriority(personality: Stable["personality"]): FacilityType[] {
  switch (personality) {
    case "breeder":
      return ["barn", "nutrition_lab", "main_track", "veterinary_clinic"];
    case "aggressive":
    case "win-now":
      return ["main_track", "exercise_pool", "veterinary_clinic", "spa"];
    case "developer":
      return ["main_track", "veterinary_clinic", "exercise_pool", "barn"];
    case "trader":
      return ["main_track", "veterinary_clinic", "barn", "exercise_pool"];
    case "prestige":
      return ["barn", "main_track", "exercise_pool", "veterinary_clinic"];
    default:
      return ["main_track", "veterinary_clinic", "barn", "exercise_pool"];
  }
}

// ─── ROI Divestment ──────────────────────────────────────────────────────────

/**
 * Evaluate if a facility should be divested (downgraded) based on poor ROI.
 *
 * If a facility has been generating negative ROI for an extended period,
 * it may be better to downgrade it and redirect funds elsewhere.
 *
 * @param roi - The facility's ROI tracking data
 * @param currentLevel - Current facility level
 * @returns True if the facility should be downgraded
 */
const LEVEL_ORDER: Record<FacilityLevel, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
  elite: 4,
};

export function shouldDivestFacility(roi: FacilityROI, currentLevel: FacilityLevel): boolean {
  // Only consider divestment for premium+ facilities (basic/standard are baseline)
  if (LEVEL_ORDER[currentLevel] < 3) return false;

  // Need at least 30 days of data
  if (roi.daysOwned < 30) return false;

  // Calculate ROI percentage
  const roiPercent =
    roi.totalInvestment > 0 ? (roi.totalBenefit - roi.totalInvestment) / roi.totalInvestment : 0;

  // Negative ROI beyond -20%: divest
  if (roiPercent < -0.2) return true;

  return false;
}
