/**
 * advanceDayHelpers.ts - Pure helpers for advance-day orchestration.
 *
 * Extracted from advanceDayActions so the slice becomes a thin coordinator.
 * The pure logic (year-rollover horse filtering, player upkeep calculation)
 * lives here; the slice handles async orchestration and state mutation.
 *
 * Per PR 7 of the megaplan.
 *
 * Dependencies: @/game/types (Horse), @/core/horse/ownership (isPlayerOwned),
 *              @/core/time/year (getCurrentYear), @/constants (UPKEEP_PER_HORSE)
 * Related files: src/game/store/slices/advanceDayActions.ts (coordinator)
 */

import type { Horse } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";
import { getCurrentYear } from "@/core/race/schedule";
import { UPKEEP_PER_HORSE } from "@/constants";

/**
 * Filter horses' winAndYouInQualified entries when the year rolls over.
 * @param horses
 * @param newDay
 * @param previousDay
 */
export function filterHorsesForNewYear(
  horses: Record<string, Horse>,
  newDay: number,
  previousDay: number,
): Record<string, Horse> {
  const currentYear = getCurrentYear(newDay);
  const previousYear = getCurrentYear(previousDay);
  if (currentYear <= previousYear) return horses;
  return Object.fromEntries(
    Object.values(horses).map((h: Horse) => {
      if (h.winAndYouInQualified) {
        return [
          h.id,
          {
            ...h,
            winAndYouInQualified: h.winAndYouInQualified.filter((q) => q.year >= currentYear),
          },
        ];
      }
      return [h.id, h];
    }),
  );
}

/**
 * Calculate the player's daily upkeep cost based on owned horse count.
 * @param horses
 */
export function calculatePlayerUpkeep(horses: Record<string, Horse>): number {
  const playerHorseCount = Object.values(horses).filter((h: Horse) => isPlayerOwned(h)).length;
  return playerHorseCount * UPKEEP_PER_HORSE;
}
