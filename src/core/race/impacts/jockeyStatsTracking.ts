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
import type { Race, Horse, Jockey, RaceResult, RaceEntry } from "@/game/types";

export function generateJockeyStatsTrackingImpacts(
  horse: Horse,
  r: RaceResult,
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

      // Compute trait XP awards based on race context
      const traitXpAwards: Record<string, number> = {};
      const isTop3 = r.position <= 3;
      const isWinner = r.position === 1;
      const surface = race.surface;
      const distance = race.distance;
      const fieldSize = race.fieldSize ?? 0;
      const isWet = race.weather === "rainy";

      if (isTop3) {
        if (surface === "Turf")
          traitXpAwards["turf_specialist"] = (traitXpAwards["turf_specialist"] ?? 0) + 15;
        if (surface === "Dirt")
          traitXpAwards["dirt_specialist"] = (traitXpAwards["dirt_specialist"] ?? 0) + 15;
        if (isWet) traitXpAwards["mud_master"] = (traitXpAwards["mud_master"] ?? 0) + 15;
        if (distance < 1400)
          traitXpAwards["sprint_specialist"] = (traitXpAwards["sprint_specialist"] ?? 0) + 15;
        if (distance > 2200)
          traitXpAwards["staying_specialist"] = (traitXpAwards["staying_specialist"] ?? 0) + 15;
        if (fieldSize > 12)
          traitXpAwards["big_match_temperament"] =
            (traitXpAwards["big_match_temperament"] ?? 0) + 15;
        if (jockey.age >= 35)
          traitXpAwards["veteran_poise"] = (traitXpAwards["veteran_poise"] ?? 0) + 15;
      }

      // Archetype-aligned trait XP for all finishers
      const archetypeTraitMap: Record<string, string> = {
        front_runner: "gate_master",
        closer: "hill_specialist",
        clinical: "bullring_expert",
        finisher: "long_straight_pro",
      };
      const archetypeTrait = archetypeTraitMap[jockey.archetype];
      if (archetypeTrait) {
        traitXpAwards[archetypeTrait] = (traitXpAwards[archetypeTrait] ?? 0) + 5;
      }

      // Winner gets bonus XP to all active traits
      if (isWinner && jockey.traits.length > 0) {
        for (const trait of jockey.traits) {
          traitXpAwards[trait] = (traitXpAwards[trait] ?? 0) + 10;
        }
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
        stableAffinityDelta: r.position === 1 ? 5 : r.position <= 3 ? 2 : 0,
        apprenticeProgression,
        traitXpAwards: Object.keys(traitXpAwards).length > 0 ? traitXpAwards : undefined,
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
