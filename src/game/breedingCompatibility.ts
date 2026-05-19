/**
 * breedingCompatibility.ts - Breeding compatibility calculation
 *
 * This file provides comprehensive breeding compatibility scoring including genetic
 * compatibility, founder effect, conformation/temperament compatibility, COI,
 * nicking affinities, and blue hen contribution.
 *
 * Dependencies: ./types (Horse), ./dosage (calculateDosageMetrics, interpretDosageIndex), @/core/data/pedigreeData (findHorseByName, PedigreeHorse), @/core/genetics/phenotype (TRAIT_SCORE), @/services/genotypeMatching (calculateGeneticCompatibility), @/services/inbreedingCalculator (calculateFounderEffect), @/services/traitCompatibility (calculateConformationCompatibility, calculateTemperamentCompatibility), @/core/breeding/populationGenetics (computeCoiFromSnapshot), @/core/breeding/breedingAffinityData (NICKING_AFFINITIES, CROSS_FAMILY_AFFINITIES)
 * Related files: Used throughout breeding systems for compatibility evaluation
 */

import type { Horse } from "./types";
import { calculateDosageMetrics, interpretDosageIndex } from "./dosage";
import { findHorseByName, type PedigreeHorse } from "@/core/data/pedigreeData";
import { TRAIT_SCORE } from "@/core/genetics/phenotype";
import { calculateGeneticCompatibility } from "@/services/genotypeMatching";
import { calculateFounderEffect } from "@/services/inbreedingCalculator";
import {
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
} from "@/services/traitCompatibility";
import { computeCoiFromSnapshot, computeProspectiveCoi } from "@/core/breeding/populationGenetics";
import {
  NICKING_AFFINITIES,
  CROSS_FAMILY_AFFINITIES,
  type BreedingCompatibilityResult,
} from "@/core/breeding/breedingAffinityData";
import { getCareerStats } from "@/core/horse/stats";

export {
  calculateGeneticCompatibility,
  calculateFounderEffect,
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
  computeProspectiveCoi,
};

/**
 * Calculate blue hen contribution based on dam's production record.
 *
 * Based on the Breednet article on Blue Hens. Blue hens are exceptional broodmares
 * that produce multiple high-quality offspring, often including multiple Group 1 winners.
 * Blue hen status is determined by the quality and quantity of offspring.
 *
 * @param dam - Dam horse to evaluate
 * @returns Object with score (0-1), description, and blue hen status
 */
export function calculateBlueHenContribution(dam: Horse): {
  score: number;
  description: string;
  isBlueHen: boolean;
} {
  const blueHenStatus = dam.blueHenStatus;

  if (!blueHenStatus) {
    return { score: 0.3, description: "Unknown production record", isBlueHen: false };
  }

  let score = 0.3; // Base score for any mare

  // Bonus for stakes winners
  score += Math.min(blueHenStatus.stakesWinnersProduced * 0.15, 0.3);

  // Bonus for Group 1 winners (more valuable)
  score += Math.min(blueHenStatus.group1WinnersProduced * 0.25, 0.3);

  // Blue hen score contribution
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

/**
 * Calculate foundation stock proximity score.
 *
 * Horses closer to foundation stock (especially the 3 major sires and foundation mares)
 * get a bonus. Based on the Wikipedia article on Foundation Stock which notes the
 * importance of tracing to foundation animals.
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object with score (0-0.5) and description
 */
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

  // Check for major foundation sires in pedigree (within 4 generations)
  const majorFoundationSires = ["Byerley Turk", "Darley Arabian", "Godolphin Arabian"];

  function checkForFoundationInLine(horse: PedigreeHorse | undefined, depth: number = 0): void {
    if (depth > 4 || !horse) return;

    if (horse.isFoundationSire) {
      if (majorFoundationSires.includes(horse.name)) {
        score += 0.15; // Major foundation sire
        reasons.push(`Major foundation sire ${horse.name} in pedigree`);
      } else {
        score += 0.05; // Minor foundation sire
        reasons.push(`Minor foundation sire ${horse.name} in pedigree`);
      }
    }

    if (horse.isFoundationMare) {
      score += 0.1; // Foundation mare
      reasons.push(`Foundation mare ${horse.name} (Family ${horse.bruceLoweFamily})`);
    }

    if (horse.sire) {
      const sireHorse = findHorseByName(horse.sire);
      if (sireHorse) checkForFoundationInLine(sireHorse, depth + 1);
    }
  }

  // Check sire line
  checkForFoundationInLine(sire);

  // Check dam line (tail-female is especially important)
  checkForFoundationInLine(dam);

  // Bonus for Bruce Lowe family consistency (same family on both sides can be good or bad depending on context)
  if (sire.bruceLoweFamily && dam.bruceLoweFamily) {
    if (sire.bruceLoweFamily === dam.bruceLoweFamily) {
      score += 0.05; // Same family - can indicate strong linebreeding
      reasons.push(`Both from Bruce Lowe Family ${sire.bruceLoweFamily}`);
    }
  }

  // Cap the score at 1.0 (normalized for weighting)
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

/**
 * Check if there's a nicking affinity between sire and dam lines.
 *
 * Checks the nicking database for known successful sire × dam sire combinations.
 * Returns affinity score and description if found.
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object with hasAffinity flag, affinity score, and description
 */
export function checkNickingAffinity(
  sireName: string,
  damName: string,
): { hasAffinity: boolean; affinity: number; description: string } {
  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { hasAffinity: false, affinity: 0, description: "Unknown pedigree" };
  }

  // Check if sire is in our nicking database
  const sireLine = sire.sire || sire.name;
  const damSireLine = dam.sire;

  if (!damSireLine) {
    return { hasAffinity: false, affinity: 0, description: "No dam sire data" };
  }

  // Check for direct nicking affinity
  const affinities = NICKING_AFFINITIES[sireLine] || [];
  if (affinities.includes(damSireLine)) {
    return {
      hasAffinity: true,
      affinity: 1.0, // Strong nicking
      description: `Strong nicking: ${sireLine} × ${damSireLine}`,
    };
  }

  // Check if dam's sire is in the same general sire line family
  const damSire = findHorseByName(damSireLine);
  if (damSire && damSire.sire) {
    const grandSire = damSire.sire;
    if (affinities.includes(grandSire)) {
      return {
        hasAffinity: true,
        affinity: 0.5, // Moderate nicking
        description: `Moderate nicking: ${sireLine} × ${damSireLine} (via ${grandSire})`,
      };
    }
  }

  return { hasAffinity: false, affinity: 0, description: "No known nicking" };
}

/**
 * Calculate dosage compatibility between sire and dam.
 *
 * Returns a score from 0-1, with higher being better compatibility.
 * Ideal breeding balances speed and stamina: high-speed sires should breed to
 * stamina-oriented dams for complementary dosage profiles.
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object with score (0-1) and description
 */
export function calculateDosageCompatibility(
  sireName: string,
  damName: string,
): { score: number; description: string } {
  const sireMetrics = calculateDosageMetrics(sireName);
  const damMetrics = calculateDosageMetrics(damName);

  const sireDI = sireMetrics.dosageIndex;
  const damDI = damMetrics.dosageIndex;

  // If we can't calculate dosage for one or both
  if (!isFinite(sireDI) || !isFinite(damDI)) {
    return { score: 0.5, description: "Insufficient pedigree data" };
  }

  // Ideal: balance speed and stamina
  // If sire is high-speed (high DI), breed to stamina-oriented dam (low DI)
  // If both are similar, it's okay but not optimal
  const diff = Math.abs(sireDI - damDI);

  if (diff < 0.5) {
    // Similar dosage profiles - neutral
    return { score: 0.6, description: "Similar dosage profiles" };
  } else if (diff < 1.5) {
    // Good balance
    return { score: 0.8, description: "Good speed/stamina balance" };
  } else if (diff < 2.5) {
    // Excellent complementary profiles
    return { score: 0.95, description: "Excellent complementary dosage" };
  } else {
    // Too different - may not work well
    return { score: 0.4, description: "Very different dosage profiles" };
  }
}

/**
 * Calculate parent performance score based on race history.
 *
 * "Breed the best to the best" - good racehorses make better breeding stock.
 * Evaluates both sire and dam performance including wins, places, and graded stakes results.
 *
 * @param sire - Sire horse to evaluate
 * @param dam - Dam horse to evaluate
 * @returns Object with score (0-1) and description
 */
export function calculateParentPerformance(
  sire: Horse,
  dam: Horse,
): { score: number; description: string } {
  let sireScore = 0;
  let damScore = 0;

  // Evaluate sire's performance
  const sireStats = getCareerStats(sire);
  const sireWins = sireStats.wins;
  const sirePlaces = sireStats.wins + sireStats.places + sireStats.shows;
  const sireGraded = sire.raceHistory.filter((r) => r.grade).length;
  const sireGradedWins = sireStats.gradedWins;

  // Sire scoring
  sireScore += sireWins * 2;
  sireScore += sirePlaces * 0.5;
  sireScore += sireGradedWins * 5; // Bonus for graded wins
  sireScore += sireGraded * 0.5; // Bonus for graded appearances

  // Evaluate dam's performance (mares can outbreed their track record)
  const damStats = getCareerStats(dam);
  const damWins = damStats.wins;
  const damPlaces = damStats.wins + damStats.places + damStats.shows;
  const damGraded = damStats.gradedStarts;
  const damGradedWins = damStats.gradedWins;

  // Dam scoring (slightly higher weight as quality mares produce high-class runners)
  damScore += damWins * 2.5;
  damScore += damPlaces * 0.75;
  damScore += damGradedWins * 6;
  damScore += damGraded * 0.75;

  // Normalize scores
  const maxScore = 50; // Arbitrary maximum
  const combinedScore = Math.min(sireScore + damScore, maxScore);
  const normalizedScore = combinedScore / maxScore;

  let description = "Limited race record";
  if (normalizedScore > 0.8) description = "Exceptional racing performers";
  else if (normalizedScore > 0.6) description = "Strong racing performers";
  else if (normalizedScore > 0.4) description = "Moderate racing performers";
  else if (normalizedScore > 0.2) description = "Some racing success";

  return { score: normalizedScore, description };
}

/**
 * Overall breeding compatibility score
 * Combines all factors with appropriate weights
 */
export type { BreedingCompatibilityResult } from "@/core/breeding/breedingAffinityData";

/**
 * Calculate cross-family affinity between sire bloodline and dam Bruce Lowe family.
 *
 * Checks documented cross-family affinities where certain sire bloodlines
 * have historically produced well with specific Bruce Lowe families.
 *
 * @param sire - Sire horse to evaluate
 * @param dam - Dam horse to evaluate
 * @returns Object with score (0-1) and description
 */
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

/**
 * Calculate overall breeding compatibility score.
 *
 * Combines all factors with appropriate weights: nicking, dosage, inbreeding,
 * parent performance, conformation, temperament, foundation stock, founder effect,
 * genetic compatibility, blue hen contribution, and cross-family affinity.
 *
 * @param sire - Sire horse to evaluate
 * @param dam - Dam horse to evaluate
 * @returns Comprehensive breeding compatibility result with overall score, individual factor scores, and recommendation
 */
export function calculateBreedingCompatibility(
  sire: Horse,
  dam: Horse,
): BreedingCompatibilityResult {
  const nicking = checkNickingAffinity(sire.sireName || "", dam.sireName || "");
  const dosage = calculateDosageCompatibility(sire.sireName || "", dam.sireName || "");
  const coi = computeProspectiveCoi(sire, dam, 8);
  const inbreeding = {
    coefficient: coi,
    warning:
      coi > 0.125
        ? "High inbreeding - may reduce vigor"
        : coi > 0.0625
          ? "Moderate inbreeding - monitor closely"
          : "",
  };
  const parentPerformance = calculateParentPerformance(sire, dam);
  const conformation = calculateConformationCompatibility(sire, dam);
  const temperament = calculateTemperamentCompatibility(sire, dam);
  const foundationStock = calculateFoundationStockProximity(
    sire.sireName || "",
    dam.sireName || "",
  );
  const founderEffect = calculateFounderEffect(sire.sireName || "", dam.sireName || "");
  const genetic = calculateGeneticCompatibility(sire, dam);
  const blueHen = calculateBlueHenContribution(dam);
  const crossFamily = calculateCrossFamilyAffinity(sire, dam);

  // Calculate inbreeding score (inverse of coefficient - lower is better)
  const inbreedingScore = Math.max(0, 1 - inbreeding.coefficient * 4); // Penalize high inbreeding

  // Weighted overall score (11 factors, sums to 1.0). Cross-family takes 5%
  // pulled proportionally from the larger factors.
  const weights = {
    nicking: 0.07,
    dosage: 0.07,
    inbreeding: 0.13,
    parentPerformance: 0.15,
    conformation: 0.07,
    temperament: 0.05,
    foundationStock: 0.09,
    founderEffect: 0.09,
    genetic: 0.11,
    blueHen: 0.11,
    crossFamily: 0.06,
  };

  const overallScore =
    nicking.affinity * weights.nicking +
    dosage.score * weights.dosage +
    inbreedingScore * weights.inbreeding +
    parentPerformance.score * weights.parentPerformance +
    conformation.score * weights.conformation +
    temperament.score * weights.temperament +
    foundationStock.score * weights.foundationStock +
    founderEffect.score * weights.founderEffect +
    genetic.score * weights.genetic +
    blueHen.score * weights.blueHen +
    crossFamily.score * weights.crossFamily;

  // Generate recommendation
  let recommendation = "";
  if (overallScore >= 0.8) {
    recommendation = "Excellent mating - highly recommended";
  } else if (overallScore >= 0.65) {
    recommendation = "Good mating - should produce quality foal";
  } else if (overallScore >= 0.5) {
    recommendation = "Acceptable mating - moderate expectations";
  } else if (overallScore >= 0.35) {
    recommendation = "Risky mating - low probability of success";
  } else {
    recommendation = "Poor mating - not recommended";
  }

  if (inbreeding.warning) {
    recommendation += `. ${inbreeding.warning}`;
  }
  if (founderEffect.warning) {
    recommendation += `. ${founderEffect.warning}`;
  }
  if (genetic.warning) {
    recommendation += `. ${genetic.warning}`;
  }

  return {
    overallScore,
    factors: {
      nicking: { score: nicking.affinity, description: nicking.description },
      dosage: dosage,
      inbreeding: {
        score: inbreedingScore,
        description: `Coefficient: ${(inbreeding.coefficient * 100).toFixed(1)}%`,
        warning: inbreeding.warning,
      },
      parentPerformance,
      conformation,
      temperament,
      foundationStock,
      founderEffect,
      genetic,
      blueHen,
      crossFamily,
    },
    recommendation,
  };
}
