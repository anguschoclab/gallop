/**
 * raceNameGenerator.ts - Race name generation (re-exports + main generators)
 *
 * This file now re-exports utility functions and pattern generators from
 * dedicated modules for backward compatibility, and retains the main
 * generateRaceName and generateRaceCardNames functions.
 */

import type { RaceClass } from "@/platform/game/types";
import type { Track } from "@/shared/data/accessors/tracksAccessor";
import { getRegionalSystem, type RaceNameParams } from "@/domains/race/simulation/naming/raceNameUtils";
import { selectNamingPattern, generateNameByPattern, ensureUnique } from "@/domains/race/simulation/naming/raceNamePatterns";

// Re-export utilities and types for backward compatibility
export {
  formatClaimingPrice,
  formatWinCondition,
  getRaceClassAbbreviation,
  getRegionalSystem,
} from "@/domains/race/simulation/naming/raceNameUtils";
export type { RaceNameParams } from "@/domains/race/simulation/naming/raceNameUtils";

export function generateRaceName(params: RaceNameParams): string {
  const { track, usedNames = new Set<string>(), rng } = params;

  const region = getRegionalSystem(track);

  const hasWinCondition = params.winCondition !== undefined && params.winCondition !== "none";

  const hasClaimingPrice = params.claimingPrice !== undefined && params.claimingPrice > 0;

  const pattern = selectNamingPattern(
    params.raceClass,
    region,
    rng,
    hasWinCondition,
    hasClaimingPrice,
  );

  let name = generateNameByPattern(pattern, params, region);

  name = ensureUnique(name, usedNames);

  usedNames.add(name);

  return name;
}

export function generateRaceCardNames(
  track: Track,
  raceClasses: RaceClass[],
  additionalParams: Omit<RaceNameParams, "raceClass" | "track"> = {},
): string[] {
  const usedNames = new Set<string>();
  const names: string[] = [];

  for (const raceClass of raceClasses) {
    const name = generateRaceName({
      ...additionalParams,
      track,
      raceClass,
      usedNames,
    });
    names.push(name);
  }

  return names;
}
