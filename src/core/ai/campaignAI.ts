/**
 * campaignAI.ts - Campaign AI system
 *
 * This file provides major race targeting for Triple Crown, Breeders Cup,
 * Dubai World Cup with contender detection, personality-driven targeting,
 * and learning integration for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Race, Stable), @/game/gradedRaces (GradedRace, GRADED_RACES), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), ./learningModule (learning functions), @/core/horse/stats (calculateOverallRating, calculateRaceRating), @/core/breeding/archetypes (getTripleCrownKeysForArchetype)
 * Related files: npcCycleAI.ts (uses campaign AI), personalitySystem.ts (provides personality state)
 */

/**
 * Campaign AI System
 * Major race targeting for Triple Crown, Breeders Cup, Dubai World Cup
 * Contender detection, personality-driven targeting, learning integration
 */

import type { Horse, Race, Stable } from "@/game/types";
import type { GradedRace } from "@/data/gradedRaces";
import type { TripleCrownProgress } from "@/core/calendar/campaignTypes";
import { getPersonalityAIState, calculateUtilityScore, recordOutcome } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome as recordLearningOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import {
  GRADED_RACES,
  GRADED_RACES_BY_KEY,
  GRADED_RACES_BY_TRIPLECROWN_KEY,
  GRADED_RACES_BY_BC_KEY,
} from "@/data/gradedRaces";
import { calculateOverallRating, calculateRaceRating } from "@/core/horse/stats";
import { getTripleCrownKeysForArchetype } from "@/core/breeding/archetypes";

export interface CampaignAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  contenderTracking: Record<string, ContenderStatus>;
  campaignHistory: CampaignDecision[];
}

export interface ContenderStatus {
  horseId: string;
  isContender: boolean;
  targetRaces: string[]; // Race keys for major races
  confidence: number; // 0-1, how confident we are this horse is a contender
  lastAssessmentDay: number;
  contenderSeries: Record<
    string,
    {
      // Per triple crown series
      isContender: boolean;
      confidence: number;
      targetRaces: string[];
      lastAssessmentDay: number;
    }
  >;
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
 * Prep race strategy configuration.
 */
interface PrepRaceStrategy {
  prepRaceDaysBefore: number;
  prepRaceGrade: string;
  numberOfPreps: number;
}

/**
 * Strategy record for prep race configuration based on personality.
 */
const PREP_RACE_STRATEGIES: Record<Stable["personality"], PrepRaceStrategy> = {
  aggressive: {
    prepRaceDaysBefore: 21,
    prepRaceGrade: "G3",
    numberOfPreps: 3,
  },
  conservative: {
    prepRaceDaysBefore: 45,
    prepRaceGrade: "G2",
    numberOfPreps: 1,
  },
  "win-now": {
    prepRaceDaysBefore: 28,
    prepRaceGrade: "G2",
    numberOfPreps: 2,
  },
  developer: {
    prepRaceDaysBefore: 30,
    prepRaceGrade: "G3",
    numberOfPreps: 2,
  },
  prestige: {
    prepRaceDaysBefore: 30,
    prepRaceGrade: "G3",
    numberOfPreps: 2,
  },
  trader: {
    prepRaceDaysBefore: 30,
    prepRaceGrade: "G3",
    numberOfPreps: 2,
  },
  specialist: {
    prepRaceDaysBefore: 30,
    prepRaceGrade: "G3",
    numberOfPreps: 2,
  },
  breeder: {
    prepRaceDaysBefore: 30,
    prepRaceGrade: "G3",
    numberOfPreps: 2,
  },
};

/**
 * Create AI state for campaign decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * contender tracking, and campaign history.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized campaign AI state
 */
export function createCampaignAIState(stable: Stable): CampaignAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    contenderTracking: {},
    campaignHistory: [],
  };
}

/**
 * Detect if a horse is a contender for major races.
 *
 * Evaluates horses for Triple Crown, Breeders Cup, Dubai World Cup,
 * and other major G1 races based on age, rating, and distance aptitude.
 * Uses stable's breedingArchetype to determine target triple crown series.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse to evaluate
 * @param currentDay - Current game day
 * @param stable - The stable making the decision (optional for backward compatibility)
 * @returns Updated campaign AI state with contender status
 */
export function detectContender(
  aiState: CampaignAIState,
  horse: Horse,
  currentDay: number,
  stable?: Stable,
): CampaignAIState {
  const horseRating = calculateOverallRating(horse);
  const avgStat = calculateRaceRating(horse);

  let isContender = false;
  let confidence = 0;
  const targetRaces: string[] = [];
  const contenderSeries: Record<
    string,
    {
      isContender: boolean;
      confidence: number;
      targetRaces: string[];
      lastAssessmentDay: number;
    }
  > = {};

  // Determine target triple crown series based on stable's breeding archetype
  const targetSeriesKeys = stable?.breedingArchetype
    ? getTripleCrownKeysForArchetype(stable.breedingArchetype)
    : [];

  // Triple Crown contender criteria - evaluate all series or target series if specified
  if (horse.age === 3 && avgStat > 70) {
    const tcRaces = Array.from(GRADED_RACES_BY_TRIPLECROWN_KEY.values()).flat();
    for (const race of tcRaces) {
      // If stable has breeding archetype, only evaluate matching series
      if (targetSeriesKeys.length > 0 && !targetSeriesKeys.includes(race.triplecrownKey || "")) {
        continue;
      }

      if (
        horse.distanceAptitude > race.distance - 300 &&
        horse.distanceAptitude < race.distance + 300
      ) {
        targetRaces.push(race.key);
        confidence += 0.2;

        // Track per-series contender status
        const tcKey = race.triplecrownKey || "";
        if (!contenderSeries[tcKey]) {
          contenderSeries[tcKey] = {
            isContender: false,
            confidence: 0,
            targetRaces: [],
            lastAssessmentDay: currentDay,
          };
        }
        contenderSeries[tcKey].targetRaces.push(race.key);
        contenderSeries[tcKey].confidence += 0.2;
      }
    }

    // Mark series as contender if they have enough target races
    for (const tcKey in contenderSeries) {
      if (contenderSeries[tcKey].targetRaces.length >= 2) {
        contenderSeries[tcKey].isContender = true;
        contenderSeries[tcKey].confidence = Math.min(1, contenderSeries[tcKey].confidence + 0.3);
      }
    }

    if (targetRaces.length >= 2) {
      isContender = true;
      confidence = Math.min(1, confidence + 0.3);
    }
  }

  // Breeders Cup contender criteria
  if (horse.age >= 3 && horseRating > 65) {
    const bcRaces = GRADED_RACES_BY_BC_KEY.get("breeders-cup") ?? [];
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
    const dwcRace = GRADED_RACES_BY_KEY.get("dubai-world-cup");
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
    targetRaces: [...new Set(targetRaces)],
    confidence,
    lastAssessmentDay: currentDay,
    contenderSeries,
  };

  return {
    ...aiState,
    contenderTracking: {
      ...aiState.contenderTracking,
      [horse.id]: status,
    },
  };
}

/**
 * Get optimal major race target for a contender horse.
 *
 * Evaluates all target races for the horse and selects the one
 * with the highest score based on distance, surface, and prestige.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse to evaluate
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param triplecrownHistory - Optional historical Triple Crown progress
 * @returns Optimal target race key or null if not a contender
 */
export function getOptimalMajorRaceTarget(
  aiState: CampaignAIState,
  horse: Horse,
  stable: Stable,
  currentDay: number,
  triplecrownHistory: TripleCrownProgress[] = [],
): string | null {
  const contenderStatus = aiState.contenderTracking[horse.id];
  if (!contenderStatus || !contenderStatus.isContender) return null;

  const tcHistoryMap = new Map<string, TripleCrownProgress>();
  for (const p of triplecrownHistory) {
    tcHistoryMap.set(`${p.horseId}:${p.triplecrownKey}`, p);
  }

  let bestRaceKey: string | null = null;
  let bestScore = 0;

  for (const raceKey of contenderStatus.targetRaces) {
    const race = GRADED_RACES_BY_KEY.get(raceKey);
    if (!race) continue;

    const score = calculateRaceTargetScore(aiState, horse, race, stable, currentDay, tcHistoryMap);
    if (score > bestScore) {
      bestScore = score;
      bestRaceKey = raceKey;
    }
  }

  return bestRaceKey;
}

/**
 * Calculate score for targeting a specific major race.
 *
 * Evaluates race fit based on distance, surface, prestige, purse value,
 * personality modifiers, and learning-based adjustments.
 * Adds bonus for series matching stable's breeding archetype and series progress.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse being evaluated
 * @param race - The race being considered
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param triplecrownHistory
 * @returns Race target score (0-100+)
 */
function calculateRaceTargetScore(
  aiState: CampaignAIState,
  horse: Horse,
  race: GradedRace,
  stable: Stable,
  currentDay: number,
  tcHistoryMap: Map<string, TripleCrownProgress>,
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
  if (race.triplecrownKey) {
    score += 40; // Base triple crown bonus

    // Bonus for matching stable's breeding archetype
    if (stable.breedingArchetype) {
      const targetSeries = getTripleCrownKeysForArchetype(stable.breedingArchetype);
      if (targetSeries.includes(race.triplecrownKey || "")) {
        score += 20; // Additional bonus for targeted series
      }
    }

    // Bonus for series progress
    const progress = tcHistoryMap.get(`${horse.id}:${race.triplecrownKey}`);
    if (progress && progress.legs.length > 0) {
      // If won previous legs, high bonus to keep chasing
      const wins = progress.legs.filter((l) => l.position === 1).length;
      if (wins > 0) {
        score += wins * 30; // Strong bonus to complete the sweep
      } else {
        score += 10; // Still chasing
      }
    }
  }

  if (race.bcKey === "breeders-cup") score += 35;
  if (race.key === "dubai-world-cup") score += 35;
  if (race.grade === "G1") score += 25;

  // Purse value
  score += Math.min(20, race.purse / 100000);

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
 * Determine if stable should target a major race for a horse.
 *
 * Evaluates whether to target a major race based on contender status,
 * target score, adaptive threshold, and personality.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse to evaluate
 * @param race - The major race being considered
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @param triplecrownHistory
 * @returns True if stable should target the major race
 */
export function shouldTargetMajorRace(
  aiState: CampaignAIState,
  horse: Horse,
  race: GradedRace,
  stable: Stable,
  currentDay: number,
  triplecrownHistory: TripleCrownProgress[] = [],
): boolean {
  const contenderStatus = aiState.contenderTracking[horse.id];
  if (!contenderStatus || !contenderStatus.isContender) return false;

  // Check if race is in target races
  if (!contenderStatus.targetRaces.includes(race.key)) return false;

  // Dynamic Form: Check recoveryPoints - avoid racing horses with low recovery
  const recoveryPoints = horse.recoveryPoints ?? 100;
  if (recoveryPoints < 40) {
    // Too fatigued to race effectively
    return false;
  } else if (recoveryPoints < 60) {
    // Moderately fatigued - only target if aggressive personality or very high stakes
    if (stable.personality !== "aggressive" && stable.personality !== "win-now") {
      return false;
    }
  }

  // Dynamic Form: Assess bounce risk
  let bounceRisk = false;
  if (horse.lastBeyer && horse.lastRaceDay && currentDay) {
    const daysSinceLastRace = currentDay - horse.lastRaceDay;
    const beyerHistory = horse.raceHistory
      .filter((r) => r.beyer !== undefined)
      .map((r) => r.beyer!);
    const avgBeyer =
      beyerHistory.length > 0
        ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
        : 80;

    // Bounce condition: lastBeyer > avgBeyer + 15 and raced within 28 days
    if (horse.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      bounceRisk = true;
    }
  }

  // If bounce risk is high, only aggressive personalities might still enter
  if (bounceRisk && stable.personality !== "aggressive" && stable.personality !== "win-now") {
    return false;
  }

  const tcHistoryMap = new Map<string, TripleCrownProgress>();
  for (const p of triplecrownHistory) {
    tcHistoryMap.set(`${p.horseId}:${p.triplecrownKey}`, p);
  }

  // Calculate target score
  const score = calculateRaceTargetScore(aiState, horse, race, stable, currentDay, tcHistoryMap);

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

  if (config.personality === "aggressive") threshold -= 10;
  if (config.personality === "conservative") threshold += 10;
  if (config.personality === "prestige" && (race.triplecrownKey || race.bcKey === "breeders-cup")) {
    threshold -= 15;
  }

  // Additional penalty for low recoveryPoints or bounce risk
  if (recoveryPoints < 60) threshold += 10;
  if (bounceRisk) threshold += 15;

  return score > threshold;
}

/**
 * Determine prep race strategy for major race targeting.
 *
 * Calculates the optimal prep race schedule based on personality,
 * target race type (Triple Crown, Breeders Cup, etc.), and learning.
 * For triple crown series, uses actual day gaps between legs from GRADED_RACES.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse being prepared
 * @param targetRace - The target major race
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Object with prep race strategy parameters
 */
export function getPrepRaceStrategy(
  aiState: CampaignAIState,
  horse: Horse,
  targetRace: GradedRace,
  stable: Stable,
  currentDay: number,
): {
  prepRaceDaysBefore: number;
  prepRaceGrade: string;
  numberOfPreps: number;
} {
  const config = aiState.personalityState;

  // Default strategy
  let prepRaceDaysBefore = 30;
  let prepRaceGrade = "G3";
  let numberOfPreps = 2;

  // Personality-based adjustments using strategy record
  const prepStrategy = PREP_RACE_STRATEGIES[config.personality];
  if (prepStrategy) {
    prepRaceDaysBefore = prepStrategy.prepRaceDaysBefore;
    prepRaceGrade = prepStrategy.prepRaceGrade;
    numberOfPreps = prepStrategy.numberOfPreps;
  }

  // Series-specific prep strategies based on actual day gaps
  if (targetRace.triplecrownKey) {
    const seriesRaces = GRADED_RACES_BY_TRIPLECROWN_KEY.get(targetRace.triplecrownKey) ?? [];
    if (seriesRaces.length >= 2) {
      // Sort by dayOfYear to find gaps
      const sortedRaces = seriesRaces.sort((a, b) => a.dayOfYear - b.dayOfYear);
      const targetIndex = sortedRaces.findIndex((r) => r.key === targetRace.key);

      // Calculate gap to previous leg (if not first leg)
      if (targetIndex > 0) {
        const gap = sortedRaces[targetIndex].dayOfYear - sortedRaces[targetIndex - 1].dayOfYear;
        // Set prep race days before based on gap (use ~40% of gap)
        prepRaceDaysBefore = Math.max(14, Math.floor(gap * 0.4));
      } else {
        // First leg: use default but slightly shorter
        prepRaceDaysBefore = 21;
      }
    } else {
      // Fallback for series with fewer than 2 races
      prepRaceDaysBefore = 21;
    }
    numberOfPreps = 2;
  }

  if (targetRace.bcKey === "breeders-cup") {
    prepRaceDaysBefore = 35;
  }

  return { prepRaceDaysBefore, prepRaceGrade, numberOfPreps };
}

/**
 * Record campaign decision for learning.
 *
 * Records the campaign decision in history for tracking
 * and learning purposes.
 *
 * @param aiState - Current campaign AI state
 * @param horse - The horse being targeted
 * @param raceKey - Key of the race being entered
 * @param targetRaceKey - Key of the target major race
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Updated campaign AI state
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

  const newHistory = [...aiState.campaignHistory, decision];

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  return {
    ...aiState,
    campaignHistory: trimmedHistory,
  };
}

/**
 * Record campaign outcome for learning.
 *
 * Finds the matching decision, records the outcome, and updates
 * the learning state for adaptive improvement.
 *
 * @param aiState - Current campaign AI state
 * @param horseId - ID of the horse
 * @param targetRaceKey - Key of the target major race
 * @param position - Final race position
 * @param prize - Prize money won
 * @param currentDay - Current game day
 * @returns Updated campaign AI state
 */
export function recordCampaignOutcome(
  aiState: CampaignAIState,
  horseId: string,
  targetRaceKey: string,
  position: number,
  prize: number,
  currentDay: number,
): CampaignAIState {
  const decisionIndex = aiState.campaignHistory.findIndex(
    (d) => d.horseId === horseId && d.targetRaceKey === targetRaceKey && d.success === undefined,
  );

  if (decisionIndex !== -1) {
    const decision = { ...aiState.campaignHistory[decisionIndex] };
    decision.success = position <= 3;
    decision.position = position;
    decision.prize = prize;

    const newHistory = [...aiState.campaignHistory];
    newHistory[decisionIndex] = decision;

    // Update learning state
    const contextKey = `${decision.personality}:${targetRaceKey}`;
    const value = prize > 0 ? prize / 10000 : -position;
    const newPersonalityState = recordOutcome(
      aiState.personalityState,
      "campaign",
      { horseId, raceKey: decision.raceKey, targetRaceKey },
      decision.success,
      value,
      currentDay,
    );

    return {
      ...aiState,
      campaignHistory: newHistory,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

/**
 * Get campaign insights for a stable.
 *
 * Calculates campaign statistics including total campaigns, success rate,
 * average position, total prize, and current contender count.
 *
 * @param aiState - Current campaign AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with campaign statistics
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

  const contenderCount = Object.values(aiState.contenderTracking).filter(
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
