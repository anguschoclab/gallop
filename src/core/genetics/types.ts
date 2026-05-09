/**
 * types.ts - Genetics type definitions
 *
 * This file provides type definitions for genetic concepts including color genotypes,
 * stat genotypes, preference genotypes, marker genotypes, markings genotypes,
 * health genotypes, and the complete genotype structure.
 *
 * Dependencies: @/core/common/types (Locus)
 * Related files: phenotype.ts (resolves genotypes to phenotypes), inheritance.ts (generates genotypes from parents)
 */

import type { Locus } from "@/core/common/types";
export type { Locus };

/**
 * Color genotype controlling coat color.
 * Extension: E (black) or e (chestnut)
 * Agouti: A (bay) or a (black)
 * Gray: G (gray) or g (non-gray)
 * Cream: Cr (dilute) or n (normal)
 */
export type ColorGenotype = {
  extension: Locus;
  agouti: Locus;
  gray: Locus;
  cream: Locus;
};

/**
 * Stat genotype for racing performance.
 * Each stat is controlled by 10 loci.
 */
export type StatGenotype = {
  speed: Locus[];
  stamina: Locus[];
  acceleration: Locus[];
  consistency: Locus[];
};

/**
 * Preference genotype for distance, surface, and physical traits.
 */
export type PreferenceGenotype = {
  distance: Locus;
  surface: Locus;
  climbing: Locus;
  cornering: Locus;
};

/**
 * Marker genotype for genetic markers and diversity.
 */
export type MarkerGenotype = {
  leopardComplex: "dominant" | "recessive" | "heterozygous";
  csnbRisk: "high" | "low";
  sensoryPerception: "excellent" | "good" | "fair" | "poor";
  signalTransduction: "excellent" | "good" | "fair" | "poor";
  immunity: "excellent" | "good" | "fair" | "poor";
  geneticDiversity: number;
  lethalCarriers: { csnb: boolean; hypp: boolean; olws: boolean; ffs1: boolean };
};

/**
 * Markings genotype for cosmetic features.
 */
export type MarkingsGenotype = {
  socks: Locus;
  face: Locus;
  silverDapple: Locus;
  sabino: Locus;
  splashWhite: Locus;
};

/**
 * Health genotype for health condition risks.
 */
export type HealthGenotype = {
  bleeder: Locus;
  roarer: Locus;
  ocd: Locus;
  efna5: Locus;
  pssm: Locus;
  rer: Locus;
  epm: Locus;
};

/**
 * Complete genotype structure.
 * Combines all genetic loci for a horse.
 */
export type Genotype = {
  color: ColorGenotype;
  stats: StatGenotype;
  preferences: PreferenceGenotype;
  style: Locus;
  mental: Locus;
  physical: Locus;
  durability: Locus;
  size: Locus;
  markers: MarkerGenotype;
  heart: Locus[];
  fiberType: Locus;
  stride: Locus;
  trackBias: Locus;
  mudAptitude: Locus;
  trainability: Locus;
  peakAge: Locus;
  recovery: Locus;
  fertility: Locus;
  foalingEase: Locus;
  markings: MarkingsGenotype;
  health: HealthGenotype;
};
