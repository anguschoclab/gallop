/**
 * patternJump.ts - Pattern jump inbox notification generator
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { InboxImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { detectPatternJump } from "@/core/race/beyer";
import type { Race, Horse } from "@/game/types";

export function generatePatternJumpImpact(
  horse: Horse,
  beyerValue: number,
  race: Race,
  newDay: number,
  rng?: Rng,
): InboxImpact | null {
  if (!race.graded) return null;

  const { jumped, margin } = detectPatternJump(horse, beyerValue);
  if (!jumped) return null;

  const isAdverseWeather =
    (race.weather && (race.weather === "rainy" || race.weather === "cloudy")) ||
    race.trackCondition === "heavy" ||
    race.trackCondition === "soft" ||
    race.trackCondition === "yielding";

  const title = isAdverseWeather
    ? `Storm Performance: ${horse.name}`
    : `Performance Spike: ${horse.name}`;

  const weatherNote = isAdverseWeather
    ? ` Despite the ${race.weather} weather and ${race.trackCondition} track, this horse thrived in the adverse conditions.`
    : " This horse is on a sharp upward trajectory.";

  return {
    id: generateUUID(rng),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "inbox_message",
    message: {
      day: newDay,
      category: "race",
      priority: "info",
      title,
      body: `${horse.name} produced a massive performance jump in the ${race.name}, earning a ${beyerValue} Beyer figure (+${Math.round(margin)} improvement).${weatherNote}`,
      cta: {
        label: "View Horse",
        route: "stable.$horseId",
        params: { horseId: horse.id },
      },
    },
  } as InboxImpact;
}
