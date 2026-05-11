/**
 * raceEntryAI.ts - Race entry AI system
 *
 * This file provides strategic race entry system with long-term race schedule
 * planning, horse development tracking, and multi-race strategy optimization.
 *
 * Dependencies: @/game/types (Horse, Race, Stable), ./personalitySystem (getPersonalityAIState), ./learningModule (learning functions), @/core/race/entryScoring (calculateRaceSuitability), @/core/race/trackGeometry (calculateTrackGeometryScore, calculateGradientScore), @/core/stable/personalityModifiers (applyPersonalityModifiers)
 * Related files: npcCycleAI.ts (uses race entry AI), personalitySystem.ts (provides personality state)
 */

import type { Horse, Race, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { RECENT_RACES_MAX_COUNT } from "@/game/constants/gameConstants";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { calculateTrackGeometryScore, calculateGradientScore } from "@/core/race/trackGeometry";
import { applyPersonalityModifiers } from "@/core/stable/personalityModifiers";

/**
 * Strategic Race Entry System
 * Long-term race schedule planning, horse development tracking, multi-race strategy optimization
 */

export interface RaceEntryAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  strategicPlan: StrategicPlan;
}

export interface StrategicPlan {
  targetRaces: Array<{
    raceId: string;
    day: number;
    priority: number;
    horseId?: string;
  }>;
  horseDevelopment: Record<string, HorseDevelopmentTrack>;
  budgetAllocation: Record<string, number>; // raceId -> budget
}

export interface HorseDevelopmentTrack {
  horseId: string;
  targetGrade: string;
  currentProgress: number;
  recentRaces: Array<{ raceId: string; position: number; beyer: number }>;
  projectedPeak: number;
}

/**
 * Create AI state for race entry decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * and strategic plan for race entries.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized race entry AI state
 */
export function createRaceEntryAIState(stable: Stable): RaceEntryAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    strategicPlan: {
      targetRaces: [],
      horseDevelopment: {},
      budgetAllocation: {},
    },
  };
}

/**
 * Calculate strategic entry score for a horse in a race.
 *
 * Combines suitability, learning, and strategic planning to determine
 * the strategic value of entering a specific race.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse to evaluate
 * @param race - The race to evaluate
 * @param stable - The stable making the decision
 * @param currentDay - Current game day
 * @returns Strategic entry score
 */
export function calculateStrategicEntryScore(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  stable: Stable,
  currentDay: number,
): number {
  // Base suitability score
  let score = calculateRaceSuitability(horse, race, stable);

  // Add track geometry and gradient scores
  score += calculateTrackGeometryScore(horse, race);
  score += calculateGradientScore(horse, race);

  // Apply personality modifiers
  score = applyPersonalityModifiers(score, horse, race, stable);

  // Learning-based adjustment
  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const successRate = getSuccessRate(aiState.learningState, "race_entry", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 20; // -10 to +10 based on learning
  score += adaptiveBonus;

  // Strategic planning adjustment
  const strategicValue = evaluateStrategicValue(aiState, horse, race, currentDay);
  score += strategicValue;

  return score;
}

/**
 * Evaluate strategic value of entering a race.
 *
 * Considers long-term goals, horse development, and competitive positioning.
 * Provides bonuses for races that advance development goals and target peak form.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse to evaluate
 * @param race - The race to evaluate
 * @param currentDay - Current game day
 * @returns Strategic value score
 */
function evaluateStrategicValue(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
): number {
  let strategicValue = 0;

  // Check if race aligns with horse development plan
  const devTrack = aiState.strategicPlan.horseDevelopment[horse.id];
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

  // Competitive positioning - avoid races with too many top competitors
  if (race.entries.length > 0) {
    // In real implementation, would look up horse stats
    const avgCompetitorQuality = 50;

    if (avgCompetitorQuality > 80) {
      strategicValue -= 10; // Penalty for very competitive fields
    }
  }

  // Budget consideration
  const raceBudget = aiState.strategicPlan.budgetAllocation[race.id] || 0;
  if (race.purse > raceBudget * 2 && raceBudget > 0) {
    strategicValue -= 5; // Penalty for overspending on single race
  }

  return strategicValue;
}

/**
 * Update horse development tracking after a race.
 *
 * Updates the horse's development track with race results,
 * adjusts progress based on performance, and potentially upgrades target grade.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse that raced
 * @param race - The race that was run
 * @param position - Final race position
 * @param beyer - Beyer figure from the race
 * @returns Updated race entry AI state
 */
export function updateHorseDevelopment(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  position: number,
  beyer: number,
): RaceEntryAIState {
  const devTrack = aiState.strategicPlan.horseDevelopment[horse.id] || {
    horseId: horse.id,
    targetGrade: race.graded?.grade || "open",
    currentProgress: 0,
    recentRaces: [],
    projectedPeak: horse.age < 4 ? horse.age * 365 + 365 : horse.age * 365,
  };

  // Add race result
  const newRecentRaces = [...devTrack.recentRaces, { raceId: race.id, position, beyer }];
  const trimmedRecentRaces = newRecentRaces.length > RECENT_RACES_MAX_COUNT ? newRecentRaces.slice(-RECENT_RACES_MAX_COUNT) : newRecentRaces;

  // Update progress based on performance
  let currentProgress = devTrack.currentProgress;
  if (position <= 3) {
    currentProgress += 10;
  } else if (position <= 5) {
    currentProgress += 5;
  }

  let targetGrade = devTrack.targetGrade;
  // Adjust target grade if performing well
  if (currentProgress > 80 && targetGrade !== "G1") {
    const grades = ["open", "G3", "G2", "G1"];
    const currentIndex = grades.indexOf(targetGrade);
    if (currentIndex < grades.length - 1) {
      targetGrade = grades[currentIndex + 1];
      currentProgress = 0; // Reset progress for new goal
    }
  }

  const updatedDevTrack = {
    ...devTrack,
    targetGrade,
    currentProgress,
    recentRaces: trimmedRecentRaces,
  };

  return {
    ...aiState,
    strategicPlan: {
      ...aiState.strategicPlan,
      horseDevelopment: {
        ...aiState.strategicPlan.horseDevelopment,
        [horse.id]: updatedDevTrack,
      },
    },
  };
}

/**
 * Record race entry outcome for learning.
 *
 * Records the race entry outcome in the learning state for
 * adaptive strategy improvement.
 *
 * @param aiState - Current race entry AI state
 * @param horse - The horse that entered the race
 * @param race - The race that was entered
 * @param currentDay - Current game day
 * @param success - Whether the entry was successful
 * @param position - Final race position (optional)
 * @returns Updated race entry AI state
 */
export function recordRaceEntryOutcome(
  aiState: RaceEntryAIState,
  horse: Horse,
  race: Race,
  currentDay: number,
  success: boolean,
  position?: number,
): RaceEntryAIState {
  const contextKey = `${race.distance}:${race.surface || "unknown"}:${race.graded?.grade || "open"}`;
  const value = success && position ? (10 - position) * 10 : 0;

  const newPersonalityState = recordOutcome(
    aiState.personalityState,
    "race_entry",
    { raceId: race.id, horseId: horse.id },
    success,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    personalityState: newPersonalityState,
  };
}

/**
 * Generate multi-race entry strategy for a stable.
 *
 * Plans entries across multiple upcoming races based on
 * strategic fit and horse availability.
 *
 * @param aiState - Current race entry AI state
 * @param stable - The stable planning entries
 * @param horses - Available horses
 * @param races - Available races
 * @param currentDay - Current game day
 * @param daysAhead - Number of days ahead to plan
 * @returns Strategy mapping race IDs to horse IDs
 */
export function generateMultiRaceStrategy(
  aiState: RaceEntryAIState,
  stable: Stable,
  horses: Horse[],
  races: Race[],
  currentDay: number,
  daysAhead: number,
): Record<string, string[]> {
  const strategy: Record<string, string[]> = {};

  // Filter upcoming races
  const upcomingRaces = races.filter(
    (r) => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved,
  );

  // Sort races by day and priority
  upcomingRaces.sort((a, b) => {
    const dayDiff = a.day - b.day;
    if (dayDiff !== 0) return dayDiff;
    return (b.purse || 0) - (a.purse || 0);
  });

  // Assign horses to races based on strategic fit
  for (const race of upcomingRaces) {
    const candidates = horses
      .filter((h) => h.stableId === stable.id)
      .map((horse) => ({
        horse,
        score: calculateStrategicEntryScore(aiState, horse, race, stable, currentDay),
      }))
      .filter((c) => c.score > 50)
      .sort((a, b) => b.score - a.score);

    // Select top candidates (max 2 per race)
    const selected = candidates.slice(0, 2).map((c) => c.horse.id);
    if (selected.length > 0) {
      strategy[race.id] = selected;
    }
  }

  return strategy;
}

/**
 * Adapt strategy based on learning outcomes.
 *
 * Adjusts strategy confidence based on overall success rate
 * from past race entry decisions.
 *
 * @param aiState - Current race entry AI state
 * @param currentDay - Current game day
 * @returns Updated race entry AI state
 */
export function adaptStrategy(aiState: RaceEntryAIState, currentDay: number): RaceEntryAIState {
  const outcomes = aiState.learningState.outcomes;
  const totalDecisions = outcomes.length;
  const successRate =
    totalDecisions > 0 ? outcomes.filter((o) => o.success).length / totalDecisions : 0.5;

  // If success rate is low, become more conservative
  if (successRate < 0.4 && totalDecisions > 10) {
    const newPersonalityState = {
      ...aiState.personalityState,
      strategyConfidence: Math.max(0.3, aiState.personalityState.strategyConfidence - 0.1),
    };
    return {
      ...aiState,
      personalityState: newPersonalityState,
    };
  }

  return aiState;
}
