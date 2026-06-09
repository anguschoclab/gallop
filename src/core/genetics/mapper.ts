/**
 * mapper.ts - Research data to genotype mapping
 *
 * This file provides functions for converting real-world stallion research data
 * to game DNA loci, including physical traits, racing performance, and genetic markers.
 *
 * Dependencies: @/core/genetics/types (Genotype, Locus, MarkerGenotype), @/core/data/stallionDNAData (StallionResearchData), ./generation (generateDeterministicGenotype)
 * Related files: generation.ts (provides fallback genotype generation), @/core/data/stallionDNAData (provides research data)
 */

import type { Genotype, Locus, MarkerGenotype } from "@/core/genetics/types";
import type { StallionResearchData } from "@/data/stallionDNAData";
import { generateDeterministicGenotype } from "@/core/genetics/generation";

/**
 * Mapping functions to convert real-world research data to game DNA loci.
 */

/**
 * Map height (in hands) to size locus.
 *
 * 14.0h = locus 1, 18.0h = locus 10 (linear interpolation).
 *
 * @param height - Height in hands
 * @returns Size locus
 */
function mapHeightToSize(height: number): Locus {
  const normalized = (height - 14.0) / 4.0; // 0.0 to 1.0
  const allele = Math.max(1, Math.min(10, Math.floor(normalized * 9) + 1)); // 1 to 10
  return [allele, allele];
}

/**
 * Map trait rating (excellent/good/fair/poor) to locus
 *
 * @param trait - The rating to map
 * @returns The resulting DNA locus
 */
function mapTraitToLocus(trait: "excellent" | "good" | "fair" | "poor"): Locus {
  const mapping: Record<string, number> = { excellent: 9, good: 7, fair: 5, poor: 3 };
  const allele = mapping[trait];
  return [allele, allele];
}

/**
 * Map distance preference to distance locus
 *
 * @param pref - The distance preference to map
 * @returns The resulting DNA locus
 */
function mapDistanceToPreference(pref: "sprint" | "mile" | "classic" | "stayer"): Locus {
  const mapping: Record<string, number> = { sprint: 2, mile: 5, classic: 8, stayer: 10 };
  return [mapping[pref], mapping[pref]];
}

/**
 * Map surface preference to surface locus
 *
 * @param pref - The surface preference to map
 * @returns The resulting DNA locus
 */
function mapSurfaceToPreference(pref: "dirt" | "turf" | "synthetic"): Locus {
  const mapping: Record<string, number> = { dirt: 8, turf: 2, synthetic: 5 };
  return [mapping[pref], mapping[pref]];
}

/**
 * Map running style to style locus
 *
 * @param style - The running style to map
 * @returns The resulting DNA locus
 */
function mapStyleToLocus(style: "E" | "EP" | "P" | "S"): Locus {
  const mapping: Record<string, number> = { E: 1, EP: 2, P: 3, S: 4 };
  return [mapping[style], mapping[style]];
}

/**
 * Map physical traits to DNA
 *
 * @param traits - The research physical traits data
 * @returns Object containing mapped loci for size, physical, and mental traits
 */
function mapPhysicalTraitsToDNA(traits: StallionResearchData["physicalTraits"]): {
  size: Locus;
  physical: Locus;
  mental: Locus;
} {
  const size: Locus = traits?.height ? mapHeightToSize(traits.height) : [5, 5];
  const physical: Locus = traits?.conformation ? mapTraitToLocus(traits.conformation) : [5, 5];
  const mental: Locus = traits?.temperament ? mapTraitToLocus(traits.temperament) : [5, 5];

  return { size, physical, mental };
}

/**
 * Map racing performance to DNA
 *
 * @param perf - The research performance data
 * @param tier - The quality tier of the horse
 * @returns Object containing mapped stats, preferences, and style
 */
function mapRacingPerformanceToDNA(
  perf: StallionResearchData["racingPerformance"],
  tier: "starter" | "budget" | "mid" | "elite",
): {
  stats: { speed: Locus[]; stamina: Locus[] };
  preferences: { distance: Locus; surface: Locus };
  style: Locus;
} {
  const alleleMin = tier === "elite" ? 3 : tier === "mid" ? 2 : tier === "budget" ? 1 : 1;
  const alleleMax = 5;

  // Default stats
  let speed: Locus[] = Array.from({ length: 10 }, () => [alleleMin + 1, alleleMin + 1]);
  let stamina: Locus[] = Array.from({ length: 10 }, () => [alleleMin + 1, alleleMin + 1]);

  // Apply distance preference bias
  if (perf?.distancePreference) {
    const distancePref = mapDistanceToPreference(perf.distancePreference);
    const distSum = distancePref[0] + distancePref[1];

    if (distSum <= 4) {
      // Sprinter: higher speed, lower stamina
      speed = speed.map(
        (l) => [Math.min(alleleMax, l[0] + 1), Math.min(alleleMax, l[1] + 1)] as Locus,
      );
      stamina = stamina.map(
        (l) => [Math.max(alleleMin, l[0] - 1), Math.max(alleleMin, l[1] - 1)] as Locus,
      );
    } else if (distSum >= 8) {
      // Stayer: higher stamina, lower speed
      stamina = stamina.map(
        (l) => [Math.min(alleleMax, l[0] + 1), Math.min(alleleMax, l[1] + 1)] as Locus,
      );
      speed = speed.map(
        (l) => [Math.max(alleleMin, l[0] - 1), Math.max(alleleMin, l[1] - 1)] as Locus,
      );
    }
  }

  const distance: Locus = perf?.distancePreference
    ? mapDistanceToPreference(perf.distancePreference)
    : [5, 5];
  const surface: Locus = perf?.surfacePreference
    ? mapSurfaceToPreference(perf.surfacePreference)
    : [5, 5];
  const style: Locus = perf?.runningStyle ? mapStyleToLocus(perf.runningStyle) : [2, 2];

  return { stats: { speed, stamina }, preferences: { distance, surface }, style };
}

/**
 * Map genetic markers directly
 *
 * @param markers - The research genetic marker data
 * @returns The mapped marker genotype
 */
function mapGeneticMarkers(markers: StallionResearchData["geneticMarkers"]): MarkerGenotype {
  return {
    leopardComplex: markers?.leopardComplex || "recessive",
    csnbRisk: markers?.lethalCarriers?.csnb ? "high" : "low",
    sensoryPerception: "good",
    signalTransduction: "good",
    immunity: "good",
    geneticDiversity: 0.5 + Math.random() * 0.5,
    lethalCarriers: {
      csnb: markers?.lethalCarriers?.csnb || false,
      hypp: markers?.lethalCarriers?.hypp || false,
      olws: markers?.lethalCarriers?.olws || false,
      ffs1: markers?.lethalCarriers?.ffs1 || false,
    },
  };
}

/**
 * Map research data to genotype.
 *
 * Converts stallion research data to a genotype by mapping physical traits,
 * racing performance, and genetic markers, with fallback to deterministic generation
 * for unmapped fields.
 *
 * @param researchData - Stallion research data
 * @param tier - Quality tier
 * @returns Generated genotype
 *
 * @example
 * const genotype = mapResearchDataToGenotype(stallionData, "elite");
 */
export function mapResearchDataToGenotype(
  researchData: StallionResearchData,
  tier: "starter" | "budget" | "mid" | "elite",
): Genotype {
  const baseGenotype = generateDeterministicGenotype(researchData.name, tier, undefined, undefined);

  if (researchData.physicalTraits) {
    const physical = mapPhysicalTraitsToDNA(researchData.physicalTraits);
    baseGenotype.size = physical.size;
    baseGenotype.physical = physical.physical;
    baseGenotype.mental = physical.mental;
  }

  if (researchData.racingPerformance) {
    const perf = mapRacingPerformanceToDNA(researchData.racingPerformance, tier);
    baseGenotype.stats.speed = perf.stats.speed;
    baseGenotype.stats.stamina = perf.stats.stamina;
    baseGenotype.preferences.distance = perf.preferences.distance;
    baseGenotype.preferences.surface = perf.preferences.surface;
    baseGenotype.style = perf.style;
  }

  if (researchData.geneticMarkers) {
    baseGenotype.markers = mapGeneticMarkers(researchData.geneticMarkers);
  }

  return baseGenotype;
}
