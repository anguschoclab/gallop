import type { Horse, Race, Jockey, Stable } from "@/game/types";
import { getSuccessRate } from "./learningModule";
import { calculateRaceRating } from "@/core/horse/stats";
import type { JockeyStrategyAIState } from "./jockeyStrategyAI";

export function calculateJockeyAggressiveness(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
): number {
  let aggressiveness = 0.5;

  const config = aiState.personalityState;
  if (config.personality === "aggressive") aggressiveness += 0.3;
  if (config.personality === "conservative") aggressiveness -= 0.2;
  if (config.personality === "win-now") aggressiveness += 0.2;

  const horseQuality = calculateRaceRating(horse);
  if (horseQuality > 75) aggressiveness += 0.15;

  if (race.distance < 1200) aggressiveness += 0.2;
  if (race.distance > 2000) aggressiveness -= 0.1;

  aggressiveness += (jockey.stats.temperament - 50) / 200;

  const traits = jockey.traits ?? [];

  if (
    traits.includes("pace_presser") &&
    (horse.runningStyle === "E" || horse.runningStyle === "EP")
  ) {
    aggressiveness += 0.08;
  }

  if (traits.includes("veteran_poise") && jockey.age >= 35) {
    aggressiveness -= 0.05;
  }

  const fieldSize = race.entries.length || race.fieldSize;
  if (traits.includes("big_match_temperament") && fieldSize > 12) {
    aggressiveness += 0.07;
  }

  const contextKey = `${horse.age}:${race.distance}`;
  const successRate = getSuccessRate(aiState.learningState, "jockey_aggressiveness", contextKey);
  if (successRate < 0.4) {
    aggressiveness -= 0.1;
  } else if (successRate > 0.7) {
    aggressiveness += 0.1;
  }

  return Math.max(0, Math.min(1, aggressiveness));
}

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

  let shouldMove = false;
  let targetPosition = currentPosition;
  let moveType: "early" | "middle" | "late" = "middle";

  if (raceProgress < 0.3) {
    if (config.personality === "aggressive" && currentPosition > 3) {
      shouldMove = true;
      targetPosition = 2;
      moveType = "early";
    }
    if (config.personality === "conservative") {
      shouldMove = false;
    }
  } else if (raceProgress < 0.7) {
    if (currentPosition > 5) {
      shouldMove = true;
      targetPosition = 4;
      moveType = "middle";
    }
  } else {
    if (currentPosition > 3 && horse.energy > 50) {
      shouldMove = true;
      targetPosition = 1;
      moveType = "late";
    }
  }

  if (jockey.stats.vigor < 60 && moveType === "late") {
    shouldMove = false;
  }

  return { shouldMove, targetPosition, moveType };
}
