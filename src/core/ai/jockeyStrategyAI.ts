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

import type { Horse, Race, Jockey, Stable, RunningStyle } from "@/game/types";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { getPersonalityAIState, recordPersonalityOutcome, calculateUtilityScore } from "./personalitySystem";
import {
  createLearningState,
  recordLearningOutcome,
  getSuccessRate,
  type LearningState,
} from "./learningModule";
import { calculateRaceRating } from "@/core/horse/stats";

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
 * Calculate optimal jockey instructions for a horse in a race.
 *
 * Determines the optimal racing strategy based on horse running style,
 * personality, jockey skill, and energy.
 *
 * @param aiState - Current jockey strategy AI state
 * @param horse - The horse to evaluate
 * @param race - The race being run
 * @param jockey - The jockey riding the horse
 * @param stable - The stable making the decision
 * @returns Optimal JockeyInstructions object
 */
export function calculateOptimalTactics(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
): JockeyInstructions {
  const personality = aiState.personalityState.personality;

  // Jockey competency check - more skilled jockeys are better at riding to strength
  const isSkilled = (jockey.stats.positioning + jockey.stats.pacing) / 2 > 70;

  // Calculate aggressiveness
  const aggressiveness = Math.round(
    calculateJockeyAggressiveness(aiState, horse, race, jockey, stable) * 100,
  );

  // Dynamic Form: Check recoveryPoints - adjust tactics for fatigued horses
  const recoveryPoints = horse.recoveryPoints ?? 100;
  if (recoveryPoints < 50) {
    // Horse is fatigued - use conservative tactics to preserve energy
    return {
      horseId: horse.id,
      raceId: race.id,
      ridingStyle: "closer",
      earlyPosition: "drop_back",
      moveTiming: "late",
      aggressiveness: Math.max(20, aggressiveness - 20),
    };
  }

  // Dynamic Form: Assess bounce risk and adjust tactics
  let bounceRisk = false;
  if (horse.lastBeyer && horse.lastRaceDay && race.day) {
    const daysSinceLastRace = race.day - horse.lastRaceDay;
    const beyerHistory = horse.raceHistory
      .filter((r) => r.beyer !== undefined)
      .map((r) => r.beyer!);
    const avgBeyer =
      beyerHistory.length > 0
        ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
        : 80;

    // Bounce condition: lastBeyer > avgBeyer + 15 and raced within 28 days
    if (horse.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      bounceRisk = true;
    }
  }

  // If bounce risk is detected, use more conservative tactics
  if (bounceRisk) {
    if (horse.runningStyle === "E") {
      return {
        horseId: horse.id,
        raceId: race.id,
        ridingStyle: "front_runner",
        earlyPosition: "press",
        moveTiming: "mid",
        aggressiveness: Math.max(30, aggressiveness - 15),
      };
    }
    return {
      horseId: horse.id,
      raceId: race.id,
      ridingStyle: "closer",
      earlyPosition: "midpack",
      moveTiming: "late",
      aggressiveness: Math.max(20, aggressiveness - 20),
    };
  }

  // Use strategy record to determine tactics based on running style
  const instructionsCalculator = TACTICS_STRATEGIES[horse.runningStyle];
  const baseInstructions = instructionsCalculator(
    horse,
    race,
    jockey,
    personality,
    isSkilled,
    aggressiveness,
  );

  // Field-aware adjustments: large fields (14+ horses) require traffic-aware tactics
  const fieldSize = race.entries.length || race.fieldSize;
  if (fieldSize >= 14) {
    // Closers (S style) should be less aggressive early in large fields to avoid traffic
    if (horse.runningStyle === "S") {
      return {
        ...baseInstructions,
        aggressiveness: Math.max(20, baseInstructions.aggressiveness - 10),
        earlyPosition:
          baseInstructions.earlyPosition === "press" ? "midpack" : baseInstructions.earlyPosition,
      };
    }
    // Front-runners (E style) in large fields should avoid getting trapped on the rail
    if (horse.runningStyle === "E") {
      return {
        ...baseInstructions,
        earlyPosition:
          baseInstructions.earlyPosition === "drop_back" ? "press" : baseInstructions.earlyPosition,
      };
    }
  }

  // Track-condition adjustments: adverse conditions affect horses with low mudAptitude
  const trackCondition = race.trackCondition;
  if (trackCondition === "heavy" || trackCondition === "soft" || trackCondition === "yielding") {
    const mudAptitude = horse.mudAptitude ?? 0.5;
    if (mudAptitude < 0.5) {
      // Horse struggles in mud — reduce aggressiveness and adopt more conservative position
      const aggressivenessReduction = Math.round((0.5 - mudAptitude) * 30); // Up to -15
      const adjustedAggressiveness = Math.max(
        20,
        baseInstructions.aggressiveness - aggressivenessReduction,
      );
      // Front-runners on soft tracks with low mud aptitude should not go for the lead
      if (horse.runningStyle === "E" && baseInstructions.earlyPosition === "lead") {
        return {
          ...baseInstructions,
          aggressiveness: adjustedAggressiveness,
          earlyPosition: "press",
        };
      }
      return {
        ...baseInstructions,
        aggressiveness: adjustedAggressiveness,
      };
    }
  }

  // Trait-based tactic adjustments
  const traits = jockey.traits ?? [];
  let traitAdjustedInstructions = baseInstructions;

  // gate_master: more aggressive early position for front-runners
  if (traits.includes("gate_master") && horse.runningStyle === "E") {
    traitAdjustedInstructions = {
      ...traitAdjustedInstructions,
      aggressiveness: Math.min(100, traitAdjustedInstructions.aggressiveness + 5),
      earlyPosition:
        traitAdjustedInstructions.earlyPosition === "press"
          ? "lead"
          : traitAdjustedInstructions.earlyPosition,
    };
  }

  // pace_presser: more aggressive for early pressers
  if (
    traits.includes("pace_presser") &&
    (horse.runningStyle === "E" || horse.runningStyle === "EP")
  ) {
    traitAdjustedInstructions = {
      ...traitAdjustedInstructions,
      aggressiveness: Math.min(100, traitAdjustedInstructions.aggressiveness + 5),
    };
  }

  // big_match_temperament: more aggressive in large fields
  if (traits.includes("big_match_temperament") && fieldSize > 12) {
    traitAdjustedInstructions = {
      ...traitAdjustedInstructions,
      aggressiveness: Math.min(100, traitAdjustedInstructions.aggressiveness + 8),
    };
  }

  // veteran_poise: more measured, slightly reduce aggressiveness for older jockeys
  if (traits.includes("veteran_poise") && jockey.age >= 35) {
    traitAdjustedInstructions = {
      ...traitAdjustedInstructions,
      aggressiveness: Math.max(20, traitAdjustedInstructions.aggressiveness - 3),
    };
  }

  // closer_instinct: favor late move timing for closers
  if (
    traits.includes("closer_instinct") &&
    (horse.runningStyle === "S" || horse.runningStyle === "P")
  ) {
    traitAdjustedInstructions = {
      ...traitAdjustedInstructions,
      moveTiming: "late",
    };
  }

  return traitAdjustedInstructions;
}

/**
 * Type for jockey instructions calculation function.
 */
type InstructionsCalculator = (
  horse: Horse,
  race: Race,
  jockey: Jockey,
  personality: Stable["personality"],
  isSkilled: boolean,
  aggressiveness: number,
) => JockeyInstructions;

/**
 * Strategy record for jockey instructions calculation based on running style.
 */
const TACTICS_STRATEGIES: Record<RunningStyle, InstructionsCalculator> = {
  E: (horse, race, jockey, personality, isSkilled, aggressiveness) => {
    // Front runners want to lead or press
    const shouldLead = personality === "aggressive" || (isSkilled && horse.energy > 80);
    return {
      horseId: horse.id,
      raceId: race.id,
      ridingStyle: "front_runner",
      earlyPosition: shouldLead ? "lead" : "press",
      moveTiming: "early",
      aggressiveness: shouldLead ? Math.min(100, aggressiveness + 15) : aggressiveness,
    };
  },
  S: (horse, race, jockey, personality, isSkilled, aggressiveness) => {
    // Closers want to drop back and make a late move
    const isLateKick = race.distance >= 2000 || isSkilled;
    return {
      horseId: horse.id,
      raceId: race.id,
      ridingStyle: "closer",
      earlyPosition: "drop_back",
      moveTiming: isLateKick ? "late" : "mid",
      aggressiveness: isLateKick ? Math.min(100, aggressiveness + 10) : aggressiveness,
    };
  },
  EP: (horse, race, jockey, personality, isSkilled, aggressiveness) => {
    // Early pressers want to stay close to the lead
    if (personality === "conservative") {
      return {
        horseId: horse.id,
        raceId: race.id,
        ridingStyle: "stalker",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: Math.max(20, aggressiveness - 15),
      };
    }
    return {
      horseId: horse.id,
      raceId: race.id,
      ridingStyle: "stalker",
      earlyPosition: "press",
      moveTiming: "early",
      aggressiveness,
    };
  },
  P: (horse, race, jockey, personality, isSkilled, aggressiveness) => {
    // Pressers are versatile; stalkers often helps avoid traffic if skilled
    if (isSkilled && personality !== "conservative") {
      return {
        horseId: horse.id,
        raceId: race.id,
        ridingStyle: "stalker",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: Math.min(100, aggressiveness + 10),
      };
    }
    if (personality === "conservative") {
      return {
        horseId: horse.id,
        raceId: race.id,
        ridingStyle: "tactical",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: Math.max(20, aggressiveness - 15),
      };
    }
    return {
      horseId: horse.id,
      raceId: race.id,
      ridingStyle: "tactical",
      earlyPosition: "press",
      moveTiming: "mid",
      aggressiveness,
    };
  },
};

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
    const avgBeyer =
      beyerHistory.length > 0
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
  const contextKey = `${horse.age}:${race.distance}:${style}:${race.trackCondition ?? "none"}:${race.weather ?? "none"}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_strategy", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

  // Trait-based style preferences (applied after utility scoring to differentiate)
  const traits = jockey.traits ?? [];
  if (traits.includes("gate_master") && style === "E") score += 15;
  if (traits.includes("closer_instinct") && (style === "S" || style === "P")) score += 15;
  if (traits.includes("pace_presser") && (style === "E" || style === "EP")) score += 10;
  if (traits.includes("sprint_specialist") && race.distance < 1400 && style === "E") score += 10;
  if (
    traits.includes("staying_specialist") &&
    race.distance > 2200 &&
    (style === "S" || style === "P")
  )
    score += 10;
  if (traits.includes("big_match_temperament") && race.fieldSize > 12 && style === "S") score += 8;

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

  // Trait-based aggressiveness adjustments
  const traits = jockey.traits ?? [];

  // pace_presser: more aggressive for front-runners/pressers
  if (
    traits.includes("pace_presser") &&
    (horse.runningStyle === "E" || horse.runningStyle === "EP")
  ) {
    aggressiveness += 0.08;
  }

  // veteran_poise: slightly more measured for older jockeys
  if (traits.includes("veteran_poise") && jockey.age >= 35) {
    aggressiveness -= 0.05;
  }

  // big_match_temperament: more aggressive in large fields
  const fieldSize = race.entries.length || race.fieldSize;
  if (traits.includes("big_match_temperament") && fieldSize > 12) {
    aggressiveness += 0.07;
  }

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
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  // Update learning state
  const success = position <= 3; // Top 3 is success
  const contextKey = `${horse.age}:${race.distance}:${runningStyle}:${race.trackCondition ?? "none"}:${race.weather ?? "none"}`;
  const value = 10 - position; // Higher value for better positions
  const newLearningState = recordLearningOutcome(
    aiState.learningState,
    "jockey_strategy",
    contextKey,
    success,
    value,
    currentDay,
    aiState.personalityState.memoryDepth,
  );

  const newPersonalityState = recordPersonalityOutcome(
    aiState.personalityState,
    "jockey_strategy",
    { raceId: race.id, horseId: horse.id },
    success,
    value,
    currentDay,
  );

  return {
    ...aiState,
    strategyHistory: trimmedHistory,
    personalityState: newPersonalityState,
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

// ─── Track-Condition Awareness ──────────────────────────────────────────────

/**
 * Adjust jockey instructions based on track conditions.
 *
 * Horses with low mud aptitude should use more conservative tactics on
 * soft/heavy tracks. On fast tracks, aggressive tactics are favored.
 *
 * @param instructions - Base jockey instructions
 * @param horse - The horse being ridden
 * @param race - The race being run
 * @returns Adjusted jockey instructions
 */
export function adjustForTrackCondition(
  instructions: JockeyInstructions,
  horse: Horse,
  race: Race,
): JockeyInstructions {
  const condition = race.trackCondition;

  // No adjustment needed for fast/good tracks
  if (!condition || condition === "fast" || condition === "good") {
    return instructions;
  }

  // On soft/heavy/yielding tracks, check horse mud aptitude
  const mudAptitude = horse.mudAptitude ?? 0.5;

  if (mudAptitude < 0.3) {
    // Poor mud aptitude: be more conservative
    return {
      ...instructions,
      aggressiveness: Math.max(20, instructions.aggressiveness - 15),
      moveTiming: instructions.moveTiming === "early" ? "mid" : instructions.moveTiming,
    };
  }

  if (mudAptitude > 0.7) {
    // Excellent mud aptitude: can be more aggressive on off tracks
    return {
      ...instructions,
      aggressiveness: Math.min(100, instructions.aggressiveness + 10),
    };
  }

  return instructions;
}

// ─── Field-Aware Tactics ─────────────────────────────────────────────────────

/**
 * Adjust running style based on field composition.
 *
 * If the field is full of front-runners, a closer style becomes more valuable
 * (avoid speed duel). If the field lacks early speed, a front-running style
 * can capitalize on an easy lead.
 *
 * @param baseStyle - The calculated optimal running style
 * @param race - The race being run
 * @param horseMap - Optional map of all horses for field analysis
 * @returns Adjusted running style
 */
export function adjustForFieldComposition(
  baseStyle: RunningStyle,
  race: Race,
  horseMap?: Map<string, Horse>,
): RunningStyle {
  if (!horseMap || race.entries.length < 3) return baseStyle;

  let frontRunners = 0;
  let closers = 0;

  for (const entry of race.entries) {
    const horse = horseMap.get(entry.horseId);
    if (!horse) continue;

    // Use distance aptitude and surface aptitude as proxy for running style tendency
    // Horses with high distanceAptitude tend to be closers, low tends to be front-runners
    if (horse.distanceAptitude < 0.4) frontRunners++;
    if (horse.distanceAptitude > 0.7) closers++;
  }

  const fieldSize = race.entries.length;
  const frontRunnerRatio = frontRunners / fieldSize;
  const closerRatio = closers / fieldSize;

  // If field is saturated with front-runners (>40%), switch to closer if currently front-runner
  if (frontRunnerRatio > 0.4 && baseStyle === "E") {
    return "S";
  }

  // If field is saturated with closers (>40%), switch to front-runner if currently closer
  if (closerRatio > 0.4 && baseStyle === "S") {
    return "E";
  }

  // Large field adjustment: closers benefit from large fields (more chaos upfront)
  if (fieldSize > 12 && baseStyle === "P") {
    return "S";
  }

  return baseStyle;
}

// ─── Jockey-Horse Affinity Weighting ────────────────────────────────────────

/**
 * Calculate confidence boost from jockey-horse affinity.
 *
 * Jockeys who have ridden a horse before (high affinityMap value) get
 * a confidence boost that improves instruction effectiveness.
 *
 * @param jockey - The jockey riding the horse
 * @param horseId - The ID of the horse being ridden
 * @returns Affinity confidence multiplier (1.0 = neutral, >1.0 = boost)
 */
export function calculateAffinityBoost(jockey: Jockey, horseId: string): number {
  const affinity = jockey.affinityMap[horseId] ?? 0;

  // Each 10 affinity points = 5% boost, capped at 30%
  const boost = 1 + Math.min(0.3, (affinity / 10) * 0.05);

  return boost;
}

/**
 * Apply affinity boost to jockey instructions.
 *
 * High-affinity jockey-horse pairs get more effective instructions
 * (slightly higher aggressiveness and better timing).
 *
 * @param instructions - Base jockey instructions
 * @param jockey - The jockey riding the horse
 * @param horseId - The ID of the horse being ridden
 * @returns Adjusted jockey instructions
 */
export function applyAffinityBoost(
  instructions: JockeyInstructions,
  jockey: Jockey,
  horseId: string,
): JockeyInstructions {
  const boost = calculateAffinityBoost(jockey, horseId);

  if (boost <= 1.0) return instructions;

  // Apply a small aggressiveness boost from affinity
  const aggressivenessBoost = Math.round((boost - 1) * 20);

  const affinity = jockey.affinityMap[horseId] ?? 0;

  // Upgrade moveTiming based on affinity level
  let moveTiming = instructions.moveTiming;
  if (affinity >= 400 && moveTiming === "mid") {
    moveTiming = "late";
  } else if (affinity >= 150 && moveTiming === "early") {
    moveTiming = "mid";
  }

  // Upgrade earlyPosition based on affinity level
  let earlyPosition = instructions.earlyPosition;
  if (affinity >= 150 && earlyPosition === "drop_back") {
    earlyPosition = "midpack";
  }

  return {
    ...instructions,
    aggressiveness: Math.min(100, instructions.aggressiveness + aggressivenessBoost),
    moveTiming,
    earlyPosition,
  };
}
