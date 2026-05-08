/**
 * Race Entry AI System
 * Multi-factor race selection, field analysis, and budget management
 */

import type { Horse, Race, Stable } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  getAdaptiveThreshold,
  type LearningState,
} from "./learningModule";
import { calculateOverallRating } from "@/core/horse/stats";
import { applyPersonalityModifiers } from "@/core/stable/personalityModifiers";

export interface RaceEntryAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  entryHistory: EntryDecision[];
  horseDevelopment: Record<string, HorseDevelopmentTrack>;
  budgetAllocation: Record<string, number>; // raceId -> budget
}

export interface EntryDecision {
  horseId: string;
  raceId: string;
  expectedPosition: number;
  actualPosition?: number;
  stableId: string;
  day: number;
  success?: boolean;
}

export interface HorseDevelopmentTrack {
  horseId: string;
  classLevel: string;
  targetGrade: string;
  lastRaceDay: number;
  formTrend: number[];
  projectedPeak: number;
}

/**
 * Create AI state for race entry decisions
 */
export function createRaceEntryAIState(stable: Stable): RaceEntryAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    entryHistory: [],
    horseDevelopment: {},
    budgetAllocation: {},
  };
}

/**
 * Calculate race suitability score for a horse
 */
export function calculateRaceSuitability(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): number {
  let score = 0;

  // Distance fit
  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff < 200) score += 30;
  else if (distDiff < 400) score += 15;

  // Surface fit
  if (race.surface && horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"]) {
    score += horse.surfaceAptitude[race.surface as "Turf" | "Dirt" | "Synthetic"] * 20;
  }

  // Energy check
  if (horse.energy < 40) return 0;
  score += (horse.energy - 40) / 2;

  // Personality modifiers
  score = applyPersonalityModifiers(score, horse, race, stable);

  // Learning-based adjustment
  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const successRate = getSuccessRate(aiState.learningState, "race_entry", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20; // -10 to +10 based on learning
  score += adaptiveBonus;

  // Strategic planning adjustment
  const strategicValue = evaluateStrategicValue(aiState, horse, race, currentDay);
  score += strategicValue;

  return Math.max(0, score);
}

/**
 * Evaluate strategic value of entering a race
 * Considers long-term goals, horse development, and competitive positioning
 */
function evaluateStrategicValue(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
): number {
  let strategicValue = 0;

  // Check if race aligns with horse development plan
  const devTrack = aiState.horseDevelopment[horse.id];
  if (devTrack) {
    // Bonus for races that advance development goals
    if (race.graded?.grade === devTrack.targetGrade) {
      strategicValue += 15;
    }

    // Check if horse is approaching projected peak
    const daysToPeak = devTrack.projectedPeak - currentDay;
    if (daysToPeak >= 0 && daysToPeak <= 60) {
      strategicValue += 10; // Bonus for targeting peak form
    }
  }

  return strategicValue;
}

/**
 * Determine optimal race entry strategy for a stable's roster
 */
export function determineEntryStrategy(
  aiState: RaceEntryAIState,
  stableHorses: Horse[],
  upcomingRaces: Race[],
  stable: Stable,
  currentDay: number,
): Record<string, string[]> {
  const strategy: Record<string, string[]> = {}; // raceId -> horseIds

  for (const race of upcomingRaces) {
    if (race.entries.length >= race.fieldSize) continue;

    const candidates = stableHorses
      .map((horse) => ({
        horse,
        score: calculateRaceSuitability(aiState, horse, race, stable, currentDay),
      }))
      .filter((c) => c.score > 60)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const selected = candidates.slice(0, 2).map((c) => c.horse.id);
      strategy[race.id] = selected;
    }
  }

  return strategy;
}

/**
 * Record race entry for learning
 */
export function recordEntryDecision(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  expectedPosition: number,
  currentDay: number,
): RaceEntryAIState {
  const decision: EntryDecision = {
    horseId: horse.id,
    raceId: race.id,
    expectedPosition,
    stableId: horse.stableId!,
    day: currentDay,
  };

  const newHistory = [...aiState.entryHistory, decision];

  // Trim history
  const maxHistory = aiState.personalityState.memoryDepth;
  if (newHistory.length > maxHistory) {
    newHistory.splice(0, newHistory.length - maxHistory);
  }

  return {
    ...aiState,
    entryHistory: newHistory,
  };
}
