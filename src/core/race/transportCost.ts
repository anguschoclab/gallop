import type { Race } from "@/game/types";

/**
 * Calculate transport cost for a race based on grade.
 *
 * Centralised here to avoid duplication across autoRegister.ts,
 * RaceEntry.tsx, and race entry resolution logic.
 * @param race
 */
export function getTransportCostForRace(race: Race): number {
  if (!race.graded) return 150;

  switch (race.graded.grade) {
    case "G1":
      return 500;
    case "G2":
      return 400;
    case "G3":
      return 300;
    default:
      return 200;
  }
}
