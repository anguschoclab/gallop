/**
 * energyFormFame.ts - Energy, form, and fame impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { EnergyImpact, FormImpact, FameImpact } from "@/platform/resolver/impacts";
import type { StaffMember } from "@/domains/staff/model/staffTypes";
import type { Rng } from "@/shared/common/rng";
import { generateUUID } from "@/shared/uuid/uuid";
import { RACE_ENERGY_IMPACT } from "@/domains/race/model/raceSimulationConstants";;
import type { Horse } from "@/platform/game/types";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";

export function generateEnergyImpact(
  horseId: string,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): EnergyImpact {
  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "energy_change",
    horseId,
    delta: RACE_ENERGY_IMPACT,
    reason: "Race energy expenditure",
  } as EnergyImpact;
}

export function generateFormImpact(
  horse: Horse,
  position: number,
  newDay: number,
  hiredStaff: StaffMember[],
  rng?: Rng,
  getId?: () => string,
): FormImpact {
  const playerOwned = isPlayerOwned(horse);
  const groom = hiredStaff.find(
    (s) =>
      s.role === "groom" &&
      (playerOwned
        ? !s.stableId
        : horse.ownership?.type === "npc" && s.stableId === horse.ownership.stableId),
  );

  const baseFormDelta =
    position === 1 ? 3 : position === 2 ? 2 : position === 3 ? 1 : position <= 5 ? 0 : -1;
  const formDelta = baseFormDelta < 0 && groom ? 0 : baseFormDelta;

  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "form_change",
    horseId: horse.id,
    delta: formDelta,
    reason: `Race position: ${position}`,
  } as FormImpact;
}

export function generateFameImpact(
  horse: Horse,
  position: number,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
  grade?: string,
): FameImpact | null {
  // Graded results carry far more reputation than ordinary wins.
  const gradeMult =
    grade === "G1"
      ? 4
      : grade === "G2"
        ? 2.5
        : grade === "G3"
          ? 1.75
          : grade === "Listed"
            ? 1.35
            : 1;
  const baseDelta = position === 1 ? 2 : position <= 3 ? 0.5 : 0;
  const fameDelta = Math.round(baseDelta * gradeMult * 100) / 100;
  if (fameDelta > 0) {
    return {
      id: getId ? getId() : generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "fame_change",
      horseId: horse.id,
      delta: fameDelta,
      reason: `Race position: ${position}`,
    } as FameImpact;
  }
  return null;
}
