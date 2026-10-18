/**
 * phenotype/index.ts - Barrel export for phenotype resolution modules
 *
 * Re-exports all resolvers so external consumers can continue importing
 * from `@/domains/genetics/simulation/phenotype` without changes.
 */

// --- Constants ---
export const TRAIT_VALUES: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
export const TRAIT_SCORE: Record<string, number> = {
  excellent: 1.0,
  good: 0.75,
  fair: 0.5,
  poor: 0.25,
};

// --- Color ---
export { resolveCoatColor } from "@/domains/genetics/simulation/phenotype/color";

// --- Stats ---
export { resolveStats } from "@/domains/genetics/simulation/phenotype/stats";

// --- Aptitude ---
export {
  resolveRunningStyle,
  resolveDistanceAptitude,
  resolveSurfaceAptitude,
  resolveAptitudeMultiplier,
  resolveMudAptitude,
  resolveWeatherPreference,
  fiberDistanceModifier,
} from "@/domains/genetics/simulation/phenotype/aptitude";

// --- Health ---
export {
  resolveGeneticMarkers,
  resolveHealthStatus,
  resolveRacingViable,
  resolveBleederRisk,
  resolveRoarerRisk,
  resolvePssmRisk,
  resolveRerRisk,
  resolveEpmRisk,
  computeHeterozygosity,
} from "@/domains/genetics/simulation/phenotype/health";

// --- Traits ---
export {
  resolveTrait,
  resolveHeartScore,
  resolveFiberBias,
  resolveStrideType,
  resolveTrackPreference,
  resolveTrainability,
  resolvePeakAge,
  resolveRecoveryRate,
  resolveFertility,
  resolveFoalingEase,
  resolveInjuryProneness,
  resolveSize,
  resolveMarkings,
} from "@/domains/genetics/simulation/phenotype/traits";
