/**
 * dosage.ts - Dosage profile calculation
 *
 * This file provides dosage profile calculation based on pedigree, including
 * chef-de-race classifications and dosage index interpretation.
 *
 * Dependencies: ./types (DosageProfile, PedigreeNode), @/core/data/pedigreeData (AptitudinalGroup, PedigreeHorse, findHorseByName)
 * Related files: breedingCompatibility.ts (uses dosage metrics), pedigreeData.ts (provides chef-de-race data)
 */

import type { DosageProfile, PedigreeNode } from "./types";
import type { AptitudinalGroup, PedigreeHorse } from "@/core/data/pedigreeData";
import { findHorseByName } from "@/core/data/pedigreeData";

// Point values per generation for dosage calculation
const GENERATION_POINTS = {
  1: 16, // sire
  2: 8, // grandsire
  3: 4, // great-grandsire
  4: 2, // great-great-grandsire
};

/**
 * Calculate the Dosage Profile for a horse based on its pedigree
 * @param pedigree - Array of pedigree nodes (sire line for 4 generations)
 * @returns DosageProfile with points in each aptitudinal group
 */
export function calculateDosageProfile(pedigree: PedigreeNode[]): DosageProfile {
  const profile: DosageProfile = {
    brilliant: 0,
    intermediate: 0,
    classic: 0,
    solid: 0,
    professional: 0,
  };

  for (const node of pedigree) {
    const horse = findHorseByName(node.name);
    if (horse?.dosageGroups) {
      const points = GENERATION_POINTS[node.generation as keyof typeof GENERATION_POINTS] || 0;

      // If the horse has one dosage group, assign all points to it
      if (horse.dosageGroups.length === 1) {
        const group = horse.dosageGroups[0];
        profile[group.toLowerCase() as keyof DosageProfile] += points;
      }
      // If the horse has two dosage groups, split points equally
      else if (horse.dosageGroups.length === 2) {
        const halfPoints = points / 2;
        profile[horse.dosageGroups[0].toLowerCase() as keyof DosageProfile] += halfPoints;
        profile[horse.dosageGroups[1].toLowerCase() as keyof DosageProfile] += halfPoints;
      }
    }
  }

  return profile;
}

/**
 * Calculate the Dosage Index from a Dosage Profile
 * Formula: (Brilliant + Intermediate + 0.5*Classic) / (0.5*Classic + Solid + Professional)
 * @param profile - DosageProfile to calculate from
 * @returns Dosage Index (number), or Infinity if denominator is 0
 */
export function calculateDosageIndex(profile: DosageProfile): number {
  const numerator = profile.brilliant + profile.intermediate + 0.5 * profile.classic;
  const denominator = 0.5 * profile.classic + profile.solid + profile.professional;

  if (denominator === 0) {
    return Infinity;
  }

  return Math.round((numerator / denominator) * 100) / 100;
}

/**
 * Calculate the Center of Distribution from a Dosage Profile
 * Formula: (2*Brilliant + Intermediate - Solid - 2*Professional) / Total Points
 * @param profile - DosageProfile to calculate from
 * @returns Center of Distribution (number), or 0 if total points is 0
 */
export function calculateCenterOfDistribution(profile: DosageProfile): number {
  const totalPoints =
    profile.brilliant +
    profile.intermediate +
    profile.classic +
    profile.solid +
    profile.professional;

  if (totalPoints === 0) {
    return 0;
  }

  const numerator =
    2 * profile.brilliant + profile.intermediate - profile.solid - 2 * profile.professional;
  return Math.round((numerator / totalPoints) * 100) / 100;
}

/**
 * Generate a 4-generation pedigree for a horse
 * @param sireName - Name of the sire
 * @returns Array of PedigreeNode objects representing the sire line
 */
export function generatePedigree(sireName?: string): PedigreeNode[] {
  const pedigree: PedigreeNode[] = [];

  if (!sireName) {
    return pedigree;
  }

  // Generation 1: Sire
  const sire = findHorseByName(sireName);
  if (sire) {
    pedigree.push({ name: sire.name, generation: 1 });

    // Generation 2: Grandsire
    if (sire.sire) {
      const grandsire = findHorseByName(sire.sire);
      if (grandsire) {
        pedigree.push({ name: grandsire.name, generation: 2 });

        // Generation 3: Great-grandsire
        if (grandsire.sire) {
          const greatGrandsire = findHorseByName(grandsire.sire);
          if (greatGrandsire) {
            pedigree.push({ name: greatGrandsire.name, generation: 3 });

            // Generation 4: Great-great-grandsire
            if (greatGrandsire.sire) {
              const greatGreatGrandsire = findHorseByName(greatGrandsire.sire);
              if (greatGreatGrandsire) {
                pedigree.push({ name: greatGreatGrandsire.name, generation: 4 });
              }
            }
          }
        }
      }
    }
  }

  return pedigree;
}

const DOSAGE_CACHE = new Map<string, any>();

/**
 * Calculate all dosage metrics for a horse
 * @param sireName - Name of the sire
 * @returns Object containing dosageProfile, dosageIndex, and centerOfDistribution
 */
export function calculateDosageMetrics(sireName?: string) {
  if (!sireName) {
    return {
      pedigree: [],
      dosageProfile: { brilliant: 0, intermediate: 0, classic: 0, solid: 0, professional: 0 },
      dosageIndex: 1.0,
      centerOfDistribution: 0,
    };
  }

  const cached = DOSAGE_CACHE.get(sireName);
  if (cached) return cached;

  const pedigree = generatePedigree(sireName);
  const dosageProfile = calculateDosageProfile(pedigree);
  const dosageIndex = calculateDosageIndex(dosageProfile);
  const centerOfDistribution = calculateCenterOfDistribution(dosageProfile);

  const result = {
    pedigree,
    dosageProfile,
    dosageIndex,
    centerOfDistribution,
  };

  DOSAGE_CACHE.set(sireName, result);
  return result;
}

/**
 * Get a human-readable interpretation of the Dosage Index
 * @param dosageIndex - The calculated dosage index
 * @returns String describing the horse's distance preference
 */
export function interpretDosageIndex(dosageIndex: number | undefined): string {
  if (dosageIndex === undefined || dosageIndex === Infinity) {
    return "Extreme speed preference (very short distances)";
  }

  if (dosageIndex >= 4.0) {
    return "High speed preference (short to medium distances)";
  } else if (dosageIndex >= 3.0) {
    return "Above-average speed preference (short to medium distances)";
  } else if (dosageIndex >= 2.4) {
    return "Balanced speed and stamina (medium distances)";
  } else if (dosageIndex >= 1.5) {
    return "Above-average stamina (medium to long distances)";
  } else {
    return "High stamina preference (long distances)";
  }
}
