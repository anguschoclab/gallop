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

// --- Color Resolution ---
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

export function resolveStats(stats: StatGenotype): HorseStats {
  return {
    speed: sumLoci(stats.speed),
    stamina: sumLoci(stats.stamina),
    acceleration: sumLoci(stats.acceleration),
    consistency: sumLoci(stats.consistency),
  };
}

export function resolveRunningStyle(styleLocus: Locus): RunningStyle {
  const avg = (styleLocus[0] + styleLocus[1]) / 2;
  if (avg <= 1.5) return "E";
  if (avg <= 2.5) return "EP";
  if (avg <= 3.5) return "P";
  return "S";
}

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

export function resolveDistanceAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 800 + sum * 120;
}

export function resolveSurfaceAptitude(
  locus: Locus,
): Record<"Turf" | "Dirt" | "Synthetic", number> {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 };
  if (sum >= 8) return { Turf: 0.9, Dirt: 1.0, Synthetic: 0.95 };
  return { Turf: 0.98, Dirt: 0.98, Synthetic: 1.0 };
}

export function resolveAptitudeMultiplier(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.8 + (sum / 10) * 0.4;
}

export function resolveTrait(locus: Locus): "excellent" | "good" | "fair" | "poor" {
  const sum = locus[0] + locus[1];
  if (sum >= 9) return "excellent";
  if (sum >= 7) return "good";
  if (sum >= 4) return "fair";
  return "poor";
}

export function resolveInjuryProneness(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.12 - (sum / 10) * 0.1;
}

export function resolveHeartScore(loci: Locus[]): number {
  const sum = loci.reduce((acc, [a, b]) => acc + a + b, 0);
  return 0.85 + ((sum - 10) / 40) * 0.3;
}

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

export function resolveFiberBias(locus: Locus): "sprinter" | "balanced" | "stayer" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "sprinter";
  if (sum >= 8) return "stayer";
  return "balanced";
}

export function resolveStrideType(locus: Locus): "short" | "balanced" | "long" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "short";
  if (sum >= 8) return "long";
  return "balanced";
}

export function resolveTrackPreference(locus: Locus): "left" | "balanced" | "right" {
  const sum = locus[0] + locus[1];
  if (sum <= 4) return "left";
  if (sum >= 8) return "right";
  return "balanced";
}

export function resolveMudAptitude(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.85 + ((sum - 2) / 8) * 0.3;
}

export function resolveTrainability(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.5 + ((sum - 2) / 8) * 0.9;
}

export function resolvePeakAge(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 3;
  if (sum <= 5) return 4;
  if (sum <= 7) return 5;
  if (sum <= 9) return 6;
  return 7;
}

export function resolveRecoveryRate(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.7 + ((sum - 2) / 8) * 0.7;
}

export function resolveFertility(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 0.7 + ((sum - 2) / 8) * 0.29;
}

export function resolveFoalingEase(locus: Locus): number {
  const sum = locus[0] + locus[1];
  return 1.4 - ((sum - 2) / 8) * 0.8;
}

export function resolveMarkings(locus: any) {
  // Shared logic for resolving cosmetic flags
  return {
    socks: resolveSocks(locus.socks),
    face: resolveFaceWhite(locus.face),
    silverDapple: locus.silverDapple[0] + locus.silverDapple[1] >= 8,
    sabino: locus.sabino[0] + locus.sabino[1] >= 8,
    splashWhite: locus.splashWhite[0] + locus.splashWhite[1] >= 8,
  };
}

function resolveSocks(locus: Locus): SockHeight {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return "none";
  if (sum <= 7) return "sock";
  return "stocking";
}

function resolveFaceWhite(locus: Locus): FaceWhite {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return "none";
  if (sum <= 6) return "star";
  if (sum <= 9) return "blaze";
  return "bald";
}

export function resolveRacingViable(locus: Locus): boolean {
  return locus[0] + locus[1] >= 4;
}

export function resolveHealthStatus(health: HealthGenotype): HealthStatus {
  // Logic could be expanded to check for immediate health issues from genetics,
  // but for now, we initialize all horses as "healthy".
  return "healthy";
}

export function resolveBleederRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.15;
  if (sum <= 5) return 0.05;
  return 0.01;
}

export function resolveRoarerRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.1;
  if (sum <= 6) return 0.03;
  return 0;
}

// New health condition risk resolution functions
export function resolvePssmRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.15;
  if (sum <= 6) return 0.05;
  return 0;
}

export function resolveRerRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.12;
  if (sum <= 6) return 0.05;
  return 0;
}

export function resolveEpmRisk(locus: Locus): number {
  const sum = locus[0] + locus[1];
  if (sum <= 3) return 0.1;
  if (sum <= 6) return 0.04;
  return 0;
}

export function resolveSize(locus: Locus): { height: number; weight: number } {
  const sum = locus[0] + locus[1];
  const height = 14.2 + (sum / 10) * 2.8; // 14.2 to 17.0 hands
  const weight = 400 + (sum / 10) * 250; // 400kg to 650kg
  return { height, weight };
}

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
