/**
 * jockeyStatsTracking.ts - Jockey stats, apprentice progression, and percentage fees
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { AnyImpact, JockeyStatsImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { updateApprenticeProgression } from "@/core/apprentice/apprenticeTypes";
import { generatePercentageJockeyFeeImpacts } from "./jockeyFees";
import { MAX_FAME, GRADED_PRIZE_SPLIT, PRIZE_SPLIT } from "@/constants";
import type { Race, Horse, Jockey } from "@/game/types";

export interface RaceResultEntry {
  horseId: string;
  position: number;
  time: number;
}

type RaceEntry = {
  horseId: string;
  owned: boolean;
  stableId?: string;
  jockeyId?: string;
};

export function generateJockeyStatsTrackingImpacts(
  horse: Horse,
  r: RaceResultEntry,
  race: Race,
  raceEntry: RaceEntry | undefined,
  jockeyMap: Map<string, Jockey>,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  const prizeSplit = race.graded ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
  if (raceEntry?.jockeyId && r.position - 1 < prizeSplit.length) {
    const jockey = jockeyMap.get(raceEntry.jockeyId);

    if (jockey) {
      const winAmount = prizeSplit[r.position - 1] * race.purse;

      // Update apprentice progression if applicable
      let apprenticeProgression = jockey.apprenticeProgression;
      if (jockey.isApprentice && apprenticeProgression && r.position === 1) {
        apprenticeProgression = updateApprenticeProgression(apprenticeProgression, false);
      }

      impacts.push({
        id: generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "jockey_stats",
        jockeyId: jockey.id,
        careerStarts: jockey.careerStarts + 1,
        careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
        fame: Math.min(MAX_FAME, jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0)),
        apprenticeProgression,
        reason: `Rode ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
      } as JockeyStatsImpact);

      const percentageFeeImpact = generatePercentageJockeyFeeImpacts(
        jockey,
        winAmount,
        newDay,
        raceEntry.owned || false,
        raceEntry.stableId,
        rng,
      );
      if (percentageFeeImpact) {
        impacts.push(percentageFeeImpact);
      }
    }
  }

  return impacts;
}
