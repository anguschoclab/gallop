/**
 * utils.ts - Shared race utilities
 */

import { GRADED_PRIZE_SPLIT, PRIZE_SPLIT } from "@/constants/gameConstants";
import type { Race } from "@/game/types";

/**
 * Returns the correct prize money split array based on whether the race is graded.
 *
 * @param race - The race to check
 * @returns An array of prize splits by percentage
 */
export function getPrizeSplitForRace(race: Race): number[] {
  if (race.graded) return GRADED_PRIZE_SPLIT;
  return PRIZE_SPLIT;
}
