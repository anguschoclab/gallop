import { findHorseByName, type PedigreeHorse } from "@/core/data/pedigreeData";

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
  // Explicit check for identical names (direct inbreeding)
  if (sireName === damName && sireName !== "") {
    return {
      score: 0,
      description: "Direct inbreeding detected",
      warning: "Sire and dam have identical names - this represents direct inbreeding",
    };
  }

  const sire = findHorseByName(sireName);
  const dam = findHorseByName(damName);

  if (!sire || !dam) {
    return { score: 0.5, description: "Unknown pedigree" };
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
  const expectedMax = 30;
  const diversityRatio = uniqueCount / expectedMax;

  let description = "";
  let warning = "";

  if (diversityRatio >= 0.8) {
    description = "High genetic diversity - low founder effect";
  } else if (diversityRatio >= 0.6) {
    description = "Moderate genetic diversity";
  } else if (diversityRatio >= 0.4) {
    description = "Limited genetic diversity - moderate founder effect";
  } else if (diversityRatio >= 0.2) {
    description = "Low genetic diversity - strong founder effect";
    warning = "Strong founder effect may limit genetic variation";
  } else {
    description = "Very low genetic diversity - severe founder effect";
    warning = "Severe founder effect - high risk of genetic issues";
  }

  // Score: higher diversity is better for long-term viability
  // However, some founder effect is necessary for breed standardization
  const score = Math.min(diversityRatio + 0.2, 1); // Base score with minimum

  return { score, description, warning };
}
