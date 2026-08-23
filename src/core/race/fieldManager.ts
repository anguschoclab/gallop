/**
 * raceFieldManager.ts - Race field management
 *
 * This file fills remaining race spots with filler horses when pre-entries don't fill
 * the race, using non-major stables and eligible filler horses.
 *
 * Dependencies: ./types (Race, Stable, Horse)
 * Related files: raceSchedule.ts (uses field management), npcRaceEntry.ts (provides entries)
 */

import type { Race } from "./types";
import type { Stable } from "@/core/stable/types";
import type { Horse } from "@/core/horse/types";

/**
 * Fill remaining race spots with filler horses.
 *
 * Called when building race field if pre-entries don't fill the race. Uses non-major stables
 * and eligible filler horses with sufficient energy.
 *
 * @param race - Race to fill
 * @param stables - Array of all stables
 * @param horses - Array of all horses
 * @param needed - Number of filler horses needed
 * @returns Object with updated race and any new horses
 */
export function fillRaceWithFillerHorses(
  race: Race,
  stables: Stable[],
  horses: Horse[],
  needed: number,
): { updatedRace: Race; newHorses: Horse[] } {
  const updatedRace = { ...race };
  const newHorses: Horse[] = [];

  // Find eligible filler horses already in the system
  const eligibleFillerHorses = horses.filter(
    (h) =>
      h.ownership?.type === "npc" && !race.entries.some((e) => e.horseId === h.id) && h.energy > 40,
  );

  // Use existing horses first
  for (const horse of eligibleFillerHorses.slice(0, needed)) {
    if (updatedRace.entries.length >= updatedRace.fieldSize) break;

    updatedRace.entries.push({
      horseId: horse.id,
      ownership: horse.ownership,
    });
  }

  return { updatedRace, newHorses };
}
