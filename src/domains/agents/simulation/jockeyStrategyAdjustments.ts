import type { Horse, Race, Jockey, RunningStyle } from "@/game/types";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";

export function adjustForTrackCondition(
  instructions: JockeyInstructions,
  horse: Horse,
  race: Race,
): JockeyInstructions {
  const condition = race.trackCondition;

  if (!condition || condition === "fast" || condition === "good") {
    return instructions;
  }

  const mudAptitude = horse.mudAptitude ?? 0.5;

  if (mudAptitude < 0.3) {
    return {
      ...instructions,
      aggressiveness: Math.max(20, instructions.aggressiveness - 15),
      moveTiming: instructions.moveTiming === "early" ? "mid" : instructions.moveTiming,
    };
  }

  if (mudAptitude > 0.7) {
    return {
      ...instructions,
      aggressiveness: Math.min(100, instructions.aggressiveness + 10),
    };
  }

  return instructions;
}

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

    if (horse.distanceAptitude < 0.4) frontRunners++;
    if (horse.distanceAptitude > 0.7) closers++;
  }

  const fieldSize = race.entries.length;
  const frontRunnerRatio = frontRunners / fieldSize;
  const closerRatio = closers / fieldSize;

  if (frontRunnerRatio > 0.4 && baseStyle === "E") {
    return "S";
  }

  if (closerRatio > 0.4 && baseStyle === "S") {
    return "E";
  }

  if (fieldSize > 12 && baseStyle === "P") {
    return "S";
  }

  return baseStyle;
}

export function calculateAffinityBoost(jockey: Jockey, horseId: string): number {
  const affinity = jockey.affinityMap[horseId] ?? 0;
  const boost = 1 + Math.min(0.3, (affinity / 10) * 0.05);
  return boost;
}

export function applyAffinityBoost(
  instructions: JockeyInstructions,
  jockey: Jockey,
  horseId: string,
): JockeyInstructions {
  const boost = calculateAffinityBoost(jockey, horseId);

  if (boost <= 1.0) return instructions;

  const aggressivenessBoost = Math.round((boost - 1) * 20);

  const affinity = jockey.affinityMap[horseId] ?? 0;

  let moveTiming = instructions.moveTiming;
  if (affinity >= 400 && moveTiming === "mid") {
    moveTiming = "late";
  } else if (affinity >= 150 && moveTiming === "early") {
    moveTiming = "mid";
  }

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
