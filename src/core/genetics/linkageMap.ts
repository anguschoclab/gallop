/**
 * linkageMap.ts - Linkage map for genetic loci
 *
 * This file provides a linkage map that maps every locus to its chromosome
 * and position (0-1), defining which loci are linked and tend to be inherited together.
 *
 * Dependencies: ./chromosomes (LocusCoord, ChromosomeId)
 * Related files: inheritance.ts (uses linkage map for chromosome-aware crossover), chromosomes.ts (provides chromosome identifiers)
 */

/**
 * Linkage Map for Genetic Loci
 * Maps every locus to its chromosome and position (0-1)
 */

import type { LocusCoord, ChromosomeId } from "./chromosomes";

/**
 * Linkage map: maps locus key to chromosome and position
 * Position 0 = telomere start, Position 1 = telomere end
 * Loci on same chromosome are linked (tend to be inherited together)
 */
export const LINKAGE_MAP: Record<string, LocusCoord> = {
  // CHR_ATHLETIC: speed[0-9] at 0.05-0.55 (evenly spaced), fiberType at 0.70, stride at 0.85
  "speed.0": { chromosome: "ATHLETIC", position: 0.05 },
  "speed.1": { chromosome: "ATHLETIC", position: 0.1 },
  "speed.2": { chromosome: "ATHLETIC", position: 0.15 },
  "speed.3": { chromosome: "ATHLETIC", position: 0.2 },
  "speed.4": { chromosome: "ATHLETIC", position: 0.25 },
  "speed.5": { chromosome: "ATHLETIC", position: 0.3 },
  "speed.6": { chromosome: "ATHLETIC", position: 0.35 },
  "speed.7": { chromosome: "ATHLETIC", position: 0.4 },
  "speed.8": { chromosome: "ATHLETIC", position: 0.45 },
  "speed.9": { chromosome: "ATHLETIC", position: 0.5 },
  fiberType: { chromosome: "ATHLETIC", position: 0.7 },
  stride: { chromosome: "ATHLETIC", position: 0.85 },

  // CHR_ENDURANCE: stamina[0-9] at 0.05-0.55, distance at 0.70, mudAptitude at 0.85
  "stamina.0": { chromosome: "ENDURANCE", position: 0.05 },
  "stamina.1": { chromosome: "ENDURANCE", position: 0.1 },
  "stamina.2": { chromosome: "ENDURANCE", position: 0.15 },
  "stamina.3": { chromosome: "ENDURANCE", position: 0.2 },
  "stamina.4": { chromosome: "ENDURANCE", position: 0.25 },
  "stamina.5": { chromosome: "ENDURANCE", position: 0.3 },
  "stamina.6": { chromosome: "ENDURANCE", position: 0.35 },
  "stamina.7": { chromosome: "ENDURANCE", position: 0.4 },
  "stamina.8": { chromosome: "ENDURANCE", position: 0.45 },
  "stamina.9": { chromosome: "ENDURANCE", position: 0.5 },
  distance: { chromosome: "ENDURANCE", position: 0.7 },
  mudAptitude: { chromosome: "ENDURANCE", position: 0.85 },

  // CHR_PERFORMANCE: acceleration[0-9] at 0.05-0.55, heart[0-4] at 0.62-0.78, style at 0.90
  "acceleration.0": { chromosome: "PERFORMANCE", position: 0.05 },
  "acceleration.1": { chromosome: "PERFORMANCE", position: 0.1 },
  "acceleration.2": { chromosome: "PERFORMANCE", position: 0.15 },
  "acceleration.3": { chromosome: "PERFORMANCE", position: 0.2 },
  "acceleration.4": { chromosome: "PERFORMANCE", position: 0.25 },
  "acceleration.5": { chromosome: "PERFORMANCE", position: 0.3 },
  "acceleration.6": { chromosome: "PERFORMANCE", position: 0.35 },
  "acceleration.7": { chromosome: "PERFORMANCE", position: 0.4 },
  "acceleration.8": { chromosome: "PERFORMANCE", position: 0.45 },
  "acceleration.9": { chromosome: "PERFORMANCE", position: 0.5 },
  "heart.0": { chromosome: "PERFORMANCE", position: 0.62 },
  "heart.1": { chromosome: "PERFORMANCE", position: 0.68 },
  "heart.2": { chromosome: "PERFORMANCE", position: 0.72 },
  "heart.3": { chromosome: "PERFORMANCE", position: 0.74 },
  "heart.4": { chromosome: "PERFORMANCE", position: 0.78 },
  style: { chromosome: "PERFORMANCE", position: 0.9 },

  // CHR_BEHAVIORAL: consistency[0-9] at 0.05-0.55, mental at 0.65, trainability at 0.75, recovery at 0.88
  "consistency.0": { chromosome: "BEHAVIORAL", position: 0.05 },
  "consistency.1": { chromosome: "BEHAVIORAL", position: 0.1 },
  "consistency.2": { chromosome: "BEHAVIORAL", position: 0.15 },
  "consistency.3": { chromosome: "BEHAVIORAL", position: 0.2 },
  "consistency.4": { chromosome: "BEHAVIORAL", position: 0.25 },
  "consistency.5": { chromosome: "BEHAVIORAL", position: 0.3 },
  "consistency.6": { chromosome: "BEHAVIORAL", position: 0.35 },
  "consistency.7": { chromosome: "BEHAVIORAL", position: 0.4 },
  "consistency.8": { chromosome: "BEHAVIORAL", position: 0.45 },
  "consistency.9": { chromosome: "BEHAVIORAL", position: 0.5 },
  mental: { chromosome: "BEHAVIORAL", position: 0.65 },
  trainability: { chromosome: "BEHAVIORAL", position: 0.75 },
  recovery: { chromosome: "BEHAVIORAL", position: 0.88 },

  // CHR_CONFORMATION: physical at 0.15, size at 0.35, durability at 0.55, peakAge at 0.72, foalingEase at 0.88
  physical: { chromosome: "CONFORMATION", position: 0.15 },
  size: { chromosome: "CONFORMATION", position: 0.35 },
  durability: { chromosome: "CONFORMATION", position: 0.55 },
  peakAge: { chromosome: "CONFORMATION", position: 0.72 },
  foalingEase: { chromosome: "CONFORMATION", position: 0.88 },

  // CHR_TRACK: surface at 0.20, climbing at 0.45, cornering at 0.65, trackBias at 0.85
  surface: { chromosome: "TRACK", position: 0.2 },
  climbing: { chromosome: "TRACK", position: 0.45 },
  cornering: { chromosome: "TRACK", position: 0.65 },
  trackBias: { chromosome: "TRACK", position: 0.85 },

  // CHR_HEALTH: bleeder at 0.10, roarer at 0.25, ocd at 0.40, efna5 at 0.55, pssm at 0.65, rer at 0.75, epm at 0.88
  bleeder: { chromosome: "HEALTH", position: 0.1 },
  roarer: { chromosome: "HEALTH", position: 0.25 },
  ocd: { chromosome: "HEALTH", position: 0.4 },
  efna5: { chromosome: "HEALTH", position: 0.55 },
  pssm: { chromosome: "HEALTH", position: 0.65 },
  rer: { chromosome: "HEALTH", position: 0.75 },
  epm: { chromosome: "HEALTH", position: 0.88 },

  // CHR_COLOR: extension at 0.20, agouti at 0.45, gray at 0.65, cream at 0.85
  extension: { chromosome: "COLOR", position: 0.2 },
  agouti: { chromosome: "COLOR", position: 0.45 },
  gray: { chromosome: "COLOR", position: 0.65 },
  cream: { chromosome: "COLOR", position: 0.85 },

  // CHR_MARKINGS: socks at 0.15, face at 0.35, silverDapple at 0.55, sabino at 0.72, splashWhite at 0.88
  socks: { chromosome: "MARKINGS", position: 0.15 },
  face: { chromosome: "MARKINGS", position: 0.35 },
  silverDapple: { chromosome: "MARKINGS", position: 0.55 },
  sabino: { chromosome: "MARKINGS", position: 0.72 },
  splashWhite: { chromosome: "MARKINGS", position: 0.88 },
};

/**
 * Get locus coordinate from linkage map
 * @param locusKey - Locus key (e.g., "speed.5", "bleeder", "extension")
 * @returns Locus coordinate or undefined if not found
 */
export function getLocusCoord(locusKey: string): LocusCoord | undefined {
  return LINKAGE_MAP[locusKey];
}

/**
 * Get all loci for a specific chromosome
 * @param chromosomeId - Chromosome identifier
 * @returns Array of locus keys on this chromosome
 */
export function getLociByChromosome(chromosomeId: ChromosomeId): string[] {
  return Object.entries(LINKAGE_MAP)
    .filter(([_, coord]) => coord.chromosome === chromosomeId)
    .map(([key, _]) => key);
}

/**
 * Markers (leopardComplex, lethalCarriers, sensoryPerception, signalTransduction, immunity, geneticDiversity)
 * remain independently assorting - not in LINKAGE_MAP
 * These use the existing crossover() wrapper for independent assortment
 */
export const INDEPENDENTLY_ASSORTING_LOCI = [
  "leopardComplex",
  "lethalCarriers",
  "sensoryPerception",
  "signalTransduction",
  "immunity",
  "geneticDiversity",
];
