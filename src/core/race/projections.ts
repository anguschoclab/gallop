/**
 * projections.ts - Beyer projection calculations
 *
 * This file provides functions for calculating expected Beyer figures
 * for horses in a race, used for race analysis and predictions.
 *
 * Dependencies: @/game/types (Horse, Race), @/game/gradedRaces (Grade), ./beyerProjections (calculateProjectedBeyer)
 * Related files: races.tsx (uses for race display), store.ts (uses for race recommendations)
 */

import type { Horse, Race } from "@/game/types";
import type { Grade } from "@/data/gradedRaces";
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
 * Calculate Beyer projections for horses in a race.
 *
 * Returns a list of Beyer projections for owned horses in a race,
 * blending model expectations with recent performance.
 *
 * @param horses - All horses in the race
 * @param race - The race to project for
 * @param ownedHorseIds - Set of owned horse IDs
 * @param calibratedPars - Optional calibrated PAR values
 * @returns Array of Beyer projections
 *
 * @example
 * const projections = calculateBeyerProjections(horses, race, ownedIds);
 */
export function calculateBeyerProjections(
  horses: Horse[],
  race: Race,
  ownedHorseIds: Set<string>,
  calibratedPars: Record<number, number> = {},
): BeyerProjection[] {
  return horses
    .filter((horse) => ownedHorseIds.has(horse.id))
    .map((horse) => {
      const expectedBeyer = calculateProjectedBeyer(horse, race, calibratedPars);
      return {
        horseId: horse.id,
        horseName: horse.name,
        expectedBeyer,
        isOwned: ownedHorseIds.has(horse.id),
      };
    });
}

/**
 * Format projection message for display.
 *
 * Returns a human-readable string showing expected Beyer figures
 * for owned horses in a race.
 *
 * @param projections - Array of Beyer projections
 * @returns Formatted message string
 *
 * @example
 * const message = formatProjectionMessage(projections);
 * // Returns "Expected Beyer: Horse A: 95 Beyer, Horse B: 88 Beyer"
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
