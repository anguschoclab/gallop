/**
 * jockeyStrategyAI.ts - Jockey strategy AI system (orchestrator)
 *
 * Provides types, state creation, and calculateOptimalTactics orchestration.
 * Strategy sub-functions extracted to: jockeyStyleSelection.ts,
 * jockeyTacticalMoves.ts, jockeyStrategyRecording.ts, jockeyStrategyAdjustments.ts.
 *
 * Dependencies: @/game/types, @/core/tactics/tacticsTypes, ./personalitySystem, ./learningModule, @/core/horse/stats
 * Related files: jockeyStyleSelection.ts, jockeyTacticalMoves.ts, jockeyStrategyRecording.ts, jockeyStrategyAdjustments.ts
 */

import type { Horse, Race, Jockey, Stable, RunningStyle } from "@/game/types";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { getPersonalityAIState } from "./personalitySystem";
import { createLearningState, type LearningState } from "./learningModule";
import { calculateJockeyAggressiveness } from "./jockeyTacticalMoves";

// Re-exports for backward compatibility
export { calculateOptimalRunningStyle } from "./jockeyStyleSelection";
export { calculateJockeyAggressiveness, shouldMakeTacticalMove } from "./jockeyTacticalMoves";
export { recordRaceStrategy, getStrategyInsights } from "./jockeyStrategyRecording";
export {
  adjustForTrackCondition,
  adjustForFieldComposition,
  calculateAffinityBoost,
  applyAffinityBoost,
} from "./jockeyStrategyAdjustments";

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

export function createJockeyStrategyAIState(stable: Stable): JockeyStrategyAIState {
  return {
    personalityState: getPersonalityAIState(stable.personality),
    learningState: createLearningState(),
    strategyHistory: [],
  };
}

type InstructionsCalculator = (
  horse: Horse,
  race: Race,
  jockey: Jockey,
  personality: Stable["personality"],
  isSkilled: boolean,
  aggressiveness: number,
) => JockeyInstructions;

const TACTICS_STRATEGIES: Record<RunningStyle, InstructionsCalculator> = {
  E: (horse, race, jockey, personality, isSkilled, aggressiveness) => {
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
