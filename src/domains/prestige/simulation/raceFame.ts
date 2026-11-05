/**
 * raceFame.ts - The single rule for how much fame a race finish earns.
 *
 * Grade/position base + purse bonus, scaled by the racecourse's prestige
 * (floored at MIN_FAME_GAIN). Used by race resolution for every runner,
 * player and rival alike, so a finish is credited exactly once.
 */

import type { Race } from "@/platform/game/types";
import { racecoursePrestigeMultiplier } from "@/domains/prestige/simulation/racecoursePrestige";
import { MIN_FAME_GAIN } from "@/domains/prestige/model/prestigeTypes";
import {
  FAME_GAIN_G1_WIN,
  FAME_GAIN_G2_WIN,
  FAME_GAIN_G3_WIN,
  FAME_GAIN_OTHER_WIN,
  FAME_GAIN_G1_TOP3,
  FAME_GAIN_G2_TOP3,
  FAME_GAIN_G3_TOP3,
  FAME_GAIN_OTHER_TOP3,
  FAME_GAIN_TOP5,
  FAME_BONUS_LARGE_PURSE,
  FAME_BONUS_MEDIUM_PURSE,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
} from "@/domains/prestige/model/fameConstants";

type FameRace = Pick<Race, "purse" | "trackId"> & {
  graded?: { grade?: string; track?: string; trackId?: string } | null;
};

/**
 * Fame earned for finishing `position` in `race` (0 outside the top 5).
 * @param race - Race with grade, purse and venue
 * @param position - Finishing position (1-based)
 */
export function raceFameGain(race: FameRace, position: number): number {
  const grade = race.graded?.grade;
  let gain = 0;
  if (position === 1) {
    gain =
      grade === "G1"
        ? FAME_GAIN_G1_WIN
        : grade === "G2"
          ? FAME_GAIN_G2_WIN
          : grade === "G3"
            ? FAME_GAIN_G3_WIN
            : FAME_GAIN_OTHER_WIN;
  } else if (position <= 3) {
    gain =
      grade === "G1"
        ? FAME_GAIN_G1_TOP3
        : grade === "G2"
          ? FAME_GAIN_G2_TOP3
          : grade === "G3"
            ? FAME_GAIN_G3_TOP3
            : FAME_GAIN_OTHER_TOP3;
  } else if (position <= 5) {
    gain = FAME_GAIN_TOP5;
  }
  if (gain <= 0) return 0;

  if (race.purse > LARGE_PURSE_THRESHOLD) gain += FAME_BONUS_LARGE_PURSE;
  else if (race.purse > MEDIUM_PURSE_THRESHOLD) gain += FAME_BONUS_MEDIUM_PURSE;

  const venue = racecoursePrestigeMultiplier(
    race.trackId ?? race.graded?.trackId,
    race.graded?.track,
  );
  return Math.max(MIN_FAME_GAIN, Math.round(gain * venue));
}
