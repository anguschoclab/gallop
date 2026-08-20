/**
 * compatibilityFactors.ts - Individual breeding compatibility factor calculations
 *
 * Extracted from compatibility.ts for modularity.
 * Contains blue hen, foundation stock, nicking, dosage, parent performance,
 * and cross-family affinity calculations.
 */

import type { Horse } from "@/core/horse/types";
import { calculateDosageMetrics } from "@/core/race/dosage";
import { findHorseByName, type PedigreeHorse } from "@/data/pedigreeData";
import { NICKING_AFFINITIES, CROSS_FAMILY_AFFINITIES } from "@/core/breeding/breedingAffinityData";
import { getCareerStats } from "@/core/horse/stats";

export function calculateBlueHenContribution(dam: Horse): {
  score: number;
  description: string;
  isBlueHen: boolean;
} {
  const blueHenStatus = dam.blueHenStatus;

  if (!blueHenStatus) {
    return { score: 0.3, description: "Unknown production record", isBlueHen: false };
  }

  let score = 0.3;

  score += Math.min(blueHenStatus.stakesWinnersProduced * 0.15, 0.3);
  score += Math.min(blueHenStatus.group1WinnersProduced * 0.25, 0.3);
  score += (blueHenStatus.blueHenScore / 100) * 0.1;

  score = Math.min(score, 1.0);

  const isBlueHen = blueHenStatus.isBlueHen;

  let description = "Standard production record";
  if (isBlueHen) {
    description = `Blue Hen - ${blueHenStatus.stakesWinnersProduced} stakes winners, ${blueHenStatus.group1WinnersProduced} G1 winners`;
  } else if (blueHenStatus.stakesWinnersProduced >= 2) {
    description = `Excellent producer - ${blueHenStatus.stakesWinnersProduced} stakes winners`;
  } else if (blueHenStatus.stakesWinnersProduced >= 1) {
    description = `Good producer - ${blueHenStatus.stakesWinnersProduced} stakes winner${blueHenStatus.stakesWinnersProduced > 1 ? "s" : ""}`;
  }

  return { score, description, isBlueHen };
}

export function calculateFoundationStockProximity(
  sireName: string,
  damName: string,
): { score: number; description: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { score: 0, description: "Unknown pedigree" };
  }

  let score = 0;
  const reasons: string[] = [];

  const majorFoundationSires = ["Byerley Turk", "Darley Arabian", "Godolphin Arabian"];

  function checkForFoundationInLine(horse: PedigreeHorse | undefined, depth: number = 0): void {
    if (depth > 4 || !horse) return;

    if (horse.isFoundationSire) {
      if (majorFoundationSires.includes(horse.name)) {
        score += 0.15;
        reasons.push(`Major foundation sire ${horse.name} in pedigree`);
      } else {
        score += 0.05;
        reasons.push(`Minor foundation sire ${horse.name} in pedigree`);
      }
    }

    if (horse.isFoundationMare) {
      score += 0.1;
      reasons.push(`Foundation mare ${horse.name} (Family ${horse.bruceLoweFamily})`);
    }

    if (horse.sire) {
      const sireHorse = findHorseByName(horse.sire);
      if (sireHorse) checkForFoundationInLine(sireHorse, depth + 1);
    }
  }

  checkForFoundationInLine(sire);
  checkForFoundationInLine(dam);

  if (sire.bruceLoweFamily && dam.bruceLoweFamily) {
    if (sire.bruceLoweFamily === dam.bruceLoweFamily) {
      score += 0.05;
      reasons.push(`Both from Bruce Lowe Family ${sire.bruceLoweFamily}`);
    }
  }

  score = Math.min(score * 2, 1.0);

  let description = "Limited foundation stock proximity";
  if (score >= 0.8) description = "Excellent foundation stock proximity";
  else if (score >= 0.5) description = "Strong foundation stock proximity";
  else if (score >= 0.3) description = "Moderate foundation stock proximity";
  else if (score >= 0.1) description = "Some foundation stock influence";

  if (reasons.length > 0) {
    description += ` (${reasons.slice(0, 2).join(", ")})`;
  }

  return { score, description };
}

export function checkNickingAffinity(
  sireName: string,
  damName: string,
): { hasAffinity: boolean; affinity: number; description: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { hasAffinity: false, affinity: 0, description: "Unknown pedigree" };
  }

  const sireLine = sire.sire || sire.name;
  const damSireLine = dam.sire;

  if (!damSireLine) {
    return { hasAffinity: false, affinity: 0, description: "No dam sire data" };
  }

  const affinities = NICKING_AFFINITIES[sireLine] || [];
  if (affinities.includes(damSireLine)) {
    return {
      hasAffinity: true,
      affinity: 1.0,
      description: `Strong nicking: ${sireLine} × ${damSireLine}`,
    };
  }

  const damSire = findHorseByName(damSireLine);
  if (damSire && damSire.sire) {
    const grandSire = damSire.sire;
    if (affinities.includes(grandSire)) {
      return {
        hasAffinity: true,
        affinity: 0.5,
        description: `Moderate nicking: ${sireLine} × ${damSireLine} (via ${grandSire})`,
      };
    }
  }

  return { hasAffinity: false, affinity: 0, description: "No known nicking" };
}

export function calculateDosageCompatibility(
  sireName: string,
  damName: string,
): { score: number; description: string } {
  const sireMetrics = calculateDosageMetrics(sireName);
  const damMetrics = calculateDosageMetrics(damName);

  const sireDI = sireMetrics.dosageIndex;
  const damDI = damMetrics.dosageIndex;

  if (!isFinite(sireDI) || !isFinite(damDI)) {
    return { score: 0.5, description: "Insufficient pedigree data" };
  }

  const diff = Math.abs(sireDI - damDI);

  if (diff < 0.5) {
    return { score: 0.6, description: "Similar dosage profiles" };
  } else if (diff < 1.5) {
    return { score: 0.8, description: "Good speed/stamina balance" };
  } else if (diff < 2.5) {
    return { score: 0.95, description: "Excellent complementary dosage" };
  } else {
    return { score: 0.4, description: "Very different dosage profiles" };
  }
}

export function calculateParentPerformance(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  let sireScore = 0;
  let damScore = 0;

  const sireStats = getCareerStats(sire);
  const sireWins = sireStats.wins;
  const sirePlaces = sireStats.wins + sireStats.places + sireStats.shows;
  const sireGraded = sire.raceHistory.filter((r) => r.grade).length;
  const sireGradedWins = sireStats.gradedWins;

  sireScore += sireWins * 2;
  sireScore += sirePlaces * 0.5;
  sireScore += sireGradedWins * 5;
  sireScore += sireGraded * 0.5;

  const damStats = getCareerStats(dam);
  const damWins = damStats.wins;
  const damPlaces = damStats.wins + damStats.places + damStats.shows;
  const damGraded = damStats.gradedStarts;
  const damGradedWins = damStats.gradedWins;

  damScore += damWins * 2.5;
  damScore += damPlaces * 0.75;
  damScore += damGradedWins * 6;
  damScore += damGraded * 0.75;

  const maxScore = 50;
  const combinedScore = Math.min(sireScore + damScore, maxScore);
  const normalizedScore = combinedScore / maxScore;

  let description = "Limited race record";
  if (normalizedScore > 0.8) description = "Exceptional racing performers";
  else if (normalizedScore > 0.6) description = "Strong racing performers";
  else if (normalizedScore > 0.4) description = "Moderate racing performers";
  else if (normalizedScore > 0.2) description = "Some racing success";

  return { score: normalizedScore, description };
}

export function calculateCrossFamilyAffinity(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  const bloodline = sire.bloodline;
  const family = dam.bruceLoweFamily;
  if (!bloodline || family === undefined || !CROSS_FAMILY_AFFINITIES[bloodline]) {
    return { score: 0.4, description: "No documented cross-family affinity" };
  }
  const bonus = CROSS_FAMILY_AFFINITIES[bloodline][family] ?? 0.4;
  if (bonus >= 0.7) {
    return { score: bonus, description: `Strong cross: ${bloodline} × Family ${family}` };
  }
  if (bonus >= 0.55) {
    return { score: bonus, description: `Notable cross: ${bloodline} × Family ${family}` };
  }
  return { score: bonus, description: `Standard cross: ${bloodline} × Family ${family}` };
}
