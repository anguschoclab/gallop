/**
 * beyerRecovery.ts - Beyer figure and recovery impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { BeyerImpact, RecoveryImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { beyerFigure } from "@/core/race/beyer";
import { getPeakingBeyerMultiplier } from "@/core/health/banister";
import {
  STAMINA_DRAIN_DISTANCE_DIVISOR,
  STAMINA_DRAIN_BEYER_DIVISOR,
  STAMINA_DRAIN_MAX,
} from "@/constants";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import type { Race, Horse } from "@/game/types";

export function generateBeyerAndRecoveryImpacts(
  horse: Horse,
  position: number,
  time: number,
  race: Race,
  classBonus: number,
  calibratedPars: Record<number, number>,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): { beyerImpact: BeyerImpact; recoveryImpact: RecoveryImpact } {
  const beyer = beyerFigure({
    distance: race.distance,
    finishTime: time,
    classBonus,
    calibratedPars,
  });
  const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
  const dampener = inbreedingPerformanceDampener(inbreedingPattern);
  const peakingMultiplier = getPeakingBeyerMultiplier(horse.peakingIndex ?? 0);
  const adjustedBeyer = Math.max(0, Math.round((beyer - dampener) * peakingMultiplier));

  const recoveryDrain = Math.min(
    STAMINA_DRAIN_MAX,
    Math.floor(race.distance / STAMINA_DRAIN_DISTANCE_DIVISOR) +
      Math.floor(adjustedBeyer / STAMINA_DRAIN_BEYER_DIVISOR),
  );

  return {
    beyerImpact: {
      id: getId ? getId() : generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "beyer_update",
      horseId: horse.id,
      beyer: adjustedBeyer,
      raceDay: newDay,
      reason: "Race performance",
    } as BeyerImpact,
    recoveryImpact: {
      id: getId ? getId() : generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "recovery_change",
      horseId: horse.id,
      delta: -recoveryDrain,
      reason: "Race fatigue",
    } as RecoveryImpact,
  };
}
