/**
 * phenotype.ts - Phenotype resolution from genotypes
 *
 * This file provides functions for resolving phenotypes from genotypes, including
 * coat colors, stats, running style, aptitudes, health risks, markings, and other
 * observable traits.
 *
 * Dependencies: ./types (Genotype, ColorGenotype, StatGenotype, MarkerGenotype, HealthGenotype), @/core/common/types (Locus), @/core/horse/types (HorseStats, CoatColor, RunningStyle, GeneticMarkers, SockHeight, FaceWhite, HealthStatus)
 * Related files: types.ts (provides genotype definitions), inheritance.ts (generates genotypes)
 */

import type {
  Genotype,
  ColorGenotype,
  StatGenotype,
  MarkerGenotype,
  HealthGenotype,
} from "./types";
import type { Locus } from "@/core/common/types";
import type {
  HorseStats,
  CoatColor,
  RunningStyle,
  GeneticMarkers,
  SockHeight,
  FaceWhite,
  HealthStatus,
} from "@/core/horse/types";

export const TRAIT_VALUES: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
export const TRAIT_SCORE: Record<string, number> = {
  excellent: 1.0,
  good: 0.75,
  fair: 0.5,
  poor: 0.25,
};

/**
 * Resolve coat color from color genotype.
 *
 * Returns the coat color based on extension, agouti, gray, and cream loci.
 *
 * @param color - Color genotype
 * @returns Coat color
 *
 * @example
 * const coatColor = resolveCoatColor(genotype.color);
 */
export function resolveCoatColor(color: ColorGenotype): CoatColor {
  const isGray = color.gray[0] === 1 || color.gray[1] === 1;
  if (isGray) return "gray";

  if (color.cream[0] >= 3 && color.cream[1] >= 3) return "white";

  const hasExtension = color.extension[0] >= 1 || color.extension[1] >= 1;
  const hasAgouti = color.agouti[0] >= 1 || color.agouti[1] >= 1;
  const isDilute = color.cream[0] === 1 || color.cream[1] === 1;
  const isChampagne = color.cream[0] === 2 || color.cream[1] === 2;
  const isGrulla = color.cream[0] === 3 || color.cream[1] === 3;
  const isRoan = color.extension[0] === 2 || color.extension[1] === 2;
  const isDun = color.extension[0] === 3 || color.extension[1] === 3;

  if (isRoan) return "roan";
  if (isDun) return "dun";
  if (isGrulla) return "grulla";
  if (isChampagne) return "champagne";

  if (!hasExtension) {
    if (isDilute) return "palomino";
    if (color.agouti[0] >= 2 || color.agouti[1] >= 2) return "liver-chestnut";
    return "chestnut";
  }

  if (hasAgouti) {
    if (isDilute) return "buckskin";
    if (color.agouti[0] >= 3 || color.agouti[1] >= 3) return "dark-bay";
    if (color.agouti[0] === 2 || color.agouti[1] === 2) return "seal-brown";
    return "bay";
  }

  return "black";
}

// --- Stat Resolution ---
function sumLoci(loci: Locus[]): number {
  const sum = loci.reduce((acc, [a1, a2]) => acc + a1 + a2, 0);
  return Math.min(100, Math.max(1, sum));
}

/**
 * Resolve horse stats from stat genotype.
 *
 * Sums the loci for each stat and clamps to 1-100 range.
 *
 * @param stats - Stat genotype
 * @returns Horse stats
 *
 * @example
 * const stats = resolveStats(genotype.stats);
 */
export function resolveStats(stats: StatGenotype): HorseStats {
  return {
    speed: sumLoci(stats.speed),
    stamina: sumLoci(stats.stamina),
    acceleration: sumLoci(stats.acceleration),
    consistency: sumLoci(stats.consistency),
    temperament: 50,
    conformation: 50,
  };
}

/**
 * Resolve running style from style locus.
 *
 * Maps locus value to running style: E (early), EP (early-press), P (press), S (sustain/closer).
 *
 * @param styleLocus - Style locus
 * @returns Running style
 *
 * @example
 * const style = resolveRunningStyle(genotype.style);
 */
export function resolveRunningStyle(styleLocus: Locus): RunningStyle {
  const avg = (styleLocus[0] + styleLocus[1]) / 2;
  if (avg <= 1.5) return "E";
  if (avg <= 2.5) return "EP";
  if (avg <= 3.5) return "P";
  return "S";
}

/**
 * Resolve genetic markers from genotype.
 *
 * Extracts genetic markers from the genotype.
 *
 * @param genotype - Complete genotype
 * @returns Genetic markers
 *
 * @example
 * const markers = resolveGeneticMarkers(genotype);
 */
export function resolveGeneticMarkers(genotype: Genotype): GeneticMarkers {
  return {
    leopardComplex: genotype.markers.leopardComplex,
    csnbRisk: genotype.markers.csnbRisk,
    sensoryPerception: genotype.markers.sensoryPerception,
    signalTransduction: genotype.markers.signalTransduction,
    immunity: genotype.markers.immunity,
    geneticDiversity: genotype.markers.geneticDiversity,
    lethalCarriers: genotype.markers.lethalCarriers,
  };
}

/**
 * Resolve distance aptitude from locus.
 *
 * Maps locus value to preferred distance range (800-3200m).
 *
 * @param locus - Distance locus
 * @returns Preferred distance in meters
 *
 * @example
 * const distance = resolveDistanceAptitude(genotype.preferences.distance);
 */
export function resolveDistanceAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 800 + sum * 120;
}

/**
 * Resolve surface aptitude from locus.
 *
 * Maps locus value to surface bias for Turf, Dirt, and Synthetic.
 *
 * @param locus - Surface locus
 * @returns Surface aptitude multipliers
 *
 * @example
 * const aptitude = resolveSurfaceAptitude(genotype.preferences.surface);
 */
export function resolveSurfaceAptitude(
  locus: Locus,
): Record<"Turf" | "Dirt" | "Synthetic", number> {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 };
  if (sum >= 8) return { Turf: 0.9, Dirt: 1.0, Synthetic: 0.95 };
  return { Turf: 0.98, Dirt: 0.98, Synthetic: 1.0 };
}

/**
 * Resolve aptitude multiplier from locus.
 *
 * Returns a multiplier based on locus value (0.8-1.2 range).
 *
 * @param locus - Locus
 * @returns Aptitude multiplier
 *
 * @example
 * const multiplier = resolveAptitudeMultiplier(genotype.preferences.climbing);
 */
export function resolveAptitudeMultiplier(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.8 + (sum / 10) * 0.4;
}

/**
 * Resolve trait rating from locus.
 *
 * Maps locus value to trait rating: excellent, good, fair, or poor.
 *
 * @param locus - Locus
 * @returns Trait rating
 *
 * @example
 * const trait = resolveTrait(genotype.mental);
 */
export function resolveTrait(locus: Locus): "excellent" | "good" | "fair" | "poor" {
  const sum = locus[0] + locus[1];
  if (sum >= 9) return "excellent";
  if (sum >= 7) return "good";
  if (sum >= 4) return "fair";
  return "poor";
}

/**
 * Resolve injury proneness from locus.
 *
 * Returns injury risk based on locus value (lower is better).
 *
 * @param locus - Locus
 * @returns Injury proneness (0.02-0.12)
 *
 * @example
 * const risk = resolveInjuryProneness(genotype.durability);
 */
export function resolveInjuryProneness(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.12 - (sum / 10) * 0.1;
}

/**
 * Resolve heart score from heart loci.
 *
 * Returns heart score based on sum of heart loci (0.85-1.15 range).
 *
 * @param loci - Heart loci
 * @returns Heart score
 *
 * @example
 * const score = resolveHeartScore(genotype.heart);
 */
export function resolveHeartScore(loci: Locus[]): number {
  const sum = loci.reduce((acc, [a, b]) => acc + a + b, 0);
  return 0.85 + ((sum - 10) / 40) * 0.3;
}

/**
 * Calculate distance modifier based on fiber bias and race distance.
 *
 * Returns speed and stamina multipliers based on whether the horse is a
 * sprinter, stayer, or balanced and the race distance.
 *
 * @param fiberBias - Fiber bias type
 * @param distance - Race distance in meters
 * @returns Speed and stamina multipliers
 *
 * @example
 * const modifier = fiberDistanceModifier("sprinter", 1200);
 */
export function fiberDistanceModifier(
  fiberBias: "sprinter" | "balanced" | "stayer",
  distance: number,
): { speedMul: number; staminaMul: number } {
  if (fiberBias === "sprinter") {
    if (distance <= 1200) return { speedMul: 1.05, staminaMul: 0.95 };
    if (distance >= 2000) return { speedMul: 0.95, staminaMul: 0.9 };
  }
  if (fiberBias === "stayer") {
    if (distance <= 1200) return { speedMul: 0.9, staminaMul: 1.05 };
    if (distance >= 2000) return { speedMul: 0.98, staminaMul: 1.1 };
  }
  return { speedMul: 1, staminaMul: 1 };
}

/**
 * Resolve fiber bias from locus.
 *
 * Maps locus value to fiber bias: sprinter, balanced, or stayer.
 *
 * @param locus - Fiber type locus
 * @returns Fiber bias
 *
 * @example
 * const bias = resolveFiberBias(genotype.fiberType);
 */
export function resolveFiberBias(locus: Locus): "sprinter" | "balanced" | "stayer" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "sprinter";
  if (sum >= 8) return "stayer";
  return "balanced";
}

/**
 * Resolve stride type from locus.
 *
 * Maps locus value to stride type: short, balanced, or long.
 *
 * @param locus - Stride locus
 * @returns Stride type
 *
 * @example
 * const stride = resolveStrideType(genotype.stride);
 */
export function resolveStrideType(locus: Locus): "short" | "balanced" | "long" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "short";
  if (sum >= 8) return "long";
  return "balanced";
}

/**
 * Resolve track preference from locus.
 *
 * Maps locus value to track handedness preference: left, balanced, or right.
 *
 * @param locus - Track bias locus
 * @returns Track preference
 *
 * @example
 * const preference = resolveTrackPreference(genotype.trackBias);
 */
export function resolveTrackPreference(locus: Locus): "left" | "balanced" | "right" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "left";
  if (sum >= 8) return "right";
  return "balanced";
}

/**
 * Resolve mud aptitude from locus.
 *
 * Returns mud aptitude multiplier (0.85-1.15 range).
 *
 * @param locus - Mud aptitude locus
 * @returns Mud aptitude multiplier
 *
 * @example
 * const aptitude = resolveMudAptitude(genotype.mudAptitude);
 */
export function resolveMudAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.85 + ((sum - 2) / 8) * 0.3;
}

/**
 * Resolve trainability from locus.
 *
 * Returns trainability multiplier (0.5-1.4 range).
 *
 * @param locus - Trainability locus
 * @returns Trainability multiplier
 *
 * @example
 * const trainability = resolveTrainability(genotype.trainability);
 */
export function resolveTrainability(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.5 + ((sum - 2) / 8) * 0.9;
}

/**
 * Resolve peak age from locus.
 *
 * Maps locus value to peak performance age (3-7 years).
 *
 * @param locus - Peak age locus
 * @returns Peak age in years
 *
 * @example
 * const peakAge = resolvePeakAge(genotype.peakAge);
 */
export function resolvePeakAge(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 3;
  if (sum <= 5) return 4;
  if (sum <= 7) return 5;
  if (sum <= 9) return 6;
  return 7;
}

/**
 * Resolve recovery rate from locus.
 *
 * Returns recovery rate multiplier (0.7-1.4 range).
 *
 * @param locus - Recovery locus
 * @returns Recovery rate multiplier
 *
 * @example
 * const recovery = resolveRecoveryRate(genotype.recovery);
 */
export function resolveRecoveryRate(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.7 + ((sum - 2) / 8) * 0.7;
}

/**
 * Resolve fertility from locus.
 *
 * Returns fertility multiplier (0.7-0.99 range).
 *
 * @param locus - Fertility locus
 * @returns Fertility multiplier
 *
 * @example
 * const fertility = resolveFertility(genotype.fertility);
 */
export function resolveFertility(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.7 + ((sum - 2) / 8) * 0.29;
}

/**
 * Resolve foaling ease from locus.
 *
 * Returns foaling ease multiplier (higher is easier, 0.6-1.4 range).
 *
 * @param locus - Foaling ease locus
 * @returns Foaling ease multiplier
 *
 * @example
 * const ease = resolveFoalingEase(genotype.foalingEase);
 */
export function resolveFoalingEase(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 1.4 - ((sum - 2) / 8) * 0.8;
}

/**
 * Resolve markings from marker genotype.
 *
 * Returns the horse's markings (socks, face white, silver dapple, sabino, splash white)
 * based on the marker genotype.
 *
 * @param locus - Marker genotype locus with dynamic structure
 * @returns Markings object
 *
 * @example
 * const markings = resolveMarkings(genotype.markings);
 */
type MarkingsLocus = {
  socks: Locus;
  face: Locus;
  silverDapple: [number, number];
  sabino: [number, number];
  splashWhite: [number, number];
};

/**
 * Resolve markings from marker genotype.
 *
 * Returns the horse's markings (socks, face white, silver dapple, sabino, splash white)
 * based on the marker genotype.
 *
 * @param locus - Marker genotype locus with dynamic structure
 * @returns Markings object
 */
export function resolveMarkings(locus: MarkingsLocus) {
  // Shared logic for resolving cosmetic flags
  return {
    socks: resolveSocks(locus.socks),
    face: resolveFaceWhite(locus.face),
    silverDapple: locus.silverDapple[0] + locus.silverDapple[1] >= 8,
    sabino: locus.sabino[0] + locus.sabino[1] >= 8,
    splashWhite: locus.splashWhite[0] + locus.splashWhite[1] >= 8,
  };
}

/**
 * Resolve sock height from locus.
 *
 * @param locus - Sock locus
 * @returns Sock height
 */
function resolveSocks(locus: Locus): SockHeight {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return "none";
  if (sum <= 7) return "sock";
  return "stocking";
}

/**
 * Resolve face white pattern from locus.
 *
 * @param locus - Face white locus
 * @returns Face white pattern
 */
function resolveFaceWhite(locus: Locus): FaceWhite {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return "none";
  if (sum <= 6) return "star";
  if (sum <= 9) return "blaze";
  return "bald";
}

/**
 * Resolve racing viability from locus.
 *
 * Returns whether the horse is viable for racing based on locus sum.
 *
 * @param locus - Locus
 * @returns Racing viability
 *
 * @example
 * const viable = resolveRacingViable(genotype.durability);
 */
export function resolveRacingViable(locus: Locus): boolean {
  return locus[0] + locus[1] >= 4;
}

/**
 * Resolve health status from health genotype.
 *
 * Returns the horse's health status (currently always "healthy").
 *
 * @param health - Health genotype
 * @returns Health status
 *
 * @example
 * const status = resolveHealthStatus(genotype.health);
 */
export function resolveHealthStatus(health: HealthGenotype): HealthStatus {
  // Logic could be expanded to check for immediate health issues from genetics,
  // but for now, we initialize all horses as "healthy".
  return "healthy";
}

/**
 * Resolve bleeder risk from locus.
 *
 * Returns risk of exercise-induced pulmonary hemorrhage (0.01-0.15).
 *
 * @param locus - Bleeder locus
 * @returns Bleeder risk
 *
 * @example
 * const risk = resolveBleederRisk(genotype.health.bleeder);
 */
export function resolveBleederRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.15;
  if (sum <= 5) return 0.05;
  return 0.01;
}

/**
 * Resolve roarer risk from locus.
 *
 * Returns risk of laryngeal hemiplegia (0-0.1).
 *
 * @param locus - Roarer locus
 * @returns Roarer risk
 *
 * @example
 * const risk = resolveRoarerRisk(genotype.health.roarer);
 */
export function resolveRoarerRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.1;
  if (sum <= 6) return 0.03;
  return 0;
}

/**
 * Resolve PSSM risk from locus.
 *
 * Returns risk of polysaccharide storage myopathy (0-0.15).
 *
 * @param locus - PSSM locus
 * @returns PSSM risk
 *
 * @example
 * const risk = resolvePssmRisk(genotype.health.pssm);
 */
export function resolvePssmRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.15;
  if (sum <= 6) return 0.05;
  return 0;
}

/**
 * Resolve RER risk from locus.
 *
 * Returns risk of recurrent exertional rhabdomyolysis (0-0.12).
 *
 * @param locus - RER locus
 * @returns RER risk
 *
 * @example
 * const risk = resolveRerRisk(genotype.health.rer);
 */
export function resolveRerRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.12;
  if (sum <= 6) return 0.05;
  return 0;
}

/**
 * Resolve EPM risk from locus.
 *
 * Returns risk of equine protozoal myeloencephalitis susceptibility (0-0.1).
 *
 * @param locus - EPM locus
 * @returns EPM risk
 *
 * @example
 * const risk = resolveEpmRisk(genotype.health.epm);
 */
export function resolveEpmRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.1;
  if (sum <= 6) return 0.04;
  return 0;
}

/**
 * Resolve size from locus.
 *
 * Returns height (14.2-17.0 hands) and weight (400-650kg) based on locus.
 *
 * @param locus - Size locus
 * @returns Height and weight
 *
 * @example
 * const size = resolveSize(genotype.size);
 */
export function resolveSize(locus: Locus): { height: number; weight: number } {
  const sum = locus[0] + locus[1];
  const height = 14.2 + (sum / 10) * 2.8; // 14.2 to 17.0 hands
  const weight = 400 + (sum / 10) * 250; // 400kg to 650kg
  return { height, weight };
}

/**
 * Compute heterozygosity from genotype.
 *
 * Calculates the percentage of heterozygous loci as a fitness marker.
 *
 * @param genotype - Complete genotype
 * @returns Heterozygosity percentage (0-1)
 *
 * @example
 * const heterozygosity = computeHeterozygosity(genotype);
 */
export function computeHeterozygosity(genotype: Genotype): number {
  // Calculate percentage of heterozygous loci
  // This is a simplified fitness marker
  let totalLoci = 0;
  let heteroLoci = 0;

  const checkLocus = (l: Locus) => {
    totalLoci++;
    if (l[0] !== l[1]) heteroLoci++;
  };

  const checkLoci = (loci: Locus[]) => loci.forEach(checkLocus);

  checkLoci(genotype.stats.speed);
  checkLoci(genotype.stats.stamina);
  checkLoci(genotype.stats.acceleration);
  checkLoci(genotype.stats.consistency);
  checkLoci(genotype.heart);
  checkLocus(genotype.color.extension);
  checkLocus(genotype.color.agouti);
  checkLocus(genotype.color.gray);
  checkLocus(genotype.color.cream);
  checkLocus(genotype.preferences.distance);
  checkLocus(genotype.preferences.surface);

  return heteroLoci / totalLoci;
}
