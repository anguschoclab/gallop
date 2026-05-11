/**
 * Jockey AI System
 * Personality-driven jockey selection, retention, and contract negotiation
 */

import type { Horse, Jockey, Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";

export interface JockeyAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  jockeyHistory: JockeyAssignment[];
  retention: JockeyRetention[];
}

export interface JockeyAssignment {
  jockeyId: string;
  horseId: string;
  raceId: string;
  stableId: string;
  day: number;
  fee: number;
  result?: {
    position: number;
    prize: number;
  };
}

export interface JockeyRetention {
  jockeyId: string;
  stableId: string;
  hireDay: number;
  lastUseDay: number;
  totalRides: number;
  totalPrize: number;
  retained: boolean;
}

/**
 * Create AI state for jockey decisions
 */
export function createJockeyAIState(stable: Stable): JockeyAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    jockeyHistory: [],
    retention: [],
  };
}

/**
 * Calculate jockey suitability score for a horse
 */
export function calculateJockeySuitability(
  aiState: JockeyAIState,
  jockey: Jockey,
  horse: Horse,
  stable: Stable,
): number {
  let score = 0;

  // Base score from jockey stats
  const avgStat =
    (jockey.stats.pacing +
      jockey.stats.positioning +
      jockey.stats.vigor +
      jockey.stats.gateSkill +
      jockey.stats.temperament) /
    5;
  score += avgStat * 0.3;
  score += jockey.stats.vigor * 0.2; // Final stretch push
  score += jockey.stats.positioning * 0.2; // Finding rail, avoiding traffic
  score += jockey.stats.pacing * 0.3; // Stamina management

  // Personality modifiers
  const factors: Record<string, number> = {
    jockey_skill: avgStat,
    jockey_aggressiveness: jockey.stats.vigor,
    horse_age: horse.age,
    horse_energy: horse.energy,
  };

  score = calculateUtilityScore(aiState.personalityState, "jockey_selection", factors);

  // Learning-based adjustment
  const contextKey = `${jockey.id}:${horse.age}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_selection", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 10;
  score += adaptiveBonus;

  return Math.max(0, Math.min(100, score));
}

/**
 * Select best jockey for a horse
 */
export function selectBestJockey(
  aiState: JockeyAIState,
  horse: Horse,
  availableJockeys: Jockey[],
  stable: Stable,
): Jockey | null {
  if (availableJockeys.length === 0) return null;

  const scoredJockeys = availableJockeys
    .map((jockey) => ({
      jockey,
      score: calculateJockeySuitability(aiState, jockey, horse, stable),
    }))
    .filter((j) => j.score > 50)
    .sort((a, b) => b.score - a.score);

  return scoredJockeys.length > 0 ? scoredJockeys[0].jockey : null;
}

/**
 * Calculate maximum jockey fee willing to pay
 */
export function calculateMaxJockeyFee(
  aiState: JockeyAIState,
  jockey: Jockey,
  horse: Horse,
  stable: Stable,
): number {
  let maxFee = jockey.ridingFee;

  // Personality-based willingness to pay
  const riskTolerance = aiState.personalityState.conservatism < 0.5 ? 1.3 : 0.9;
  maxFee *= riskTolerance;

  // Horse quality adjustment
  const horseQuality = (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration) / 3;
  if (horseQuality > 70) {
    maxFee *= 1.2; // Will pay more for quality horses
  }

  // Budget constraint (max 5% of cash per jockey fee)
  maxFee = Math.min(maxFee, stable.cash * 0.05);

  return Math.floor(maxFee);
}

/**
 * Determine if jockey should be retained
 */
export function shouldRetainJockey(
  aiState: JockeyAIState,
  jockey: Jockey,
  stable: Stable,
  currentDay: number,
): boolean {
  // Get jockey retention history
  const retention = aiState.retention.find(
    (r) => r.jockeyId === jockey.id && r.stableId === stable.id,
  );
  if (!retention) return true; // New jockey, retain by default

  // Calculate value metrics
  const daysSinceHire = currentDay - retention.hireDay;
  const daysSinceUse = currentDay - retention.lastUseDay;
  const avgPrizePerRide =
    retention.totalRides > 0 ? retention.totalPrize / retention.totalRides : 0;

  // Learning-based adjustment
  const contextKey = `${jockey.id}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_retention", contextKey);

  // Personality-based retention criteria
  const config = aiState.personalityState;
  let shouldRetain = true;

  // Conservative: retain if good performance
  if (config.personality === "conservative") {
    shouldRetain = avgPrizePerRide > 5000 && successRate > 0.4;
  }
  // Aggressive: retain if high skill or good recent performance
  else if (config.personality === "aggressive") {
    const avgSkill =
      (jockey.stats.pacing +
        jockey.stats.positioning +
        jockey.stats.vigor +
        jockey.stats.gateSkill +
        jockey.stats.temperament) /
      5;
    shouldRetain = avgSkill > 80 || avgPrizePerRide > 8000;
  }
  // Win-now: retain if recent wins
  else if (config.personality === "win-now") {
    shouldRetain = daysSinceUse < 30 && avgPrizePerRide > 10000;
  }
  // Default: retain if reasonable performance
  else {
    shouldRetain = avgPrizePerRide > 3000 && successRate > 0.3;
  }

  // Don't retain if not used recently (unless very high value)
  if (daysSinceUse > 90 && avgPrizePerRide < 10000) {
    shouldRetain = false;
  }

  return shouldRetain;
}

/**
 * Record jockey assignment for learning
 */
export function recordJockeyAssignment(
  aiState: JockeyAIState,
  jockey: Jockey,
  horse: Horse,
  raceId: string,
  stable: Stable,
  fee: number,
  currentDay: number,
): JockeyAIState {
  const assignment: JockeyAssignment = {
    jockeyId: jockey.id,
    horseId: horse.id,
    raceId,
    stableId: stable.id,
    day: currentDay,
    fee,
  };

  aiState.jockeyHistory.push(assignment);

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  if (aiState.jockeyHistory.length > maxHistory) {
    aiState.jockeyHistory = aiState.jockeyHistory.slice(-maxHistory);
  }

  // Update retention record
  let retention = aiState.retention.find(
    (r) => r.jockeyId === jockey.id && r.stableId === stable.id,
  );
  if (!retention) {
    retention = {
      jockeyId: jockey.id,
      stableId: stable.id,
      hireDay: currentDay,
      lastUseDay: currentDay,
      totalRides: 0,
      totalPrize: 0,
      retained: true,
    };
    aiState.retention.push(retention);
  }

  retention.lastUseDay = currentDay;
  retention.totalRides++;

  return aiState;
}

/**
 * Record jockey outcome for learning
 */
export function recordJockeyOutcome(
  aiState: JockeyAIState,
  jockeyId: string,
  horseId: string,
  raceId: string,
  position: number,
  prize: number,
  currentDay: number,
): JockeyAIState {
  // Find the assignment
  const assignment = aiState.jockeyHistory.find(
    (a) => a.jockeyId === jockeyId && a.horseId === horseId && a.raceId === raceId && !a.result,
  );

  if (assignment) {
    assignment.result = { position, prize };

    // Update retention record
    const retention = aiState.retention.find(
      (r) => r.jockeyId === jockeyId && r.stableId === assignment.stableId,
    );
    if (retention) {
      retention.totalPrize += prize;
    }

    // Update learning state
    const contextKey = `${jockeyId}`;
    const success = position <= 3; // Top 3 is success
    const value = prize - assignment.fee; // Net value
    aiState.learningState = recordOutcome(
      aiState.learningState,
      "jockey_selection",
      contextKey,
      success,
      value,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );
  }

  return aiState;
}

/**
 * Get jockey insights for a stable
 */
export function getJockeyInsights(
  aiState: JockeyAIState,
  stableId: string,
): {
  totalAssignments: number;
  avgPosition: number;
  totalPrize: number;
  avgFee: number;
  retainedJockeys: number;
} {
  const stableAssignments = aiState.jockeyHistory.filter(
    (a) => a.stableId === stableId && a.result,
  );
  const totalAssignments = stableAssignments.length;
  const avgPosition =
    totalAssignments > 0
      ? stableAssignments.reduce((sum, a) => sum + a.result!.position, 0) / totalAssignments
      : 5;
  const totalPrize =
    totalAssignments > 0 ? stableAssignments.reduce((sum, a) => sum + a.result!.prize, 0) : 0;
  const avgFee =
    totalAssignments > 0
      ? stableAssignments.reduce((sum, a) => sum + a.fee, 0) / totalAssignments
      : 0;

  const retainedJockeys = aiState.retention.filter(
    (r) => r.stableId === stableId && r.retained,
  ).length;

  return {
    totalAssignments,
    avgPosition,
    totalPrize,
    avgFee,
    retainedJockeys,
  };
}
