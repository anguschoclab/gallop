import type { Horse, Race } from "@/game/types";
import type { Grade } from "@/game/gradedRaces";
import { calculateClassBonus } from "@/core/common/classBonus";
import { calculateOverallRating } from "@/core/horse/stats";

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
  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);

  return horses
    .filter((horse) => ownedHorseIds.has(horse.id))
    .map((horse) => {
      const expectedBeyer = calculateExpectedBeyer(horse, race.distance, classBonus);
      return {
        horseId: horse.id,
        horseName: horse.name,
        expectedBeyer,
        isOwned: ownedHorseIds.has(horse.id),
      };
    });
}

/**
 * Calculate expected Beyer for a horse
 * Based on overall rating, class bonus, and distance
 */
function calculateExpectedBeyer(horse: Horse, distance: number, classBonus: number): number {
  const overall = calculateOverallRating(horse);
  const baseBeyer = overall * 1.2;
  const distanceFactor = distance >= 1600 ? 5 : distance >= 1200 ? 2 : 0;
  return Math.round(baseBeyer + classBonus + distanceFactor);
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
