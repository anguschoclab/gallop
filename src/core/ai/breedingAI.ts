/**
 * breedingAI.ts - Breeding AI system (orchestrator)
 *
 * Provides types, state creation, and stallion scoring.
 * Recording/insights extracted to: breedingRecording.ts.
 * Sire selection/evaluation extracted to: breedingSelection.ts.
 *
 * Dependencies: @/game/types, @/core/breeding/leaderboardTypes, ./personalitySystem, ./learningModule, @/core/breeding/strategy, @/core/breeding/archetypes, @/core/breeding/programs
 * Related files: breedingRecording.ts, breedingSelection.ts
 */

import type { Horse, Stable } from "@/game/types";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import { getPersonalityAIState } from "./personalitySystem";
import { getSuccessRate } from "./learningModule";
import { scoreStallion } from "@/core/breeding/strategy";
import { getTripleCrownKeysForArchetype } from "@/core/breeding/archetypes";
import type { BreedingProgram } from "@/core/breeding/programs";

// Re-exports for backward compatibility
export {
  recordBreedingDecision,
  recordBreedingOutcome,
  getBreedingInsights,
  adaptBreedingStrategy,
} from "./breedingRecording";
export {
  selectSireForDam,
  evaluateMareRetirement,
  getBreedingMarketTiming,
  hasSyndicateShare,
  applySyndicatePreference,
  assessGeneticDiversity,
} from "./breedingSelection";

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
  tripleCrownSeries?: string;
  outcome?: {
    foalId?: string;
    foalRating?: number;
    success: boolean;
    value: number;
    tripleCrownWin?: string;
  };
}

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
 * Get progeny triple crown success rate for a sire in a specific series.
 *
 * @param aiState - Breeding AI state
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
