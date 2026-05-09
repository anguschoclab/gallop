import { expectedBeyer } from "@/game/beyer";
import { calculateClassBonus } from "@/core/common/classBonus";
import { getCourseForRace } from "@/game/tracks";
import type { Horse, Race } from "@/game/types";

/**
 * Calculate projected Beyer for a horse in a race
 * Blends model expectation with recent Beyer average for stability
 */
export function calculateProjectedBeyer(
  horse: Horse,
  race: Race,
  calibratedPars: Record<number, number> = {},
): number {
  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
  const course = getCourseForRace(race);
  const model = expectedBeyer(horse, race.distance, classBonus, course, calibratedPars);
  // Distance bonus applied AFTER the model so it survives the [30, 125]
  // clamp inside beyerFigure. Longer races deserve bigger Beyer figures
  // even when calibrated pars are empty.
  const distanceBonus = race.distance >= 1600 ? 5 : race.distance >= 1200 ? 2 : 0;
  const recent = horse.raceHistory
    .slice(0, 3)
    .map((r) => r.beyer)
    .filter((b): b is number => typeof b === "number");
  const avgRecent = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : null;
  const blended = avgRecent !== null ? model * 0.6 + avgRecent * 0.4 : model;
  return Math.round(blended + distanceBonus);
}
