import { findHorseByName, type PedigreeHorse } from "@/data/pedigreeData";
import {
  DEFAULT_GENETIC_DIVERSITY,
  INBREEDING_EXPECTED_MAX_ANCESTORS,
  INBREEDING_DIVERSITY_HIGH,
  INBREEDING_DIVERSITY_MODERATE,
  INBREEDING_DIVERSITY_LOW,
  INBREEDING_DIVERSITY_VERY_LOW,
  INBREEDING_SCORE_BONUS,
} from "@/constants";

export type DirectInbreedingResult = {
  score: 0;
  description: "Direct inbreeding detected";
  warning: string;
};

const UNKNOWN_PEDIGREE_NAMES = new Set(["Unknown", "Unnamed", ""]);

function isPlaceholderName(name: string): boolean {
  return UNKNOWN_PEDIGREE_NAMES.has(name);
}

/**
 * Check whether two parents represent the same individual.
 *
 * Uses IDs when available, and falls back to names only when IDs are missing.
 * Treats placeholder names ("Unknown", "Unnamed", empty) as unknown pedigree,
 * never as direct inbreeding.
 *
 * @param sireId - Optional sire UUID
 * @param damId - Optional dam UUID
 * @param sireName - Sire display name (used as fallback)
 * @param damName - Dam display name (used as fallback)
 * @returns DirectInbreedingResult if the parents are the same individual, otherwise null
 */
export function checkDirectInbreeding(
  sireId: string | undefined,
  damId: string | undefined,
  sireName: string,
  damName: string,
): DirectInbreedingResult | null {
  // Identity-based check: UUIDs are the source of truth.
  if (sireId && damId) {
    if (sireId === damId) {
      return {
        score: 0,
        description: "Direct inbreeding detected",
        warning: "Sire and dam are the same individual",
      };
    }
    return null;
  }

  // Fallback only when IDs are unavailable: compare names, but never treat
  // placeholder names as inbreeding.
  if (
    sireName &&
    damName &&
    sireName === damName &&
    !isPlaceholderName(sireName)
  ) {
    return {
      score: 0,
      description: "Direct inbreeding detected",
      warning: "Sire and dam have identical names and no recorded IDs - possible direct inbreeding",
    };
  }

  return null;
}

/**
 * Calculate founder effect score.
 *
 * Based on the Wikipedia article on Foundation Stock which explains the founder effect:
 * "The loss of genetic variation that occurs when a new population is established by a very small number of individuals"
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object containing diversity score, description, and optional warning
 */
export function calculateFounderEffect(
  sireName: string,
  damName: string,
): { score: number; description: string; warning?: string } {
  // Placeholder parents mean no usable pedigree data.
  if (isPlaceholderName(sireName) || isPlaceholderName(damName)) {
    return { score: DEFAULT_GENETIC_DIVERSITY, description: "Unknown pedigree" };
  }

  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { score: DEFAULT_GENETIC_DIVERSITY, description: "Unknown pedigree" };
  }

  // Count unique ancestors in 4 generations to assess genetic diversity
  const sireAncestors = new Set<string>();
  const damAncestors = new Set<string>();

  /**
   * Internal recursive helper to collect ancestors up to a specified depth.
   *
   * @param horse - Current horse in pedigree
   * @param depth - Current recursion depth
   * @param ancestors - Set to collect ancestor names in
   */
  function collectAncestors(
    horse: PedigreeHorse | undefined,
    depth: number = 0,
    ancestors: Set<string>,
  ): void {
    if (depth > 4 || !horse) return;
    ancestors.add(horse.name);

    if (horse.sire) {
      const sireHorse = findHorseByName(horse.sire);
      if (sireHorse) collectAncestors(sireHorse, depth + 1, ancestors);
    }
    if (horse.dam) {
      const damHorse = findHorseByName(horse.dam);
      if (damHorse) collectAncestors(damHorse, depth + 1, ancestors);
    }
  }

  collectAncestors(sire, 0, sireAncestors);
  collectAncestors(dam, 0, damAncestors);

  // Combine and count unique ancestors
  const allAncestors = new Set([...sireAncestors, ...damAncestors]);
  const uniqueCount = allAncestors.size;

  // Expected maximum unique ancestors in 4 generations (theoretical maximum is ~30)
  // Lower count indicates stronger founder effect (more inbreeding)
  const expectedMax = INBREEDING_EXPECTED_MAX_ANCESTORS;
  const diversityRatio = uniqueCount / expectedMax;

  let description = "";
  let warning = "";

  if (diversityRatio >= INBREEDING_DIVERSITY_HIGH) {
    description = "High genetic diversity - low founder effect";
  } else if (diversityRatio >= INBREEDING_DIVERSITY_MODERATE) {
    description = "Moderate genetic diversity";
  } else if (diversityRatio >= INBREEDING_DIVERSITY_LOW) {
    description = "Limited genetic diversity - moderate founder effect";
  } else if (diversityRatio >= INBREEDING_DIVERSITY_VERY_LOW) {
    description = "Low genetic diversity - strong founder effect";
    warning = "Strong founder effect may limit genetic variation";
  } else {
    description = "Very low genetic diversity - severe founder effect";
    warning = "Severe founder effect - high risk of genetic issues";
  }

  // Score: higher diversity is better for long-term viability
  // However, some founder effect is necessary for breed standardization
  const score = Math.min(diversityRatio + INBREEDING_SCORE_BONUS, 1); // Base score with minimum

  return { score, description, warning };
}
