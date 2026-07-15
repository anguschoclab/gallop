/**
 * breedingAI.ts - Breeding AI system
 *
 * This file provides long-term breeding strategy, learning from outcomes,
 * and adaptive decision-making for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Stable, GameState), @/core/breeding/leaderboardTypes (Leaderboard), ./personalitySystem (getPersonalityAIState, recordOutcome), ./learningModule (getSuccessRate), @/core/breeding/strategy (scoreStallion, overallRating), @/core/genetics/breedingSimulator (runBreedingSimulation), @/core/genetics/genotypeCache (cachedSimulation), @/core/breeding/archetypes (getArchetypeById), @/core/breeding/programs (calculateGeneticDistance, BreedingProgram), @/game/rng (Rng)
 * Related files: npcCycleAI.ts (uses breeding AI), personalitySystem.ts (provides personality state)
 */

import type { Horse, Stable, GameState } from "@/game/types";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import { getPersonalityAIState, recordOutcome } from "./personalitySystem";
import { getSuccessRate } from "./learningModule";
import { scoreStallion } from "@/core/breeding/strategy";
import { calculateOverallRating } from "@/core/horse/stats";
import { runBreedingSimulation } from "@/core/genetics/breedingSimulator";
import { cachedSimulation } from "@/core/genetics/genotypeCache";
import { getArchetypeById, getTripleCrownKeysForArchetype } from "@/core/breeding/archetypes";
import { calculateGeneticDistance } from "@/core/breeding/programs";
import type { BreedingProgram } from "@/core/breeding/programs";
import { createRng, hashStr, type Rng } from "@/core/common/rng";

/**
 * Breeding AI System
 * Long-term breeding strategy, learning from outcomes, adaptive decision-making
 */

export interface BreedingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  breedingHistory: BreedingDecision[];
  activeProgram: BreedingProgram | null;
  programDistanceHistory: { season: number; distance: number }[];
  programSwitchCooldown: number;
}

export interface BreedingDecision {
  sireId: string;
  damId: string;
  sireName: string;
  damName: string;
  stableId: string;
  personality: Stable["personality"];
  day: number;
  score: number;
  tripleCrownSeries?: string; // Target triple crown series for this breeding
  outcome?: {
    foalId?: string;
    foalRating?: number;
    success: boolean;
    value: number;
    tripleCrownWin?: string; // Series key if foal won a triple crown leg
  };
}

/**
 * Create AI state for breeding decisions.
 *
 * Initializes the AI state with personality state, breeding history,
 * active program, program distance history, and cooldown.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized breeding AI state
 */
export function createBreedingAIState(stable: Stable): BreedingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    breedingHistory: [],
    activeProgram: null,
    programDistanceHistory: [],
    programSwitchCooldown: 0,
  };
}

/**
 * Calculate AI-enhanced stallion score.
 *
 * Combines traditional scoring with learning-based adjustments
 * and strategic planning based on breeding history.
 * Adds bonus for sires with progeny success in target triple crown series.
 *
 * @param aiState - Current breeding AI state
 * @param stallion - The stallion to evaluate
 * @param mare - The mare to evaluate
 * @param stable - The stable making the breeding decision
 * @param maxFee - Maximum stud fee allowed
 * @param leaderboards - Optional leaderboards for additional context
 * @returns Enhanced stallion score
 */
export function calculateAIStallionScore(
  aiState: BreedingAIState,
  stallion: Horse,
  mare: Horse,
  stable: Stable,
  maxFee: number,
  leaderboards?: Record<string, Leaderboard>,
): number {
  // Base score from traditional strategy
  let score = scoreStallion(stallion, mare, stable, maxFee, leaderboards);

  // Learning-based adjustment
  const contextKey = `${stallion.id}:${stable.personality}`;
  const successRate = getSuccessRate(
    aiState.personalityState.learningState,
    "breeding",
    contextKey,
  );
  const adaptiveBonus = (successRate - 0.5) * 20; // -10 to +10 based on learning
  score += adaptiveBonus;

  // Strategic planning adjustment based on breeding history
  const strategicBonus = calculateStrategicBreedingBonus(aiState, stallion, mare, stable);
  score += strategicBonus;

  // Series-specific success bonus for triple crown breeding
  if (stable.breedingArchetype) {
    const targetSeries = getTripleCrownKeysForArchetype(stable.breedingArchetype);
    const seriesSuccessBonus = targetSeries.reduce((bonus, tcKey) => {
      const successRate = getProgenyTripleCrownSuccess(aiState, stallion.id, tcKey);
      return bonus + successRate * 10; // Up to +10 per series
    }, 0);
    score += seriesSuccessBonus;
  }

  return score;
}

/**
 * Calculate strategic breeding bonus based on history.
 *
 * Analyzes breeding history to provide bonuses for proven sires and
 * historically successful crosses.
 *
 * @param aiState - Current breeding AI state
 * @param stallion - The stallion being evaluated
 * @param mare - The mare being evaluated
 * @param stable - The stable making the breeding decision
 * @returns Strategic breeding bonus (0-15)
 */
function calculateStrategicBreedingBonus(
  aiState: BreedingAIState,
  stallion: Horse,
  mare: Horse,
  stable: Stable,
): number {
  let bonus = 0;

  // Check if this stallion has been successful for this stable before
  const sireHistory = aiState.breedingHistory.filter(
    (d) => d.sireId === stallion.id && d.stableId === stable.id && d.outcome,
  );
  if (sireHistory.length > 0) {
    const avgSuccess =
      sireHistory.reduce((sum, d) => sum + (d.outcome?.success ? 1 : 0), 0) / sireHistory.length;
    bonus += (avgSuccess - 0.5) * 10; // Bonus for proven sires
  }

  // Check if similar crosses have been successful
  const similarCrosses = aiState.breedingHistory.filter(
    (d) => d.sireId === stallion.id && d.personality === stable.personality && d.outcome,
  );
  if (similarCrosses.length > 0) {
    const avgRating =
      similarCrosses.reduce((sum, d) => sum + (d.outcome?.foalRating || 0), 0) /
      similarCrosses.length;
    if (avgRating > 60) {
      bonus += 5; // Bonus for historically successful crosses
    }
  }

  return bonus;
}

/**
 * Record breeding decision for learning.
 *
 * Records the breeding decision and trims history to memory depth.
 *
 * @param aiState - Current breeding AI state
 * @param sireId - ID of the sire
 * @param damId - ID of the dam
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @param stableId - ID of the stable
 * @param personality - Stable personality
 * @param day - Current game day
 * @param score - Decision score
 * @param tripleCrownSeries - Optional target triple crown series
 * @returns Updated breeding AI state
 */
export function recordBreedingDecision(
  aiState: BreedingAIState,
  sireId: string,
  damId: string,
  sireName: string,
  damName: string,
  stableId: string,
  personality: Stable["personality"],
  day: number,
  score: number,
  tripleCrownSeries?: string,
): BreedingAIState {
  const decision: BreedingDecision = {
    sireId,
    damId,
    sireName,
    damName,
    stableId,
    personality,
    day,
    score,
    tripleCrownSeries,
  };

  const newHistory = [...aiState.breedingHistory, decision];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  return {
    ...aiState,
    breedingHistory: trimmedHistory,
  };
}

/**
 * Record breeding outcome for learning.
 *
 * Finds the matching breeding decision and records the outcome,
 * updating the personality state with the learning result.
 * Tracks triple crown wins by series for learning.
 *
 * @param aiState - Current breeding AI state
 * @param sireId - ID of the sire
 * @param damId - ID of the dam
 * @param foalId - ID of the resulting foal
 * @param foalRating - Rating of the foal
 * @param success - Whether the breeding was successful
 * @param currentDay - Current game day
 * @param tripleCrownWin - Optional series key if foal won a triple crown leg
 * @returns Updated breeding AI state
 */
export function recordBreedingOutcome(
  aiState: BreedingAIState,
  sireId: string,
  damId: string,
  foalId: string,
  foalRating: number,
  success: boolean,
  currentDay: number,
  tripleCrownWin?: string,
): BreedingAIState {
  // Find the decision
  const decisionIndex = aiState.breedingHistory.findIndex(
    (d) => d.sireId === sireId && d.damId === damId && !d.outcome,
  );

  if (decisionIndex !== -1) {
    const decision = {
      ...aiState.breedingHistory[decisionIndex],
      outcome: {
        foalId,
        foalRating,
        success,
        value: foalRating,
        tripleCrownWin,
      },
    };
    const newBreedingHistory = [...aiState.breedingHistory];
    newBreedingHistory[decisionIndex] = decision;

    // Update personality state (now handles learning internally)
    const newPersonalityState = recordOutcome(
      aiState.personalityState,
      "breeding",
      { sireId, personality: decision.personality },
      success,
      foalRating,
      currentDay,
    );

    // If foal won a triple crown leg, record series-specific learning
    if (tripleCrownWin && decision.tripleCrownSeries) {
      const contextKey = { tripleCrownSeries: tripleCrownWin };
      // Use personality state's learning module to record series-specific outcome
      const seriesSuccess = decision.tripleCrownSeries === tripleCrownWin;
      const newPersonalityStateWithSeries = recordOutcome(
        newPersonalityState,
        "breeding",
        contextKey,
        seriesSuccess,
        foalRating,
        currentDay,
      );

      return {
        ...aiState,
        breedingHistory: newBreedingHistory,
        personalityState: newPersonalityStateWithSeries,
      };
    }

    return {
      ...aiState,
      breedingHistory: newBreedingHistory,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

/**
 * Get breeding insights for a stable.
 *
 * Calculates breeding statistics including success rate,
 * average foal rating, and top performing sires.
 *
 * @param aiState - Current breeding AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with breeding statistics and top sires
 */
export function getBreedingInsights(
  aiState: BreedingAIState,
  stableId: string,
): {
  totalDecisions: number;
  successRate: number;
  avgFoalRating: number;
  topSires: Array<{ sireId: string; sireName: string; successRate: number; count: number }>;
} {
  const stableHistory = aiState.breedingHistory.filter((d) => d.stableId === stableId && d.outcome);
  const totalDecisions = stableHistory.length;
  const successes = stableHistory.filter((d) => d.outcome?.success).length;
  const successRate = totalDecisions > 0 ? successes / totalDecisions : 0.5;
  const avgFoalRating =
    totalDecisions > 0
      ? stableHistory.reduce((sum, d) => sum + (d.outcome?.foalRating || 0), 0) / totalDecisions
      : 0;

  // Group by sire
  const sireMap: Record<string, { count: number; successes: number; name: string }> = {};
  for (const decision of stableHistory) {
    const existing = sireMap[decision.sireId] || {
      count: 0,
      successes: 0,
      name: decision.sireName,
    };
    sireMap[decision.sireId] = {
      count: existing.count + 1,
      successes: existing.successes + (decision.outcome?.success ? 1 : 0),
      name: decision.sireName,
    };
  }

  const topSires = Object.entries(sireMap)
    .map(([sireId, data]) => ({
      sireId,
      sireName: data.name,
      successRate: data.count > 0 ? data.successes / data.count : 0,
      count: data.count,
    }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return {
    totalDecisions,
    successRate,
    avgFoalRating,
    topSires,
  };
}

/**
 * Get progeny triple crown success rate for a sire in a specific series.
 *
 * Returns the success rate of a sire's progeny in a specific triple crown series.
 *
 * @param aiState - Current breeding AI state
 * @param sireId - ID of the sire
 * @param tcKey - Triple crown series key
 * @returns Success rate (0-1)
 */
export function getProgenyTripleCrownSuccess(
  aiState: BreedingAIState,
  sireId: string,
  tcKey: string,
): number {
  const sireHistory = aiState.breedingHistory.filter(
    (d) => d.sireId === sireId && d.outcome && d.outcome.tripleCrownWin,
  );

  if (sireHistory.length === 0) return 0.5; // Default neutral

  const seriesWins = sireHistory.filter((d) => d.outcome?.tripleCrownWin === tcKey).length;
  return seriesWins / sireHistory.length;
}

/**
 * Adapt breeding strategy based on learning outcomes.
 *
 * Adjusts strategy confidence based on breeding success rate. Decreases confidence
 * if success rate is low (< 0.4), increases if high (> 0.7).
 *
 * @param aiState - Current breeding AI state
 * @param currentDay - Current game day
 * @returns Updated breeding AI state
 */
export function adaptBreedingStrategy(
  aiState: BreedingAIState,
  currentDay: number,
): BreedingAIState {
  const insights = getBreedingInsights(aiState, aiState.breedingHistory[0]?.stableId || "");
  if (insights.totalDecisions > 10) {
    if (insights.successRate < 0.4) {
      return {
        ...aiState,
        personalityState: {
          ...aiState.personalityState,
          strategyConfidence: Math.max(0.3, aiState.personalityState.strategyConfidence - 0.05),
        },
      };
    } else if (insights.successRate > 0.7) {
      return {
        ...aiState,
        personalityState: {
          ...aiState.personalityState,
          strategyConfidence: Math.min(1.0, aiState.personalityState.strategyConfidence + 0.05),
        },
      };
    }
  }

  return aiState;
}

/**
 * Select sire for dam using breeding simulator if stable has breeding program.
 *
 * Uses breeding simulator to find the sire that produces foals closest to the
 * stable's breeding archetype. Falls back to traditional scoring if no breeding
 * program or simulation shows poor match.
 *
 * @param dam - The mare to breed
 * @param candidateSires - Array of candidate sires
 * @param stable - The stable making the breeding decision
 * @param gameState - Current game state
 * @param rng - Random number generator
 * @returns Selected sire or null if no suitable sire found
 */
export function selectSireForDam(
  dam: Horse,
  candidateSires: Horse[],
  stable: Stable,
  gameState: GameState,
  rng: Rng,
): Horse | null {
  // If stable has a breeding program, use breeding simulator
  if (stable.breedingArchetype) {
    const archetype = getArchetypeById(stable.breedingArchetype);
    if (!archetype) {
      // Fall back to traditional scoring if archetype not found
      return selectSireByTraditionalScoring(dam, candidateSires, stable, gameState);
    }

    let bestSire: Horse | null = null;
    let bestDistance = 1.0;

    for (const sire of candidateSires) {
      // Run a quick sim to get a representative foal, then measure archetype distance
      const simulation = cachedSimulation(sire.id, dam.id, () => {
        const simRng = createRng(hashStr(`breeding-sim:${sire.id}:${dam.id}`));
        return runBreedingSimulation(sire, dam, gameState, simRng);
      });
      // Build a synthetic horse from the simulation median stats to measure distance
      const syntheticFoal = {
        stats: {
          speed: simulation.stats.speed.p75,
          stamina: simulation.stats.stamina.p75,
          acceleration: simulation.stats.acceleration.p75,
          consistency: simulation.stats.consistency.p75,
        },
      } as unknown as Horse; // Synthetic partial object for distance calculation - only stats needed

      const distance = calculateGeneticDistance(syntheticFoal, archetype);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSire = sire;
      }
    }

    if (bestSire && bestDistance < 0.5) {
      return bestSire;
    }
  }

  // Fall back to traditional scoring
  return selectSireByTraditionalScoring(dam, candidateSires, stable, gameState);
}

/**
 * Select sire using traditional scoring (fallback when breeding program not applicable).
 *
 * Selects the sire with the highest overall rating from candidate sires.
 * Used as a fallback when breeding program simulation is not applicable.
 *
 * @param dam - The mare to breed
 * @param candidateSires - Array of candidate sires
 * @param stable - The stable making the breeding decision
 * @param gameState - Current game state
 * @returns Selected sire or null if no candidates
 */
function selectSireByTraditionalScoring(
  dam: Horse,
  candidateSires: Horse[],
  stable: Stable,
  gameState: GameState,
): Horse | null {
  if (candidateSires.length === 0) return null;

  // Simple scoring based on overall rating
  const scored = candidateSires.map((sire) => ({
    sire,
    score: calculateOverallRating(sire),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].sire;
}
