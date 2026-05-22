/**
 * phenotype/traits.ts - Trait resolution (trainability, peak age, recovery, fertility, etc.)
 *
 * Dependencies: @/core/common/types (Locus), @/core/horse/types (SockHeight, FaceWhite)
 */

import type { Locus } from "@/core/common/types";
import type { SockHeight, FaceWhite } from "@/core/horse/types";

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
export function resolveStrideType(locus: Locus): "short" | "average" | "long" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "short";
  if (sum >= 8) return "long";
  return "average";
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
