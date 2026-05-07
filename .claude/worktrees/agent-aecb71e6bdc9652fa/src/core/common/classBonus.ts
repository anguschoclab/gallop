import type { Grade } from "@/game/gradedRaces";
import type { RaceClass } from "@/game/types";

/**
 * Pure class bonus calculation
 * Returns the Beyer class bonus for a race based on grade and class
 * Extracted from: races.tsx, race.$raceId.tsx, store.ts
 */
export function calculateClassBonus(grade?: Grade, raceClass?: RaceClass): number {
  if (grade === "G1") return 8;
  if (grade === "G2") return 5;
  if (grade === "G3") return 3;
  if (raceClass === "Group") return 4;
  if (raceClass === "Stakes") return 2;
  return 0;
}
