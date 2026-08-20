/**
 * compatibility.ts - Breeding compatibility (re-exports + main calculator)
 *
 * This file re-exports individual factor calculations from compatibilityFactors.ts
 * and retains the main calculateBreedingCompatibility function.
 */

import type { Horse } from "@/core/horse/types";
import { calculateGeneticCompatibility } from "@/services/breeding/genotypeMatching";
import { calculateFounderEffect } from "@/services/breeding/inbreedingCalculator";
import {
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
} from "@/services/breeding/traitCompatibility";
import { computeProspectiveCoi } from "@/core/breeding/populationGenetics";
import type { BreedingCompatibilityResult } from "@/core/breeding/breedingAffinityData";

// Re-export individual factor calculations for backward compatibility
export {
  calculateBlueHenContribution,
  calculateFoundationStockProximity,
  checkNickingAffinity,
  calculateDosageCompatibility,
  calculateParentPerformance,
  calculateCrossFamilyAffinity,
} from "./compatibilityFactors";

// Re-export third-party calculations for backward compatibility
export {
  calculateGeneticCompatibility,
  calculateFounderEffect,
  calculateConformationCompatibility,
  calculateTemperamentCompatibility,
  computeProspectiveCoi,
};

export type { BreedingCompatibilityResult } from "@/core/breeding/breedingAffinityData";

import {
  checkNickingAffinity,
  calculateDosageCompatibility,
  calculateParentPerformance,
  calculateBlueHenContribution,
  calculateCrossFamilyAffinity,
  calculateFoundationStockProximity,
} from "./compatibilityFactors";

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

  const inbreedingScore = Math.max(0, 1 - inbreeding.coefficient * 8);

  const weights = {
    nicking: 0.07,
    dosage: 0.07,
    inbreeding: 0.2,
    parentPerformance: 0.12,
    conformation: 0.06,
    temperament: 0.05,
    foundationStock: 0.08,
    founderEffect: 0.08,
    genetic: 0.1,
    blueHen: 0.1,
    crossFamily: 0.07,
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
