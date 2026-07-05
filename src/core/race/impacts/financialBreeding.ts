/**
 * financialBreeding.ts - Financial, jockey fee, and breeding impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generatePrizeMoneyImpacts } from "./prizeMoney";
import { generateJockeyFeeImpacts } from "./jockeyFees";
import { generateJockeyAffinityImpact } from "./jockeyAffinity";
import { generateBreedingImpacts } from "./breedingImpacts";
import type { Race, Horse, Jockey } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";

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

export function generateFinancialBreedingImpacts(
  horse: Horse,
  r: RaceResultEntry,
  race: Race,
  entry: RaceEntry | undefined,
  jockeyMap: Map<string, Jockey>,
  horseMap: Map<string, Horse>,
  syndicates: Record<string, Syndicate> | undefined,
  beyerValue: number,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  // Prize money distribution
  const prizeImpacts = generatePrizeMoneyImpacts(horse, r.position, race, newDay, rng);
  if (prizeImpacts) {
    impacts.push(prizeImpacts.cashImpact);
    if (prizeImpacts.transactionImpact) impacts.push(prizeImpacts.transactionImpact);
    if (prizeImpacts.reputationImpact) impacts.push(prizeImpacts.reputationImpact);
  }

  // Jockey riding fees
  if (entry?.jockeyId) {
    const jockey = jockeyMap.get(entry.jockeyId);
    if (jockey) {
      const jockeyFeeImpacts = generateJockeyFeeImpacts(
        horse,
        jockey,
        newDay,
        horse.id,
        race.id,
        rng,
      );
      impacts.push(jockeyFeeImpacts.cashImpact);
      if (jockeyFeeImpacts.transactionImpact) impacts.push(jockeyFeeImpacts.transactionImpact);

      // Affinity XP gain / penalty
      impacts.push(
        generateJockeyAffinityImpact(horse, jockey, r.position, race, beyerValue, newDay, rng),
      );
    }
  }

  // Breeding: blue hen, stud career, syndicate satisfaction
  for (const bi of generateBreedingImpacts(
    horse,
    r.position,
    race,
    horseMap,
    syndicates,
    newDay,
    rng,
  )) {
    impacts.push(bi);
  }

  return impacts;
}
