/**
 * Regional naming conventions for horses.
 */

import type { Rng } from "@/game/rng";
import type { RegionalSystem } from "@/game/types";
import { LOCATIONS, SPONSORS } from "@/core/race/naming/namePools";

export function generateRegionalName(region: RegionalSystem, rng: Rng): string {
  const locs = LOCATIONS[region] || LOCATIONS.north_america;
  const sponsors = SPONSORS[region] || SPONSORS.north_america;

  const patterns = [
    (l: string, s: string) => `${l} ${s}`,
    (l: string, s: string) => `${s} of ${l}`,
    (l: string, s: string) => `Pride of ${l}`,
    (l: string, s: string) => `${l} Star`,
  ];

  const l = locs[rng.int(0, locs.length - 1)];
  const s = sponsors[rng.int(0, sponsors.length - 1)];
  const pattern = patterns[rng.int(0, patterns.length - 1)];

  return pattern(l, s).slice(0, 18);
}
