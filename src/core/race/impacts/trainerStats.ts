/**
 * trainerStats.ts - Trainer stats update impact generator
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { TrainerStatsImpact } from "@/core/resolver/impacts/index";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import type { Race, Horse } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";

export function generateTrainerStatsImpact(
  horse: Horse,
  position: number,
  race: Race,
  hiredStaff: StaffMember[],
  newDay: number,
  rng?: Rng,
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
    id: generateUUID(rng),
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
    reason: `${assignedTrainer.name} trained ${horse.name} to ${position}${getOrdinalSuffix(position)} in ${race.name}`,
  } as TrainerStatsImpact;
}
