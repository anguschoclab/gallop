/**
 * insights.ts - Horse insight coordinator
 *
 * Returns a single insight describing the horse's most notable racing pattern.
 * Delegates to individual detectors registered in INSIGHT_DETECTORS (priority order).
 * The first detector that returns a non-null result wins.
 *
 * Dependencies: @/core/horse/types (Horse), @/core/horse/insightDetectors (INSIGHT_DETECTORS)
 * Related files: src/core/horse/insightDetectors.ts (individual detectors)
 */

import type { Horse } from "./types";
import { INSIGHT_DETECTORS } from "./insightDetectors";

export type HorseInsight = {
  label: string;
  value: string;
  context: string;
  type: "positive" | "neutral" | "negative";
};

/**
 * Returns the most notable insight for a horse, or null if the horse
 * has fewer than 3 career starts or no pattern matches.
 *
 * Iterates the INSIGHT_DETECTORS registry in priority order and returns
 * the first non-null result.
 *
 * @param horse - The horse to evaluate.
 */
export function getHorseInsight(horse: Horse): HorseInsight | null {
  const history = horse.raceHistory ?? [];
  if (history.length < 3) return null;

  for (const detector of INSIGHT_DETECTORS) {
    const insight = detector(horse);
    if (insight !== null) return insight;
  }

  return null;
}
