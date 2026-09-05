/**
 * venuePayout.ts - Venue prestige scaling for race payouts
 *
 * Purse payouts scale with the prestige of the racecourse staging the race:
 * a win at a marquee course pays more than the same purse at a country track.
 *
 * Dependencies: @/core/prestige (racecoursePrestigeMultiplier)
 * Related files: src/core/race/impacts/prizeMoney.ts, src/game/store/helpers/raceResolution.ts
 */

import { racecoursePrestigeMultiplier } from "@/core/prestige";

export type VenueLike = {
  trackId?: string;
  graded?: { track?: string; trackId?: string } | undefined;
};

/**
 * Multiplier applied to prize money based on the racecourse's prestige.
 * Returns 1 when the venue is unknown.
 * @param race - Race (or race-like object) carrying track identity
 */
export function venuePayoutMultiplier(race?: VenueLike | null): number {
  if (!race) return 1;
  const trackId = race.trackId ?? race.graded?.trackId;
  const trackName = race.graded?.track;
  if (!trackId && !trackName) return 1;
  return racecoursePrestigeMultiplier(trackId, trackName);
}

/**
 * Applies the venue prestige multiplier to a base prize amount.
 * @param base - Base prize amount before prestige scaling
 * @param race - Race (or race-like object) carrying track identity
 */
export function applyVenuePayout(base: number, race?: VenueLike | null): number {
  if (base <= 0) return base;
  return Math.round(base * venuePayoutMultiplier(race));
}
