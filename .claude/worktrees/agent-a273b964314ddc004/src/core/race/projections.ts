import type { Horse, Race } from "@/game/types";
import type { Grade } from "@/game/gradedRaces";
import { calculateProjectedBeyer } from "./beyerProjections";

/**
 * Pure Beyer projection logic
 * Extracted from: races.tsx (lines 587-633)
 */

export interface BeyerProjection {
  horseId: string;
  horseName: string;
  expectedBeyer: number;
  isOwned: boolean;
}

/**
 * Calculate Beyer projections for horses in a race
 */
export function calculateBeyerProjections(
  horses: Horse[],
  race: Race,
  ownedHorseIds: Set<string>,
): BeyerProjection[] {
  return horses
    .filter((horse) => ownedHorseIds.has(horse.id))
    .map((horse) => {
      const expectedBeyer = calculateProjectedBeyer(horse, race);
      return {
        horseId: horse.id,
        horseName: horse.name,
        expectedBeyer,
        isOwned: ownedHorseIds.has(horse.id),
      };
    });
}

/**
 * Format projection message for display
 */
export function formatProjectionMessage(projections: BeyerProjection[]): string {
  if (projections.length === 0) {
    return "No horses entered.";
  }

  const ownedProjections = projections.filter((p) => p.isOwned);
  if (ownedProjections.length === 0) {
    return "No owned horses entered.";
  }

  const messages = ownedProjections.map((p) => `${p.horseName}: ${p.expectedBeyer} Beyer`);
  return `Expected Beyer: ${messages.join(", ")}`;
}
