/**
 * jockeyAI.ts - Jockey AI system
 *
 * This file provides personality-driven jockey selection, retention,
 * and contract negotiation for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Jockey, Stable), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), @/core/horse/stats (calculateRaceRating), ./learningModule (learning functions)
 * Related files: npcCycleAI.ts (uses jockey AI), personalitySystem.ts (provides personality state)
 */

/**
 * Jockey AI System
 * Personality-driven jockey selection, retention, and contract negotiation
 */

import type { Horse, Stable, Race } from "@/game/types";
import type { Jockey } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import { calculateRaceRating } from "@/core/horse/stats";
import { getCompatibility } from "@/core/jockey/compatibility";
import { createLearningState, getSuccessRate, type LearningState } from "./learningModule";

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
 * Create AI state for jockey decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * jockey history, and retention records.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized jockey AI state
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
 * Calculate jockey suitability score for a horse.
 *
 * Evaluates jockey suitability based on stats, personality modifiers,
 * and learning-based adjustments.
 *
 * @param aiState - Current jockey AI state
 * @param jockey - The jockey to evaluate
 * @param horse - The horse to evaluate
 * @param stable - The stable making the decision
 * @param race - Optional race context for trait-based bonuses
 * @returns Jockey suitability score (0-100)
 */
export function calculateJockeySuitability(
  aiState: JockeyAIState,
  jockey: Jockey,
  horse: Horse | undefined,
  stable: Stable,
  race?: Race,
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
    horse_age: horse?.age ?? 4,
    horse_energy: horse?.energy ?? 100,
  };

  score = calculateUtilityScore(aiState.personalityState, "jockey_selection", factors);

  // Learning-based adjustment
  const contextKey = `${jockey.id}:${horse?.age ?? 4}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_selection", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 10;
  score += adaptiveBonus;

  // Trait-based bonuses when race context is available
  if (race) {
    const traits = jockey.traits ?? [];
    const surface = race.surface;
    const distance = race.distance;
    const fieldSize = race.entries.length || race.fieldSize;
    const trackCondition = race.trackCondition;
    const weather = race.weather;

    // Surface specialists
    if (surface === "Turf" && traits.includes("turf_specialist")) {
      score += 8;
    }
    if (surface === "Dirt" && traits.includes("dirt_specialist")) {
      score += 8;
    }

    // Distance specialists
    if (distance < 1400 && traits.includes("sprint_specialist")) {
      score += 8;
    }
    if (distance > 2200 && traits.includes("staying_specialist")) {
      score += 8;
    }

    // Mud master on wet/heavy tracks
    if (
      traits.includes("mud_master") &&
      (trackCondition === "heavy" ||
        trackCondition === "soft" ||
        trackCondition === "yielding" ||
        weather === "rainy")
    ) {
      score += 8;
    }

    // Big match temperament in large fields
    if (traits.includes("big_match_temperament") && fieldSize > 12) {
      score += 6;
    }

    // Gate master for front-running horses
    if (traits.includes("gate_master") && horse?.runningStyle === "E") {
      score += 5;
    }

    // Closer instinct for stalking/closing horses
    if (
      traits.includes("closer_instinct") &&
      (horse?.runningStyle === "S" || horse?.runningStyle === "P")
    ) {
      score += 5;
    }

    // Pace presser for presser horses
    if (traits.includes("pace_presser") && horse?.runningStyle === "EP") {
      score += 5;
    }

    // Veteran poise for experienced jockeys
    if (traits.includes("veteran_poise") && jockey.age >= 35) {
      score += 4;
    }
  }

  // Affinity bonus: jockeys with existing horse relationships score higher
  if (horse) {
    score += Math.min((jockey.affinityMap?.[horse.id] ?? 0) / 10, 15);

    // Compatibility bonus: archetype/trait match with horse running style
    const compat = getCompatibility(horse, jockey);
    if (compat === "High") score += 10;
    else if (compat === "Good") score += 5;
    else if (compat === "Poor") score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Select best jockey for a horse.
 *
 * Evaluates all available jockeys and returns the one with the
 * highest suitability score.
 *
 * @param aiState - Current jockey AI state
 * @param horse - The horse to select jockey for
 * @param availableJockeys - List of available jockeys
 * @param stable - The stable making the decision
 * @param race - Optional race context for trait-based selection
 * @returns Best jockey or null if no suitable jockey found
 */
export function selectBestJockey(
  aiState: JockeyAIState,
  horse: Horse | undefined,
  availableJockeys: Jockey[],
  stable: Stable,
  race?: Race,
): Jockey | null {
  if (availableJockeys.length === 0) return null;

  const scoredJockeys = availableJockeys
    .map((jockey) => ({
      jockey,
      score: calculateJockeySuitability(aiState, jockey, horse, stable, race),
    }))
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredJockeys.length > 0 ? scoredJockeys[0].jockey : null;
}

/**
 * Calculate maximum jockey fee willing to pay.
 *
 * Determines the maximum fee based on personality risk tolerance,
 * horse quality, and budget constraints.
 *
 * @param aiState - Current jockey AI state
 * @param jockey - The jockey to evaluate
 * @param horse - The horse being raced
 * @param stable - The stable making the decision
 * @returns Maximum jockey fee willing to pay
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
  const horseQuality = calculateRaceRating(horse);
  if (horseQuality > 70) {
    maxFee *= 1.2; // Will pay more for quality horses
  }

  // Budget constraint (max 5% of cash per jockey fee)
  maxFee = Math.min(maxFee, stable.cash * 0.05);

  return Math.floor(maxFee);
}

// Retention, recording, and insights extracted to jockeyAIRetention.ts
export {
  shouldRetainJockey,
  recordJockeyAssignment,
  recordJockeyOutcome,
  getJockeyInsights,
} from "./jockeyAIRetention";
