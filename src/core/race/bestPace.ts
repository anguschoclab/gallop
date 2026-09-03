/**
 * bestPace.ts - Career best per-mile pace for each horse
 *
 * Race history entries store placings but not clock times, so the best time a
 * horse has recorded is derived from resolved races. Times over different trips
 * are normalised to seconds per mile so they compare directly in the race
 * preview.
 */

import { pacePerMile } from "@/core/common/formatting";
import type { Race } from "@/core/race/types";

export interface BestPace {
  /** Final time of the best run, in seconds. */
  seconds: number;
  /** Normalised seconds per mile for that run. */
  perMile: number;
  /** Distance of the run in metres. */
  distance: number;
  raceName: string;
  day: number;
}

/**
 * Best (lowest) per-mile pace recorded by each horse across resolved races.
 *
 * @param races - All races known to the game, resolved or not.
 * @returns Map of horse id to its best run, normalised per mile.
 */
export function bestPerMileByHorse(races: Race[]): Map<string, BestPace> {
  const best = new Map<string, BestPace>();
  for (const race of races) {
    if (!race.result || race.result.length === 0) continue;
    if (!(race.distance > 0)) continue;
    for (const res of race.result) {
      if (!Number.isFinite(res.time) || res.time <= 0) continue;
      const perMile = pacePerMile(res.time, race.distance);
      if (!Number.isFinite(perMile)) continue;
      const current = best.get(res.horseId);
      if (!current || perMile < current.perMile) {
        best.set(res.horseId, {
          seconds: res.time,
          perMile,
          distance: race.distance,
          raceName: race.name,
          day: race.day,
        });
      }
    }
  }
  return best;
}
