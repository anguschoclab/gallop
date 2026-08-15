/**
 * energyFormFame.ts - Energy, form, and fame impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type {
  EnergyImpact,
  FormImpact,
  FameImpact,
  FanCountImpact,
} from "@/core/resolver/impacts/index";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { RACE_ENERGY_IMPACT, FANS_PER_FAME_POINT } from "@/constants";
import type { Horse } from "@/game/types";

export function generateEnergyImpact(horseId: string, newDay: number, rng?: Rng): EnergyImpact {
  return {
    id: generateUUID(rng),
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
): FormImpact {
  const stableId = horse.stableId || "";
  const groom = hiredStaff.find((s) => s.role === "groom" && s.stableId === stableId);

  const baseFormDelta =
    position === 1 ? 3 : position === 2 ? 2 : position === 3 ? 1 : position <= 5 ? 0 : -1;
  const formDelta = baseFormDelta < 0 && groom ? 0 : baseFormDelta;

  return {
    id: generateUUID(rng),
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
): FameImpact | null {
  const fameDelta = position === 1 ? 2 : position <= 3 ? 0.5 : 0;
  if (fameDelta > 0) {
    return {
      id: generateUUID(rng),
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

export function generateFanCountImpact(
  horse: Horse,
  position: number,
  newDay: number,
  rng?: Rng,
): FanCountImpact | null {
  const fameDelta = position === 1 ? 2 : position <= 3 ? 0.5 : 0;
  if (fameDelta > 0) {
    const fanDelta = Math.round(fameDelta * FANS_PER_FAME_POINT);
    return {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "fan_count_change",
      horseId: horse.id,
      delta: fanDelta,
      reason: `Race position: ${position}`,
    } as FanCountImpact;
  }
  return null;
}
