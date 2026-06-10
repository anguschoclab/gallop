/**
 * raceHistory.ts - Race history and Triple Crown progress impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { RaceHistoryImpact, TripleCrownProgressImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { getCurrentYear } from "@/core/race/schedule";
import { GRADED_RACES } from "@/data/gradedRaces";
import type { Race, Horse } from "@/game/types";

export function generateRaceHistoryImpact(
  horse: Horse,
  position: number,
  time: number,
  race: Race,
  adjustedBeyer: number,
  newDay: number,
  runner?: { horseId: string; barrier?: number; lane?: number },
  rng?: Rng,
): RaceHistoryImpact {
  let winAndYouInQualified = undefined;
  if (position === 1 && race.graded?.winAndYouInTarget) {
    const currentYear = getCurrentYear(newDay);
    winAndYouInQualified = {
      year: currentYear,
      raceId: race.id,
      raceKey: race.graded.winAndYouInTarget,
    };
  }

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "race_history",
    horseId: horse.id,
    raceHistoryEntry: {
      raceId: race.id,
      raceName: race.name,
      position,
      day: newDay,
      beyer: adjustedBeyer,
      grade: race.graded?.grade,
      distance: race.distance,
      surface: race.graded?.surface,
      purse: race.purse,
      fieldSize: 0,
      raceClass: race.raceClass,
      barrier: runner?.barrier,
      lane: runner?.lane,
      winAndYouInQualified,
    },
    reason: "Race completed",
  } as RaceHistoryImpact;
}

export function generateTripleCrownProgressImpact(
  horse: Horse,
  position: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): TripleCrownProgressImpact | null {
  if (position === 1 && race.graded?.triplecrownKey) {
    const currentYear = getCurrentYear(newDay);
    const triplecrownKey = race.graded.triplecrownKey;
    const tcRaces = GRADED_RACES.filter((g) => g.triplecrownKey === triplecrownKey);

    const legs = tcRaces.map((tcRace) => {
      if (tcRace.key === race.graded?.key) {
        return { raceKey: tcRace.key, position, day: newDay };
      }
      const historyEntry = horse.raceHistory.find(
        (rh) => rh.raceId === tcRace.key || rh.raceName === tcRace.name,
      );
      return {
        raceKey: tcRace.key,
        position: historyEntry?.position ?? 999,
        day: historyEntry?.day ?? 0,
      };
    });

    const won = legs.every((leg) => leg.position === 1);

    return {
      id: generateUUID(rng),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "triple_crown_progress",
      horseId: horse.id,
      triplecrownKey,
      year: currentYear,
      legs,
      won,
      reason: won
        ? `Triple Crown winner! ${horse.name} won ${triplecrownKey}`
        : `Triple Crown progress updated for ${horse.name}`,
    } as TripleCrownProgressImpact;
  }
  return null;
}
