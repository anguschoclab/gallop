/**
 * jockeyAffinity.ts - Jockey affinity XP gain impact generator
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { JockeyAffinityImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { AFFINITY_CONSTANTS, calculateTraitAffinitySynergy } from "@/core/jockey/affinity";
import type { Race, Horse, Jockey } from "@/game/types";

export function generateJockeyAffinityImpact(
  horse: Horse,
  jockey: Jockey,
  position: number,
  race: Race,
  beyerValue: number,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): JockeyAffinityImpact {
  let xpGain = AFFINITY_CONSTANTS.XP_PER_RACE;

  if (position === 1) {
    xpGain += AFFINITY_CONSTANTS.XP_PER_WIN_BONUS;
  }

  const fieldSize = race.entries?.length || position;
  if (position > 10 && position > fieldSize / 2) {
    xpGain += AFFINITY_CONSTANTS.XP_POOR_RACE_PENALTY;
  }

  if (position <= 3 && beyerValue > 100) {
    xpGain += 5;
  }

  xpGain = Math.round(xpGain * calculateTraitAffinitySynergy(jockey, horse));

  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "jockey_affinity_gain",
    jockeyId: jockey.id,
    horseId: horse.id,
    xp: xpGain,
    reason: `Raced ${horse.name} to ${position}${getOrdinalSuffix(position)}${xpGain < 0 ? " (poor performance penalty)" : ""}`,
  } as JockeyAffinityImpact;
}

export function generateWorkoutAffinityImpact(
  horse: Horse,
  jockey: Jockey,
  trainingType: string,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): JockeyAffinityImpact {
  let xpGain = AFFINITY_CONSTANTS.XP_PER_WORKOUT;

  const traits = jockey.traits ?? [];
  if (traits.includes("sprint_specialist") && trainingType === "speed") xpGain += 5;
  if (traits.includes("staying_specialist") && trainingType === "stamina") xpGain += 5;
  if (traits.includes("gate_master") && trainingType === "gate_work") xpGain += 5;

  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "trainingResolution",
    logLevel: "conditional",
    type: "jockey_affinity_gain",
    jockeyId: jockey.id,
    horseId: horse.id,
    xp: xpGain,
    reason: `Workout (${trainingType}) with ${horse.name}`,
  } as JockeyAffinityImpact;
}
