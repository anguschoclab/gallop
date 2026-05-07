/**
 * Training AI System
 * Personality-driven training priorities with learning from effectiveness
 */

import type { Horse, Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";

export interface TrainingAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  horseDevelopment: Map<string, HorseTrainingTrack>;
}

export interface HorseTrainingTrack {
  horseId: string;
  targetStats: Array<"speed" | "stamina" | "acceleration">;
  currentFocus: "speed" | "stamina" | "acceleration" | "balanced";
  trainingHistory: TrainingSession[];
  statGains: Map<string, number>;
  lastTrainingDay: number;
}

export interface TrainingSession {
  day: number;
  type: string;
  energyBefore: number;
  energyAfter: number;
}

/**
 * Create AI state for training decisions
 */
export function createTrainingAIState(stable: Stable): TrainingAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    horseDevelopment: new Map(),
  };
}

/**
 * Calculate training priority score for a horse and stat
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
  const avgStat = (stats.speed + stats.stamina + stats.acceleration) / 3;
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
  const devTrack = aiState.horseDevelopment.get(horse.id);
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
 * Select optimal training type for a horse
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
 * Update horse development tracking after training
 */
export function updateHorseTraining(
  aiState: TrainingAIState,
  horse: Horse,
  trainingType: string,
  energyBefore: number,
  currentDay: number,
): TrainingAIState {
  const devTrack: HorseTrainingTrack = aiState.horseDevelopment.get(horse.id) || {
    horseId: horse.id,
    targetStats: [],
    currentFocus: "balanced",
    trainingHistory: [] as TrainingSession[],
    statGains: new Map(),
    lastTrainingDay: 0,
  };

  // Add training to history
  devTrack.trainingHistory.push({
    day: currentDay,
    type: trainingType,
    energyBefore,
    energyAfter: horse.energy,
  });

  // Trim history to last 10 trainings
  if (devTrack.trainingHistory.length > 10) {
    devTrack.trainingHistory = devTrack.trainingHistory.slice(-10);
  }

  // Update focus based on recent training
  const recentTrainings = devTrack.trainingHistory.slice(-3);
  const typeCounts = recentTrainings.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantType && typeCounts[dominantType[0]] >= 2) {
    devTrack.currentFocus = dominantType[0] as "speed" | "stamina" | "acceleration" | "balanced";
  }

  devTrack.lastTrainingDay = currentDay;
  aiState.horseDevelopment.set(horse.id, devTrack);

  return aiState;
}

/**
 * Record training outcome for learning
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
  aiState.learningState = recordOutcome(
    aiState.learningState,
    "training",
    contextKey,
    success,
    statGain,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  // Update stat gains in development track
  const devTrack = aiState.horseDevelopment.get(horse.id);
  if (devTrack) {
    const currentGain = devTrack.statGains.get(trainingType) || 0;
    devTrack.statGains.set(trainingType, currentGain + statGain);
    aiState.horseDevelopment.set(horse.id, devTrack);
  }

  return aiState;
}

/**
 * Determine if horse should be trained today
 */
export function shouldTrainToday(
  aiState: TrainingAIState,
  horse: Horse,
  currentDay: number,
): boolean {
  // Basic energy check
  if (horse.energy < 15) return false;

  // Check training frequency (personality-driven)
  const devTrack = aiState.horseDevelopment.get(horse.id);
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
