/**
 * fans.ts - Fan count utilities
 *
 * Fan count is derived from fame but stored as a separate accumulator that
 * grows independently via race performance and decays over time during inactivity.
 *
 * Dependencies: @/game/types (Horse, Race), @/constants (fan constants)
 * Related files: ../npc/npcCycle.ts (uses for fan gains), ../time/phases/npcCycle.ts (uses for decay)
 */

import type { Horse, Race } from "@/game/types";
import {
  FANS_PER_FAME_POINT,
  FAN_GAIN_G1_WIN,
  FAN_GAIN_G2_WIN,
  FAN_GAIN_G3_WIN,
  FAN_GAIN_OTHER_WIN,
  FAN_GAIN_TOP3_G1,
  FAN_GAIN_TOP3_G2,
  FAN_GAIN_TOP3_G3,
  FAN_GAIN_TOP3_OTHER,
  FAN_GAIN_TOP5,
  FAN_BONUS_LARGE_PURSE,
  FAN_BONUS_MEDIUM_PURSE,
  FAN_DAILY_DECAY_RATE,
  FAN_DECAY_GRACE_DAYS,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
} from "@/constants";

/**
 * Derive a baseline fan count from a fame value.
 * @param fame - Fame value (0-100)
 * @returns Baseline fan count
 */
export function deriveFanCount(fame: number): number {
  return Math.round(fame * FANS_PER_FAME_POINT);
}

/**
 * Calculate fan gains for horses based on race results.
 * Mirrors calculateFameGainsForRaces but uses fan constants.
 * @param races - Array of resolved races with results
 * @returns Map of horseId to fan gain amount
 */
export function calculateFanGainsForRaces(races: Race[]): Map<string, number> {
  const fanGains = new Map<string, number>();

  for (const race of races) {
    if (!race.result) continue;
    for (const result of race.result) {
      let fanGain = 0;

      if (result.position === 1) {
        fanGain =
          race.graded?.grade === "G1"
            ? FAN_GAIN_G1_WIN
            : race.graded?.grade === "G2"
              ? FAN_GAIN_G2_WIN
              : race.graded?.grade === "G3"
                ? FAN_GAIN_G3_WIN
                : FAN_GAIN_OTHER_WIN;
      } else if (result.position <= 3) {
        fanGain =
          race.graded?.grade === "G1"
            ? FAN_GAIN_TOP3_G1
            : race.graded?.grade === "G2"
              ? FAN_GAIN_TOP3_G2
              : race.graded?.grade === "G3"
                ? FAN_GAIN_TOP3_G3
                : FAN_GAIN_TOP3_OTHER;
      } else if (result.position <= 5) {
        fanGain = FAN_GAIN_TOP5;
      }

      if (race.purse > LARGE_PURSE_THRESHOLD) {
        fanGain += FAN_BONUS_LARGE_PURSE;
      } else if (race.purse > MEDIUM_PURSE_THRESHOLD) {
        fanGain += FAN_BONUS_MEDIUM_PURSE;
      }

      if (fanGain > 0) {
        const current = fanGains.get(result.horseId) || 0;
        fanGains.set(result.horseId, current + fanGain);
      }
    }
  }

  return fanGains;
}

/**
 * Apply fan gains to an array of horses.
 * @param horses - Current horse array
 * @param fanGains - Map of horseId to fan gain
 * @returns Updated horse array with applied fan gains
 */
export function applyFanGainsToHorses(horses: Horse[], fanGains: Map<string, number>): Horse[] {
  return horses.map((h) => {
    const gain = fanGains.get(h.id);
    if (gain) {
      return { ...h, fanCount: Math.max(0, (h.fanCount ?? 0) + gain) };
    }
    return h;
  });
}

/**
 * Apply daily fan decay to horses that have been inactive beyond the grace period.
 * @param horses - Current horse array
 * @param currentDay - The current game day
 * @returns Updated horse array with decayed fan counts
 */
export function applyFanDecay(horses: Horse[], currentDay: number): Horse[] {
  return horses.map((h) => {
    const lastRaceDay = h.lastRaceDay ?? 0;
    const daysSinceRace = currentDay - lastRaceDay;
    if (daysSinceRace <= FAN_DECAY_GRACE_DAYS) return h;
    if ((h.fanCount ?? 0) <= 0) return h;

    const decayedFanCount = Math.max(0, Math.round(h.fanCount * (1 - FAN_DAILY_DECAY_RATE)));
    if (decayedFanCount === h.fanCount) return h;
    return { ...h, fanCount: decayedFanCount };
  });
}
