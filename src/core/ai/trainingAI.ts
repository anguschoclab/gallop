/**
 * trainingAI.ts - Training AI system
 *
 * This file provides personality-driven training priorities with learning
 * from effectiveness for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Stable), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), ./learningModule (learning functions)
 * Related files: npcCycleAI.ts (uses training AI), personalitySystem.ts (provides personality state)
 */

/**
 * Training AI System
 * Personality-driven training priorities with learning from effectiveness
 */

import type { Horse, Stable } from "@/game/types";
import { TRAINING_HISTORY_MAX_SIZE } from "@/constants/game";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome as recordLearningOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";
import { calculateRaceRating } from "@/core/horse/stats";

export interface TrainingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  horseDevelopment: Record<string, HorseTrainingTrack>;
}

export interface HorseTrainingTrack {
  horseId: string;
  targetStats: Array<"speed" | "stamina" | "acceleration">;
  currentFocus: "speed" | "stamina" | "acceleration" | "balanced";
  trainingHistory: TrainingSession[];
  statGains: Record<string, number>;
  lastTrainingDay: number;
}

export interface TrainingSession {
  day: number;
  type: string;
  energyBefore: number;
  energyAfter: number;
}

/**
 * Create AI state for training decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * and horse development tracking.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized training AI state
 */
export function createTrainingAIState(stable: Stable): TrainingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    horseDevelopment: {},
  };
}

/**
 * Calculate training priority score for a horse and stat.
 *
 * Evaluates the priority of training a specific stat based on deficiency,
 * personality modifiers, learning-based adjustments, and strategic considerations.
 *
 * @param aiState - Current training AI state
 * @param horse - The horse to evaluate
 * @param stat - The stat to prioritize (speed, stamina, or acceleration)
 * @param currentDay - Current game day
 * @returns Training priority score
 */
export function calculateTrainingPriority(
  aiState: TrainingAIState,
  horse: Horse,
  stat: "speed" | "stamina" | "acceleration",
  currentDay: number,
): number {
  const config = aiState.personalityState;
  let score = 0;

  // Base score based on stat deficiency
  const stats = horse.stats;
  const statValue = stats[stat];
  const avgStat = calculateRaceRating(horse);
  const deficiency = avgStat - statValue;
  score += deficiency * 2; // Higher priority for lower stats

  // Personality modifiers
  const factors: Record<string, number> = {
    stat_deficiency: deficiency,
    energy: horse.energy,
    age: horse.age,
  };

  score = calculateUtilityScore(aiState.personalityState, "training", factors);

  // Learning-based adjustment
  const contextKey = `${horse.age}:${stat}`;
  const successRate = getSuccessRate(aiState.learningState, "training", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 10;
  score += adaptiveBonus;

  // Strategic considerations
  const devTrack = aiState.horseDevelopment[horse.id];
  if (devTrack) {
    // Bonus for training focused stat
    if (devTrack.currentFocus === stat) {
      score += 15;
    }
    // Bonus for target stats
    if (devTrack.targetStats.includes(stat)) {
      score += 10;
    }
  }

  return Math.max(0, score);
}

/**
 * Select optimal training type for a horse.
 *
 * Calculates priority scores for all stats and returns the stat
 * with the highest priority.
 *
 * @param aiState - Current training AI state
 * @param horse - The horse to select training for
 * @param currentDay - Current game day
 * @returns Optimal training type (speed, stamina, or acceleration)
 */
export function selectTrainingType(
  aiState: TrainingAIState,
  horse: Horse,
  currentDay: number,
): "speed" | "stamina" | "acceleration" {
  const scores = {
    speed: calculateTrainingPriority(aiState, horse, "speed", currentDay),
    stamina: calculateTrainingPriority(aiState, horse, "stamina", currentDay),
    acceleration: calculateTrainingPriority(aiState, horse, "acceleration", currentDay),
  };

  // Select highest priority stat
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as
    | "speed"
    | "stamina"
    | "acceleration";
}

/**
 * Update horse development tracking after training.
 *
 * Records the training session, updates training history,
 * and adjusts the current focus based on recent training patterns.
 *
 * @param aiState - Current training AI state
 * @param horse - The horse being trained
 * @param trainingType - Type of training performed
 * @param energyBefore - Energy level before training
 * @param currentDay - Current game day
 * @returns Updated training AI state
 */
export function updateHorseTraining(
  aiState: TrainingAIState,
  horse: Horse,
  trainingType: string,
  energyBefore: number,
  currentDay: number,
): TrainingAIState {
  const devTrack: HorseTrainingTrack = aiState.horseDevelopment[horse.id] || {
    horseId: horse.id,
    targetStats: [],
    currentFocus: "balanced",
    trainingHistory: [] as TrainingSession[],
    statGains: {},
    lastTrainingDay: 0,
  };

  // Add training to history
  const newHistory = [
    ...devTrack.trainingHistory,
    {
      day: currentDay,
      type: trainingType,
      energyBefore,
      energyAfter: horse.energy,
    },
  ];

  // Trim history to last 10 trainings1010
  const trimmedHistory = newHistory.length > 10 ? newHistory.slice(-10) : newHistory;

  // Update focus based on recent training
  const recentTrainings = trimmedHistory.slice(-3);
  const typeCounts = recentTrainings.reduce(
    (acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  let newFocus = devTrack.currentFocus;
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantType && typeCounts[dominantType[0]] >= 2) {
    newFocus = dominantType[0] as "speed" | "stamina" | "acceleration" | "balanced";
  }

  const updatedDevTrack = {
    ...devTrack,
    trainingHistory: trimmedHistory,
    currentFocus: newFocus,
    lastTrainingDay: currentDay,
  };

  return {
    ...aiState,
    horseDevelopment: {
      ...aiState.horseDevelopment,
      [horse.id]: updatedDevTrack,
    },
  };
}

/**
 * Record training outcome for learning.
 *
 * Records the training outcome in the learning state and updates
 * stat gains in the development track.
 *
 * @param aiState - Current training AI state
 * @param horse - The horse that was trained
 * @param trainingType - Type of training performed
 * @param success - Whether the training was successful
 * @param statGain - Amount of stat gain from training
 * @param currentDay - Current game day
 * @returns Updated training AI state
 */
export function recordTrainingOutcome(
  aiState: TrainingAIState,
  horse: Horse,
  trainingType: string,
  success: boolean,
  statGain: number,
  currentDay: number,
): TrainingAIState {
  const contextKey = `${horse.age}:${trainingType}`;
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "training",
    contextKey,
    success,
    statGain,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  // Update stat gains in development track
  const devTrack = aiState.horseDevelopment[horse.id];
  if (devTrack) {
    const currentGain = devTrack.statGains[trainingType] || 0;
    const updatedDevTrack = {
      ...devTrack,
      statGains: {
        ...devTrack.statGains,
        [trainingType]: currentGain + statGain,
      },
    };
    return {
      ...aiState,
      learningState: newLearningState,
      horseDevelopment: {
        ...aiState.horseDevelopment,
        [horse.id]: updatedDevTrack,
      },
    };
  }

  return {
    ...aiState,
    learningState: newLearningState,
  };
}

/**
 * Determine if horse should be trained today.
 *
 * Checks energy levels and training frequency based on personality
 * to determine if training should occur.
 *
 * @param aiState - Current training AI state
 * @param horse - The horse to evaluate
 * @param currentDay - Current game day
 * @returns True if horse should be trained today
 */
export function shouldTrainToday(
  aiState: TrainingAIState,
  horse: Horse,
  currentDay: number,
): boolean {
  // Basic energy check
  if (horse.energy < 15) return false;

  // Check training frequency (personality-driven)
  const devTrack = aiState.horseDevelopment[horse.id];
  if (devTrack) {
    const daysSinceTraining = currentDay - devTrack.lastTrainingDay;
    const config = aiState.personalityState;

    // Aggressive personalities train more frequently
    const minDaysBetween =
      config.personality === "aggressive" || config.personality === "win-now"
        ? 3
        : config.personality === "conservative"
          ? 7
          : 5;

    if (daysSinceTraining < minDaysBetween) return false;
  }

  return true;
}
