import type { Horse, Race, Jockey, Stable, RunningStyle } from "@/game/types";
import { calculateUtilityScore } from "./personalitySystem";
import { getSuccessRate } from "./learningModule";
import { buildStrategyContextKey } from "./strategyContextKey";
import type { JockeyStrategyAIState } from "./jockeyStrategyAI";

export function calculateOptimalRunningStyle(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
): RunningStyle {
  const styles: RunningStyle[] = ["E", "EP", "P", "S"];
  let bestStyle: RunningStyle = "P";
  let bestScore = 0;

  for (const style of styles) {
    const score = calculateStyleScore(aiState, horse, race, jockey, stable, style);
    if (score > bestScore) {
      bestScore = score;
      bestStyle = style;
    }
  }

  // Learning override: if a non-genetic style has > 65% success rate with >= 5 data points,
  // override to that style
  const geneticStyle = horse.runningStyle ?? "P";
  if (bestStyle === geneticStyle) {
    for (const style of styles) {
      if (style === geneticStyle) continue;
      const contextKey = buildStrategyContextKey(race, style);
      const key = `jockey_strategy:${contextKey}`;
      const data = aiState.learningState.successRates[key];
      if (data && data.total >= 5 && data.rate > 0.65) {
        return style;
      }
    }
  }

  return bestStyle;
}

function calculateStyleScore(
  aiState: JockeyStrategyAIState,
  horse: Horse,
  race: Race,
  jockey: Jockey,
  stable: Stable,
  style: RunningStyle,
): number {
  let score = 0;

  const recoveryPoints = horse.recoveryPoints ?? 100;
  if (recoveryPoints < 50) {
    if (style === "S") score += 20;
    if (style === "P") score += 10;
    if (style === "E") score -= 15;
  }

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

  if (bounceRisk) {
    if (style === "S") score += 15;
    if (style === "P") score += 10;
    if (style === "E") score -= 10;
  }

  const distDiff = Math.abs(horse.distanceAptitude - race.distance);
  if (distDiff < 200) {
    if (style === "E") score += 15;
    if (style === "S") score += 10;
  } else if (distDiff > 500) {
    if (style === "E") score -= 10;
    if (style === "S") score += 5;
  }

  if (horse.energy < 60) {
    if (style === "E") score -= 20;
    if (style === "S") score += 10;
  } else if (horse.energy > 80) {
    if (style === "E") score += 10;
  }

  if (jockey.archetype === "front_runner" && style === "E") score += 20;
  if (jockey.archetype === "closer" && style === "S") score += 20;
  if (jockey.archetype === "clinical" && style === "P") score += 15;
  if (jockey.archetype === "finisher" && style === "S") score += 15;
  if (jockey.archetype === "versatile") score += 5;

  if (jockey.stats.pacing > 80 && style === "E") score += 10;
  if (jockey.stats.vigor > 80 && style === "S") score += 10;
  if (jockey.stats.positioning > 80 && style === "P") score += 10;

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

  const contextKey = buildStrategyContextKey(race, style);
  const successRate = getSuccessRate(aiState.learningState, "jockey_strategy", contextKey);
  const adaptiveBonus = (successRate - 0.5) * 15;
  score += adaptiveBonus;

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
