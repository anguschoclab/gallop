/**
 * jockeyStrategyAI.ts - Jockey strategy AI system
 *
 * This file provides NPC jockey instructions for race simulation based on
 * personality and learning for NPC stables.
 *
 * Dependencies: @/game/types (Horse, Jockey, Stable, Race, RunningStyle), ./personalitySystem (getPersonalityAIState, calculateUtilityScore), @/core/horse/stats (calculateRaceRating), ./learningModule (learning functions)
 * Related files: npcCycleAI.ts (uses jockey strategy AI), personalitySystem.ts (provides personality state)
 */

/**
 * Jockey Strategy AI System
 * NPC jockey instructions for race simulation based on personality and learning
 */

import type { Horse, Jockey, Stable, Race, RunningStyle } from "@/game/types";
import { getPersonalityAIState, calculateUtilityScore } from "./personalitySystem";
import { calculateRaceRating } from "@/core/horse/stats";
import {
  createLearningState,
  recordOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";

export interface JockeyStrategyAIState {
  personalityState: ReturnType<typeof getPersonalityAIState>;
  learningState: LearningState;
  strategyHistory: RaceStrategy[];
}

export interface RaceStrategy {
  raceId: string;
  horseId: string;
  jockeyId: string;
  stableId: string;
  day: number;
  runningStyle: RunningStyle;
  aggressiveness: number;
  position: number;
}

/**
 * Create AI state for jockey strategy decisions.
 *
 * Initializes the AI state with personality state, learning state,
 * and strategy history.
 *
 * @param stable - The stable to create AI state for
 * @returns Initialized jockey strategy AI state
 */
export function createJockeyStrategyAIState(stable: Stable): JockeyStrategyAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    strategyHistory: [],
  };
}

/**
 * Calculate optimal tactics for a horse in a race.
 *
 * Determines the optimal racing tactics based on horse running style,
 * personality, jockey skill, and energy.
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse to evaluate
 * @param race - The race being run
 * @param jockey - The jockey riding the horse
 * @param stable - The stable making the decision
 * @returns Optimal tactics string (lead, rail, save, late_kick, outside, default)
 */
export function calculateOptimalTactics(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
): string {
  const personality = aiState.personalityState.personality;
  
  // Jockey competency check - more skilled jockeys are better at riding to strength
  const isSkilled = (jockey.stats.positioning + jockey.stats.pacing) / 2 > 70;
  
  // Dynamic Form: Check recoveryPoints - adjust tactics for fatigued horses
  const recoveryPoints = horse.recoveryPoints ?? 100;
  if (recoveryPoints < 50) {
    // Horse is fatigued - use conservative tactics to preserve energy
    return "save";
  }

  // Dynamic Form: Assess bounce risk and adjust tactics
  let bounceRisk = false;
  if (horse.lastBeyer && horse.lastRaceDay && race.day) {
    const daysSinceLastRace = race.day - horse.lastRaceDay;
    const beyerHistory = horse.raceHistory
      .filter((r) => r.beyer !== undefined)
      .map((r) => r.beyer!);
    const avgBeyer = beyerHistory.length > 0
      ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
      : 80;
    
    // Bounce condition: lastBeyer > avgBeyer + 15 and raced within 28 days
    if (horse.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      bounceRisk = true;
    }
  }

  // If bounce risk is detected, use more conservative tactics
  if (bounceRisk) {
    if (horse.runningStyle === "E") return "rail"; // Still try to lead but more conservatively
    if (horse.runningStyle === "S") return "save"; // Save more for late kick
    return "save"; // Default to save for bounce risk
  }
  
  // Strategy: Try to race to strength
  if (horse.runningStyle === "E") {
    // Front runners want to lead or be on the rail
    if (personality === "aggressive" || (isSkilled && horse.energy > 80)) return "lead";
    return "rail";
  }

  if (horse.runningStyle === "S") {
    // Closers want to save ground or have a late kick
    if (race.distance >= 2000 || isSkilled) return "late_kick";
    return "save";
  }

  if (horse.runningStyle === "EP") {
    // Early pressers want the rail to stay close to the lead efficiently
    if (personality === "conservative") return "save";
    return "rail";
  }

  if (horse.runningStyle === "P") {
    // Pressers are versatile; outside often helps avoid traffic if skilled
    if (isSkilled && personality !== "conservative") return "outside";
    if (personality === "conservative") return "save";
    return "default";
  }

  // Fallback to personality-driven logic if style is unclear
  if (personality === "aggressive") return "lead";
  if (personality === "conservative") return "save";

  return "default";
}

/**
 * Calculate optimal running style for a horse in a race.
 *
 * Evaluates all possible running styles and selects the one
 * with the highest score based on horse, race, and jockey factors.
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse to evaluate
 * @param race - The race being run
 * @param jockey - The jockey riding the horse
 * @param stable - The stable making the decision
 * @returns Optimal running style (E, EP, P, or S)
 */
export function calculateOptimalRunningStyle(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
): RunningStyle {
  const styles: RunningStyle[] = ["E", "EP", "P", "S"];
  let bestStyle: RunningStyle = "P"; // Default to mid-pack
  let bestScore = 0;

  for (const style of styles) {
    const score = calculateStyleScore(aiState, horse, race, jockey, stable, style);
    if (score > bestScore) {
      bestScore = score;
      bestStyle = style;
    }
  }

  return bestStyle;
}

/**
 * Calculate score for a specific running style
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse to evaluate
 * @param race - The race being run
 * @param jockey - The jockey riding the horse
 * @param stable - The stable making the decision
 * @param style - The running style to score
 * @returns Numerical score for the style
 */
function calculateStyleScore(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
  style: RunningStyle,
): number {
  let score = 0;

  // Dynamic Form: Adjust style score based on recoveryPoints
  const recoveryPoints = horse.recoveryPoints ?? 100;
  if (recoveryPoints < 50) {
    // Fatigued horses benefit from conservative styles (S, P)
    if (style === "S") score += 20;
    if (style === "P") score += 10;
    if (style === "E") score -= 15; // Penalize front-running when fatigued
  }

  // Dynamic Form: Assess bounce risk
  let bounceRisk = false;
  if (horse.lastBeyer && horse.lastRaceDay && race.day) {
    const daysSinceLastRace = race.day - horse.lastRaceDay;
    const beyerHistory = horse.raceHistory
      .filter((r) => r.beyer !== undefined)
      .map((r) => r.beyer!);
    const avgBeyer = beyerHistory.length > 0
      ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
      : 80;
    
    if (horse.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      bounceRisk = true;
    }
  }

  // If bounce risk, favor conservative styles
  if (bounceRisk) {
    if (style === "S") score += 15;
    if (style === "P") score += 10;
    if (style === "E") score -= 10;
  }

  // Horse distance aptitude match
  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff < 200) {
    // Horse fits distance well
    if (style === "E") score += 15; // Front-runners excel when horse fits distance
    if (style === "S") score += 10; // Closers also benefit
  } else if (distDiff > 500) {
    // Horse doesn't fit distance well
    if (style === "E") score -= 10; // Front-running risky when horse doesn't fit
    if (style === "S") score += 5; // Closing safer for distance mismatches
  }

  // Horse energy considerations
  if (horse.energy < 60) {
    // Low energy: avoid front-running
    if (style === "E") score -= 20;
    if (style === "S") score += 10;
  } else if (horse.energy > 80) {
    // High energy: can afford front-running
    if (style === "E") score += 10;
  }

  // Jockey archetype match
  if (jockey.archetype === "front_runner" && style === "E") score += 20;
  if (jockey.archetype === "closer" && style === "S") score += 20;
  if (jockey.archetype === "clinical" && style === "P") score += 15;
  if (jockey.archetype === "finisher" && style === "S") score += 15;
  if (jockey.archetype === "versatile") score += 5; // Versatile jockeys work with any style

  // Jockey stats
  if (jockey.stats.pacing > 80 && style === "E") score += 10;
  if (jockey.stats.vigor > 80 && style === "S") score += 10;
  if (jockey.stats.positioning > 80 && style === "P") score += 10;

  // Personality modifiers
  const factors: Record<string, number> = {
    style_score: score,
    horse_energy: horse.energy,
    horse_form: horse.form,
    jockey_skill:
      (jockey.stats.pacing +
        jockey.stats.vigor +
        jockey.stats.positioning +
        jockey.stats.gateSkill +
        jockey.stats.temperament) /
      5,
  };

  score = calculateUtilityScore(aiState.personalityState, "jockey_strategy", factors);

  // Learning-based adjustment
  const contextKey = `${horse.age}:${race.distance}:${style}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_strategy", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  return score;
}

/**
 * Calculate jockey aggressiveness for a race.
 *
 * Determines the appropriate aggressiveness level based on personality,
 * horse quality, race distance, jockey temperament, and learning.
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse being ridden
 * @param race - The race being run
 * @param jockey - The jockey riding the horse
 * @param stable - The stable making the decision
 * @returns Aggressiveness score (0-1)
 */
export function calculateJockeyAggressiveness(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
): number {
  let aggressiveness = 0.5; // Default moderate

  // Personality-based aggressiveness
  const config = aiState.personalityState;
  if (config.personality === "aggressive") aggressiveness += 0.3;
  if (config.personality === "conservative") aggressiveness -= 0.2;
  if (config.personality === "win-now") aggressiveness += 0.2;

  // Horse quality
  const horseQuality = calculateRaceRating(horse);
  if (horseQuality > 75) aggressiveness += 0.15; // High-quality horses can be ridden aggressively

  // Race distance
  if (race.distance < 1200) aggressiveness += 0.2; // Sprints favor aggressiveness
  if (race.distance > 2000) aggressiveness -= 0.1; // Routes favor patience

  // Jockey temperament
  aggressiveness += (jockey.stats.temperament - 50) / 200; // -0.25 to +0.25

  // Learning-based adjustment
  const contextKey = `${horse.age}:${race.distance}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_aggressiveness", contextKey);
  if (successRate < 0.4) {
    aggressiveness -= 0.1; // Less aggressive if success rate is low
  } else if (successRate > 0.7) {
    aggressiveness += 0.1; // More aggressive if success rate is high
  }

  return Math.max(0, Math.min(1, aggressiveness));
}

/**
 * Determine if jockey should make tactical move during race.
 *
 * Evaluates whether to make a tactical move based on race progress,
 * current position, personality, and jockey stats.
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse being ridden
 * @param race - The race being run
 * @param jockey - The jockey riding the horse
 * @param currentPosition - Current position in the race
 * @param raceProgress - Progress through the race (0-1)
 * @returns Object with shouldMove flag, targetPosition, and moveType
 */
export function shouldMakeTacticalMove(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  currentPosition: number,
  raceProgress: number,
): {
  shouldMove: boolean;
  targetPosition: number;
  moveType: "early" | "middle" | "late";
} {
  const config = aiState.personalityState;

  // Default: no move
  let shouldMove = false;
  let targetPosition = currentPosition;
  let moveType: "early" | "middle" | "late" = "middle";

  // Early race tactical decisions
  if (raceProgress < 0.3) {
    // Aggressive stables move early
    if (config.personality === "aggressive" && currentPosition > 3) {
      shouldMove = true;
      targetPosition = 2;
      moveType = "early";
    }
    // Conservative stables hold position
    if (config.personality === "conservative") {
      shouldMove = false;
    }
  }
  // Middle race tactical decisions
  else if (raceProgress < 0.7) {
    // Position for the stretch run
    if (currentPosition > 5) {
      shouldMove = true;
      targetPosition = 4;
      moveType = "middle";
    }
  }
  // Late race tactical decisions
  else {
    // Final push
    if (currentPosition > 3 && horse.energy > 50) {
      shouldMove = true;
      targetPosition = 1;
      moveType = "late";
    }
  }

  // Jockey stats influence
  if (jockey.stats.vigor < 60 && moveType === "late") {
    shouldMove = false; // Low vigor jockeys less likely to make late moves
  }

  return { shouldMove, targetPosition, moveType };
}

/**
 * Record race strategy for learning.
 *
 * Records the race strategy in history and updates the
 * learning state for adaptive improvement.
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse that raced
 * @param race - The race that was run
 * @param jockey - The jockey who rode the horse
 * @param stable - The stable making the decision
 * @param runningStyle - The running style used
 * @param aggressiveness - The aggressiveness level used
 * @param position - Final race position
 * @param currentDay - Current game day
 * @returns Updated jockey strategy AI state
 */
export function recordRaceStrategy(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
  runningStyle: RunningStyle,
  aggressiveness: number,
  position: number,
  currentDay: number,
): JockeyStrategyAIState {
  const strategy: RaceStrategy = {
    raceId: race.id,
    horseId: horse.id,
    jockeyId: jockey.id,
    stableId: stable.id,
    day: currentDay,
    runningStyle,
    aggressiveness,
    position,
  };

  const newHistory = [...aiState.strategyHistory, strategy];

  // Trim history to memory depth
  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory = newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Update learning state
  const success = position <= 3; // Top 3 is success
  const contextKey = `${horse.age}:${race.distance}:${runningStyle}`;
  const value = 10 - position; // Higher value for better positions
  const newLearningState = recordOutcome(
    aiState.learningState,
    "jockey_strategy",
    contextKey,
    success,
    value,
    Date.now(),
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  return {
    ...aiState,
    strategyHistory: trimmedHistory,
    learningState: newLearningState,
  };
}

/**
 * Get strategy insights for a stable.
 *
 * Calculates strategy statistics including total races, average position,
 * style usage distribution, and average aggressiveness.
 *
 * @param aiState - Current jockey strategy AI state
 * @param stableId - ID of the stable to get insights for
 * @returns Object with strategy statistics
 */
export function getStrategyInsights(
  aiState: JockeyStrategyAIState,
  stableId: string,
): {
  totalRaces: number;
  avgPosition: number;
  styleUsage: Record<RunningStyle, number>;
  avgAggressiveness: number;
} {
  const stableHistory = aiState.strategyHistory.filter((s) => s.stableId === stableId);
  const totalRaces = stableHistory.length;
  const avgPosition =
    totalRaces > 0 ? stableHistory.reduce((sum, s) => sum + s.position, 0) / totalRaces : 5;

  const styleUsage: Record<RunningStyle, number> = {
    E: 0,
    EP: 0,
    P: 0,
    S: 0,
  };

  for (const strategy of stableHistory) {
    styleUsage[strategy.runningStyle]++;
  }

  const avgAggressiveness =
    totalRaces > 0 ? stableHistory.reduce((sum, s) => sum + s.aggressiveness, 0) / totalRaces : 0.5;

  return {
    totalRaces,
    avgPosition,
    styleUsage,
    avgAggressiveness,
  };
}
