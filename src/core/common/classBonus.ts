/**
 * classBonus.ts - Class bonus calculation
 *
 * This file provides a pure function for calculating Beyer class bonuses based on
 * race grade and class level.
 *
 * Dependencies: @/game/gradedRaces (Grade), @/game/types (RaceClass)
 * Related files: None
 */

import type { Grade } from "@/game/gradedRaces";
import type { RaceClass } from "@/game/types";

/**
 * Calculate the Beyer class bonus for a race based on grade and class.
 *
 * Higher grades and classes provide larger bonuses to Beyer figures.
 *
 * @param grade - Race grade (G1, G2, G3)
 * @param raceClass - Race class (Group, Stakes, etc.)
 * @returns Class bonus value
 *
 * @example
 * const bonus = calculateClassBonus("G1", "Group"); // 8
 */
export function calculateClassBonus(grade?: Grade, raceClass?: RaceClass): number {
  if (grade === "G1") return 8;
  if (grade === "G2") return 5;
  if (grade === "G3") return 3;
  if (raceClass === "Group") return 4;
  if (raceClass === "Stakes") return 2;
  return 0;
}
