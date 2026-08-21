/**
 * bumpResolver.ts - Resolves bumping logic when a race is full.
 *
 * Provides a unified function to find the weakest NPC entry that can be bumped
 * by a challenger horse.
 */

import type { Horse, RaceEntry } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { BUMP_RATING_MARGIN } from "@/constants";

/**
 * Evaluates race entries to find the weakest NPC entry that can be bumped by a challenger.
 * Players' entries are never bumped.
 *
 * @param entries - Current race entries
 * @param challenger - The horse attempting to enter
 * @param horseLookup - Function or map/object to look up a horse by ID
 * @returns The index of the bumped entry, or -1 if no bump is possible
 */
export function findBumpableEntryIndex(
  entries: RaceEntry[],
  challenger: Horse,
  horseLookup: (id: string) => Horse | undefined,
): number {
  const challengerRating = calculateOverallRating(challenger);
  let weakestIdx = -1;
  let weakestRating = Infinity;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.ownership?.type === "player") continue; // never bump player

    const existing = horseLookup(entry.horseId);
    if (!existing) continue;

    const r = calculateOverallRating(existing);
    if (r < weakestRating) {
      weakestRating = r;
      weakestIdx = i;
    }
  }

  if (weakestIdx === -1 || challengerRating <= weakestRating + BUMP_RATING_MARGIN) {
    return -1;
  }

  return weakestIdx;
}
