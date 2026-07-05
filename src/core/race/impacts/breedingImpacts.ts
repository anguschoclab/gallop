/**
 * breedingImpacts.ts - Breeding-related impact generators (blue hen, stud career, syndicate)
 *
 * Extracted from raceImpactGenerator.ts.
 */

import type {
  AnyImpact,
  BlueHenImpact,
  StudCareerImpact,
  SyndicateSatisfactionImpact,
} from "@/core/resolver/impacts/index";
import type { Rng } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/core/common/formatting";
import { recalcStandingFee } from "@/core/breeding/stallions";
import type { Syndicate } from "@/core/breeding/types";
import type { Race, Horse } from "@/game/types";

export function generateBreedingImpacts(
  horse: Horse,
  position: number,
  race: Race,
  horseMap: Map<string, Horse>,
  syndicates: Record<string, Syndicate> | undefined,
  newDay: number,
  rng?: Rng,
): AnyImpact[] {
  if (position !== 1) return [];
  if (!race.graded && race.raceClass !== "Stakes" && race.raceClass !== "Group") return [];

  const impacts: AnyImpact[] = [];

  const dam = horse.pedigree?.damId ? horseMap.get(horse.pedigree.damId) : undefined;
  if (dam) {
    impacts.push({
      id: generateUUID(rng),
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
            : dam.blueHenStatus?.group1WinnersProduced ?? 0,
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
    const newFee = sire.stableId
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
      id: generateUUID(rng),
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
      reason: `Stakes win by ${horse.name}${sire.stableId ? `. Fee: $${formatCurrency(previousFee)} → $${formatCurrency(newFee)}.` : ""}`,
    });

    const syndicate = Object.values(syndicates || {}).find((s) => s.stallionId === sire.id);
    if (syndicate) {
      const satisfactionDelta = race.graded?.grade === "G1" ? 15 : race.graded ? 8 : 5;
      for (const stableId of Object.keys(syndicate.shareHolders)) {
        impacts.push({
          id: generateUUID(rng),
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

  return impacts;
}
