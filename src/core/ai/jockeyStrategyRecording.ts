import type { Horse, Race, Jockey, Stable, RunningStyle } from "@/game/types";
import { recordPersonalityOutcome } from "./personalitySystem";
import { recordLearningOutcome } from "./learningModule";
import { buildStrategyContextKey } from "./strategyContextKey";
import type { JockeyStrategyAIState, RaceStrategy } from "./jockeyStrategyAI";

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

  const maxHistory = aiState.personalityState.memoryDepth;
  const trimmedHistory =
    newHistory.length > maxHistory ? newHistory.slice(-maxHistory) : newHistory;

  const success = position <= 3;
  const contextKey = buildStrategyContextKey(race, runningStyle);
  const value = 10 - position;
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
