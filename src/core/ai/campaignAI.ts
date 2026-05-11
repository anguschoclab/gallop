/**
 * Campaign AI System
 * Major race targeting for Triple Crown, Breeders Cup, Dubai World Cup
 * Contender detection, personality-driven targeting, learning integration
 */

import type { Horse, Race, Stable } from "@/game/types";
import type { GradedRace } from "@/game/gradedRaces";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { GRADED_RACES } from "@/game/gradedRaces";
import { calculateOverallRating } from "@/core/horse/stats";

export interface CampaignAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  contenderTracking: Map<string, ContenderStatus>;
  campaignHistory: CampaignDecision[];
}

export interface ContenderStatus {
  horseId: string;
  isContender: boolean;
  targetRaces: string[]; // Race keys for major races
  confidence: number; // 0-1, how confident we are this horse is a contender
  lastAssessmentDay: number;
}

export interface CampaignDecision {
  horseId: string;
  raceKey: string;
  targetRaceKey: string;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  success?: boolean;
  position?: number;
  prize?: number;
}

/**
 * Create AI state for campaign decisions
 */
export function createCampaignAIState(stable: Stable): CampaignAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    contenderTracking: new Map(),
    campaignHistory: [],
  };
}

/**
 * Detect if a horse is a contender for major races
 */
export function detectContender(
  aiState: CampaignAIState,
  horse: Horse,
  currentDay: number,
): ContenderStatus {
  const horseRating = calculateOverallRating(horse);
  const avgStat = (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration) / 3;

  let isContender = false;
  let confidence = 0;
  const targetRaces: string[] = [];

  // Triple Crown contender criteria
  if (horse.age === 3 && avgStat > 70) {
    const tcRaces = GRADED_RACES.filter((r) => r.triplecrownKey);
    for (const race of tcRaces) {
      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.2;
      }
    }
    if (targetRaces.length >= 2) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.3);
    }
  }

  // Breeders Cup contender criteria
  if (horse.age >= 3 && horseRating > 65) {
    const bcRaces = GRADED_RACES.filter((r) => r.bcKey === "breeders-cup");
    for (const race of bcRaces) {
      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.15;
      }
    }
    if (targetRaces.length >= 1 && horseRating > 75) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.2);
    }
  }

  // Dubai World Cup contender criteria
  if (horse.age >= 4 && horseRating > 75) {
    const dwcRace = GRADED_RACES.find((r) => r.key === "dubai-world-cup");
    if (
      dwcRace &&
      horse.distanceAptitude > dwcRace.distance - 300 &&
      horse.distanceAptitude < dwcRace.distance + 300
    ) {
      targetRaces.push(dwcRace.key);
      isContender = true;
      confidence = Math.min(1, confidence + 0.25);
    }
  }

  // Other G1 races with $1M+ purses
  if (horseRating > 70) {
    const majorG1Races = GRADED_RACES.filter(
      (r) =>
        r.grade === "G1" && r.purse >= 1000000 && !r.triplecrownKey && r.bcKey !== "breeders-cup",
    );
    for (const race of majorG1Races) {
      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.1;
      }
    }
    if (targetRaces.length >= 1 && horseRating > 80) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.15);
    }
  }

  const status: ContenderStatus = {
    horseId: horse.id,
    isContender,
    targetRaces: [...new Set(targetRaces)], // Deduplicate
    confidence,
    lastAssessmentDay: currentDay,
  };

  aiState.contenderTracking.set(horse.id, status);
  return status;
}

/**
 * Get optimal major race target for a contender horse
 */
export function getOptimalMajorRaceTarget(
  aiState: CampaignAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
): string | null {
  const contenderStatus = aiState.contenderTracking.get(horse.id);
  if (!contenderStatus || !contenderStatus.isContender) return null;

  let bestRaceKey: string | null = null;
  let bestScore = 0;

  for (const raceKey of contenderStatus.targetRaces) {
    const race = GRADED_RACES.find((r) => r.key === raceKey);
    if (!race) continue;

    const score = calculateRaceTargetScore(aiState, horse, race, stable, currentDay);
    if (score > bestScore) {
      bestScore = score;
      bestRaceKey = raceKey;
    }
  }

  return bestRaceKey;
}

/**
 * Calculate score for targeting a specific major race
 */
function calculateRaceTargetScore(
  aiState: CampaignAIState,
  horse: Horse,
  race: GradedRace,
  stable: Stable,
  currentDay: number,
): number {
  let score = 0;

  // Distance fit
  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff < 200) score += 30;
  else if (distDiff < 400) score += 20;
  else if (distDiff < 600) score += 10;

  // Surface fit
  if (race.surface && horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"]) {
    score += horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"] * 20;
  }

  // Race prestige
  if (race.triplecrownKey) score += 40; // Triple Crown races most prestigious
  if (race.bcKey === "breeders-cup") score += 35; // Breeders Cup
  if (race.key === "dubai-world-cup") score += 35; // Dubai World Cup
  if (race.grade === "G1") score += 25; // Other G1s

  // Purse value
  score += Math.min(20, race.purse / 100000); // Up to 20 points for purse

  // Personality modifiers
  const factors: Record<string, number> = {
    race_prestige: race.triplecrownKey ? 1 : race.bcKey === "breeders-cup" ? 0.9 : 0.7,
    horse_quality: calculateOverallRating(horse),
    distance_fit: score,
  };

  score = calculateUtilityScore(aiState.personalityState, "campaign_targeting", factors);

  // Learning-based adjustment
  const contextKey = `${stable.personality}:${race.key}`;
  const successRate = getSuccessRate(aiState.learningState, "campaign_targeting", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  return score;
}

/**
 * Determine if stable should target a major race for a horse
 */
export function shouldTargetMajorRace(
  aiState: CampaignAIState,
  horse: Horse,
  race: GradedRace,
  stable: Stable,
  currentDay: number,
): boolean {
  // Check if horse is a contender
  const contenderStatus = detectContender(aiState, horse, currentDay);
  if (!contenderStatus.isContender) return false;

  // Check if race is in target races
  if (!contenderStatus.targetRaces.includes(race.key)) return false;

  // Calculate target score
  const score = calculateRaceTargetScore(aiState, horse, race, stable, currentDay);

  // Get adaptive threshold
  const contextKey = `${stable.personality}:${race.key}`;
  const baseThreshold = 50;
  const adaptiveThreshold = getAdaptiveThreshold(
    aiState.learningState,
    "campaign_targeting",
    contextKey,
    baseThreshold,
    aiState.personalityState.adaptationSpeed,
  );

  // Personality-based threshold adjustment
  const config = aiState.personalityState;
  let threshold = adaptiveThreshold;

  if (config.personality === "aggressive") threshold -= 10; // More likely to target
  if (config.personality === "conservative") threshold += 10; // More cautious
  if (config.personality === "prestige" && (race.triplecrownKey || race.bcKey === "breeders-cup")) {
    threshold -= 15; // Prestige stables prioritize major races
  }

  return score > threshold;
}

/**
 * Determine prep race strategy for major race targeting
 */
export function getPrepRaceStrategy(
  aiState: CampaignAIState,
  horse: Horse,
  targetRace: GradedRace,
  stable: Stable,
  currentDay: number,
): {
  prepRaceDaysBefore: number; // How many days before target to schedule prep
  prepRaceGrade: string; // Minimum grade for prep races
  numberOfPreps: number; // How many prep races to schedule
} {
  const config = aiState.personalityState;

  // Default strategy
  let prepRaceDaysBefore = 30;
  let prepRaceGrade = "G3";
  let numberOfPreps = 2;

  // Personality-based adjustments
  if (config.personality === "aggressive") {
    prepRaceDaysBefore = 21; // Shorter prep for aggressive stables
    numberOfPreps = 3; // More prep races
  } else if (config.personality === "conservative") {
    prepRaceDaysBefore = 45; // Longer prep for conservative stables
    numberOfPreps = 1; // Fewer prep races
    prepRaceGrade = "G2"; // Higher quality preps
  } else if (config.personality === "win-now") {
    prepRaceDaysBefore = 28; // Moderate prep
    numberOfPreps = 2;
    prepRaceGrade = "G2"; // Better preps for win-now
  }

  // Triple Crown races require specific prep patterns
  if (targetRace.triplecrownKey) {
    prepRaceDaysBefore = 21; // Shorter preps for TC series
    numberOfPreps = 2; // Standard 2-prep pattern
  }

  // Breeders Cup allows longer prep
  if (targetRace.bcKey === "breeders-cup") {
    prepRaceDaysBefore = 35;
  }

  return { prepRaceDaysBefore, prepRaceGrade, numberOfPreps };
}

/**
 * Record campaign decision for learning
 */
export function recordCampaignDecision(
  aiState: CampaignAIState,
  horse: Horse,
  raceKey: string,
  targetRaceKey: string,
  stable: Stable,
  currentDay: number,
): CampaignAIState {
  const decision: CampaignDecision = {
    horseId: horse.id,
    raceKey,
    targetRaceKey,
    stableId: stable.id,
    personality: stable.personality,
    day: currentDay,
  };

  aiState.campaignHistory.push(decision);

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  if (aiState.campaignHistory.length > maxHistory) {
    aiState.campaignHistory = aiState.campaignHistory.slice(-maxHistory);
  }

  return aiState;
}

/**
 * Record campaign outcome for learning
 */
export function recordCampaignOutcome(
  aiState: CampaignAIState,
  horseId: string,
  targetRaceKey: string,
  position: number,
  prize: number,
  currentDay: number,
): CampaignAIState {
  const decision = aiState.campaignHistory.find(
    (d) => d.horseId === horseId && d.targetRaceKey === targetRaceKey && !d.success,
  );

  if (decision) {
    decision.success = position <= 3; // Top 3 is success
    decision.position = position;
    decision.prize = prize;

    // Update learning state
    const contextKey = `${decision.personality}:${targetRaceKey}`;
    const value = prize > 0 ? prize / 10000 : -position; // Normalize value
    aiState.learningState = recordOutcome(
      aiState.learningState,
      "campaign_targeting",
      contextKey,
      decision.success,
      value,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );
  }

  return aiState;
}

/**
 * Get campaign insights for a stable
 */
export function getCampaignInsights(
  aiState: CampaignAIState,
  stableId: string,
): {
  totalCampaigns: number;
  successRate: number;
  avgPosition: number;
  totalPrize: number;
  contenderCount: number;
} {
  const stableHistory = aiState.campaignHistory.filter(
    (d) => d.stableId === stableId && d.success !== undefined,
  );
  const totalCampaigns = stableHistory.length;
  const successes = stableHistory.filter((d) => d.success).length;
  const successRate = totalCampaigns > 0 ? successes / totalCampaigns : 0.5;
  const avgPosition =
    totalCampaigns > 0
      ? stableHistory.reduce((sum, d) => sum + (d.position || 5), 0) / totalCampaigns
      : 5;
  const totalPrize =
    totalCampaigns > 0 ? stableHistory.reduce((sum, d) => sum + (d.prize || 0), 0) : 0;

  const contenderCount = Array.from(aiState.contenderTracking.values()).filter(
    (c) => c.isContender && c.lastAssessmentDay > 0,
  ).length;

  return {
    totalCampaigns,
    successRate,
    avgPosition,
    totalPrize,
    contenderCount,
  };
}
