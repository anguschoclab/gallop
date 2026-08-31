/**
 * financialBreeding.ts - Financial, jockey fee, and breeding impact generators
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/core/common/formatting";
import { recalcStandingFee } from "@/core/breeding/stallions";
import { generatePrizeMoneyImpacts } from "./prizeMoney";
import { generateJockeyFeeImpacts } from "./jockeyFees";
import { generateJockeyAffinityImpact } from "./jockeyAffinity";
import type { Race, Horse, Jockey, RaceResult, RaceEntry } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";

export function generateFinancialBreedingImpacts(
  horse: Horse,
  r: RaceResult,
  race: Race,
  entry: RaceEntry | undefined,
  jockeyMap: Map<string, Jockey>,
  horseMap: Map<string, Horse>,
  syndicates: Record<string, Syndicate> | undefined,
  beyerValue: number,
  newDay: number,
  rng?: Rng,
  getId?: () => string,
): AnyImpact[] {
  const impacts: AnyImpact[] = [];

  // Prize money distribution
  const prizeImpacts = generatePrizeMoneyImpacts(horse, r.position, race, newDay, rng, getId);
  if (prizeImpacts) {
    if (prizeImpacts.cashImpact) impacts.push(prizeImpacts.cashImpact);
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
        getId,
      );
      impacts.push(jockeyFeeImpacts.cashImpact);
      if (jockeyFeeImpacts.transactionImpact) impacts.push(jockeyFeeImpacts.transactionImpact);

      // Affinity XP gain / penalty
      impacts.push(
        generateJockeyAffinityImpact(
          horse,
          jockey,
          r.position,
          race,
          beyerValue,
          newDay,
          rng,
          getId,
        ),
      );
    }
  }

  // Breeding: blue hen, stud career, syndicate satisfaction
  if (
    r.position === 1 &&
    (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")
  ) {
    const dam = horse.pedigree?.damId ? horseMap.get(horse.pedigree.damId) : undefined;
    if (dam) {
      impacts.push({
        id: getId ? getId() : generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "blue_hen_status",
        horseId: dam.id,
        blueHenStatus: {
          isBlueHen: dam.blueHenStatus?.isBlueHen || false,
          stakesWinnersProduced: (dam.blueHenStatus?.stakesWinnersProduced ?? 0) + 1,
          group1WinnersProduced:
            race.graded?.grade === "G1"
              ? (dam.blueHenStatus?.group1WinnersProduced ?? 0) + 1
              : (dam.blueHenStatus?.group1WinnersProduced ?? 0),
          blueHenScore: dam.blueHenStatus?.blueHenScore || 0,
          foalsProduced: dam.blueHenStatus?.foalsProduced || 0,
        },
        reason: `Stakes win by ${horse.name}`,
      });
    }

    const sire = horse.pedigree?.sireId ? horseMap.get(horse.pedigree.sireId) : undefined;
    if (sire && sire.stud?.atStud) {
      const newStakesFoals = (sire.stud.lifetimeStakesFoals ?? 0) + 1;
      const newG1Foals =
        race.graded?.grade === "G1"
          ? (sire.stud.lifetimeG1Foals ?? 0) + 1
          : sire.stud.lifetimeG1Foals;

      const previousFee = sire.stud.standingFee;
      const newFee =
        sire.ownership?.type === "npc"
          ? recalcStandingFee(
              {
                ...sire,
                stud: {
                  ...sire.stud,
                  lifetimeStakesFoals: newStakesFoals,
                  lifetimeG1Foals: newG1Foals,
                },
              },
              newDay,
            )
          : sire.stud.standingFee;

      impacts.push({
        id: getId ? getId() : generateUUID(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "stud_career",
        horseId: sire.id,
        studCareer: {
          ...sire.stud,
          standingFee: newFee,
          previousStandingFee: previousFee,
          lifetimeStakesFoals: newStakesFoals,
          lifetimeG1Foals: newG1Foals,
        },
        reason: `Stakes win by ${horse.name}${sire.ownership?.type === "npc" ? `. Fee: $${formatCurrency(previousFee)} → $${formatCurrency(newFee)}.` : ""}`,
      });

      const syndicate = Object.values(syndicates || {}).find((s) => s.stallionId === sire.id);
      if (syndicate) {
        const satisfactionDelta = race.graded?.grade === "G1" ? 15 : race.graded ? 8 : 5;
        for (const stableId of Object.keys(syndicate.shareHolders)) {
          impacts.push({
            id: getId ? getId() : generateUUID(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "syndicate_satisfaction",
            syndicateId: syndicate.id,
            stableId,
            satisfactionDelta,
            reason: `Syndicated stallion ${sire.name}'s foal ${horse.name} won ${race.name}`,
          });
        }
      }
    }
  }

  return impacts;
}
