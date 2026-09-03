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

/** A single resolved run, flattened out of a race result. */
export type RaceRun = {
  horseId: string;
  seconds: number;
  perMile: number;
  distance: number;
  surface: Race["surface"];
  raceName: string;
  day: number;
};

/**
 * Flatten all resolved runs across races into a single list, normalised to
 * seconds per mile. Skips races with no results, zero distance, or invalid
 * times. Shared by `bestPerMileByHorse` and the benchmark dialog's
 * `runsForHorse` so both iterate race results identically.
 */
export function iterateRaceRuns(races: Race[]): RaceRun[] {
  const runs: RaceRun[] = [];
  for (const race of races) {
    if (!race.result || race.result.length === 0) continue;
    if (!(race.distance > 0)) continue;
    for (const res of race.result) {
      if (!Number.isFinite(res.time) || res.time <= 0) continue;
      const perMile = pacePerMile(res.time, race.distance);
      if (!Number.isFinite(perMile)) continue;
      runs.push({
        horseId: res.horseId,
        seconds: res.time,
        perMile,
        distance: race.distance,
        surface: race.surface,
        raceName: race.name,
        day: race.day,
      });
    }
  }
  return runs;
}

/**
 * Best (lowest) per-mile pace recorded by each horse across resolved races.
 *
 * @param races - All races known to the game, resolved or not.
 * @returns Map of horse id to its best run, normalised per mile.
 */
export function bestPerMileByHorse(races: Race[]): Map<string, BestPace> {
  const best = new Map<string, BestPace>();
  for (const run of iterateRaceRuns(races)) {
    const current = best.get(run.horseId);
    if (!current || run.perMile < current.perMile) {
      best.set(run.horseId, {
        seconds: run.seconds,
        perMile: run.perMile,
        distance: run.distance,
        raceName: run.raceName,
        day: run.day,
      });
    }
  }
  return best;
}
