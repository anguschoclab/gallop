import type { Horse, Stable, GameState } from "@/game/types";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import { getPersonalityAIState, recordOutcome } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome as recordLearningOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";
import { scoreStallion, overallRating } from "@/core/breeding/strategy";
import { runBreedingSimulation } from "@/core/genetics/breedingSimulator";
import { cachedSimulation } from "@/core/genetics/genotypeCache";
import { getArchetypeById } from "@/core/breeding/archetypes";
import { calculateGeneticDistance } from "@/core/breeding/programs";
import type { BreedingProgram } from "@/core/breeding/programs";
import type { Rng } from "@/game/rng";

/**
 * Breeding AI System
 * Long-term breeding strategy, learning from outcomes, adaptive decision-making
 */

export interface BreedingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
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
  outcome?: {
    foalId?: string;
    foalRating?: number;
    success: boolean;
    value: number;
  };
}

/**
 * Create AI state for breeding decisions
 */
export function createBreedingAIState(stable: Stable): BreedingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    breedingHistory: [],
    activeProgram: null,
    programDistanceHistory: [],
    programSwitchCooldown: 0,
  };
}

/**
 * Calculate AI-enhanced stallion score
 * Combines traditional scoring with learning-based adjustments
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
  const successRate = getSuccessRate(aiState.learningState, "breeding", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20; // -10 to +10 based on learning
  score += adaptiveBonus;

  // Strategic planning adjustment based on breeding history
  const strategicBonus = calculateStrategicBreedingBonus(aiState, stallion, mare, stable);
  score += strategicBonus;

  return score;
}

/**
 * Calculate strategic breeding bonus based on history
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
 * Record breeding decision for learning
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
  };

  const newHistory = [...aiState.breedingHistory, decision];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  return {
    ...aiState,
    breedingHistory: trimmedHistory,
  };
}

/**
 * Record breeding outcome for learning
 */
export function recordBreedingOutcome(
  aiState: BreedingAIState,
  sireId: string,
  damId: string,
  foalId: string,
  foalRating: number,
  success: boolean,
  currentDay: number,
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
      },
    };
    const newBreedingHistory = [...aiState.breedingHistory];
    newBreedingHistory[decisionIndex] = decision;

    // Update learning state
    const contextKey = `${sireId}:${decision.personality}`;
    const newLearningState = recordLearningOutcome(
      aiState.learningState,
      "breeding",
      contextKey,
      success,
      foalRating,
      Date.now(),
      currentDay,
      aiState.personalityState.memoryDepth,
    );

    // Update personality state
    const newPersonalityState = recordOutcome(
      aiState.personalityState,
      "breeding",
      { sireId, personality: decision.personality },
      success,
      foalRating,
      Date.now(),
    );

    return {
      ...aiState,
      breedingHistory: newBreedingHistory,
      learningState: newLearningState,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}

/**
 * Get breeding insights for a stable
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
 * Adapt breeding strategy based on learning outcomes
 */
export function adaptBreedingStrategy(
  aiState: BreedingAIState,
  currentDay: number,
): BreedingAIState {
  // Adjust strategy confidence based on success
  const insights = getBreedingInsights(aiState, aiState.breedingHistory[0]?.stableId || "");
  if (insights.totalDecisions > 10) {
    if (insights.successRate < 0.4) {
      aiState.personalityState.strategyConfidence = Math.max(
        0.3,
        aiState.personalityState.strategyConfidence - 0.05,
      );
    } else if (insights.successRate > 0.7) {
      aiState.personalityState.strategyConfidence = Math.min(
        1.0,
        aiState.personalityState.strategyConfidence + 0.05,
      );
    }
  }

  return aiState;
}

/**
 * Select sire for dam using breeding simulator if stable has breeding program
 * Falls back to traditional scoring if no breeding program or simulation shows poor match
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
      const simulation = cachedSimulation(sire.id, dam.id, () =>
        runBreedingSimulation(sire, dam, gameState, rng),
      );
      // Build a synthetic horse from the simulation median stats to measure distance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const syntheticFoal: any = {
        stats: {
          speed: simulation.stats.speed.p75,
          stamina: simulation.stats.stamina.p75,
          acceleration: simulation.stats.acceleration.p75,
          consistency: simulation.stats.consistency.p75,
        },
      }; // Synthetic object for distance calculation, not a real horse

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
 * Select sire using traditional scoring (fallback when breeding program not applicable)
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
a.score);
  return scored[0].sire;
}
