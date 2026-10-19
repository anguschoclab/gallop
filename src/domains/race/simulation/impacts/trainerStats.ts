/**
 * trainerStats.ts - Trainer stats update impact generator
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { TrainerStatsImpact } from "@/platform/resolver/impacts";
import type { StaffMember } from "@/domains/staff/model/staffTypes";
import type { Rng } from "@/shared/common/rng";
import { generateUUID } from "@/shared/uuid/uuid";
import { getOrdinalSuffix } from "@/shared/common/ordinal";
import type { Race, Horse } from "@/platform/game/types";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";

export function generateTrainerStatsImpact(
  horse: Horse,
  position: number,
  race: Race,
  hiredStaff: StaffMember[],
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): TrainerStatsImpact | null {
  const playerOwned = isPlayerOwned(horse);
  const assignedTrainer = hiredStaff.find(
    (s) =>
      s.role === "trainer" &&
      (playerOwned
        ? !s.stableId
        : horse.ownership?.type === "npc" && s.stableId === horse.ownership.stableId),
  );
  if (!assignedTrainer) return null;

  const isWin = position === 1;
  const isPlace = position === 2;
  const isShow = position === 3;

  let fameDelta = 0;
  if (isWin) {
    fameDelta = race.graded?.grade === "G1" ? 10 : race.graded ? 5 : 2;
  } else if (isPlace || isShow) {
    fameDelta = 1;
  } else if (position > 10) {
    fameDelta = -1;
  }

  let specialty: string | undefined;
  if (race.distance && race.distance <= 1400) {
    specialty = "sprinter";
  } else if (race.distance && race.distance >= 2000) {
    specialty = "router";
  }
  if (race.surface) {
    specialty = race.surface.toLowerCase();
  }

  return {
    id: getId ? getId() : generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "conditional",
    type: "trainer_stats",
    staffId: assignedTrainer.id,
    raceRecord: {
      wins: isWin ? 1 : 0,
      places: isPlace ? 1 : 0,
      shows: isShow ? 1 : 0,
      starts: 1,
    },
    fameDelta,
    specialty,
    reason: `${assignedTrainer.person.biography.displayName} trained ${horse.name} to ${position}${getOrdinalSuffix(position)} in ${race.name}`,
  } as TrainerStatsImpact;
}
