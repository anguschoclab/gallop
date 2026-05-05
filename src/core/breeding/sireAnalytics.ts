import type { Horse } from "@/game/types";

/**
 * Calculate Average Earnings Index (AEI) for a stallion
 * AEI measures the average earnings of a stallion's progeny relative to the average of all sires
 * Formula: (Progeny Average Earnings / Overall Sire Average Earnings) × 100
 */
export function calculateAei(stallion: Horse, allSires: Horse[]): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;
  
  // Get all horses in the game to find progeny
  // For now, we'll use a simplified calculation based on lifetimeFoals and lifetimeStakesFoals
  // In a full implementation, this would aggregate actual earnings from progeny race history
  
  const progenyCount = stallion.stud.lifetimeFoals;
  if (progenyCount === 0) return 0;
  
  // Simplified AEI calculation based on stakes winners ratio
  const stakesRatio = (stallion.stud.lifetimeStakesFoals || 0) / progenyCount;
  const baseAei = stakesRatio * 100; // Convert to percentage
  
  return Math.round(baseAei * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate Comparable Index (CI) for a stallion
 * CI compares a stallion's progeny performance to other stallions with similar mated mares
 * Formula: (Progeny Average Earnings / Comparable Sires' Progeny Average Earnings) × 100
 */
export function calculateCi(stallion: Horse, allSires: Horse[]): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;
  
  // Simplified CI calculation based on relative performance
  const aei = calculateAei(stallion, allSires);
  const averageAei = allSires.reduce((sum, s) => sum + calculateAei(s, allSires), 0) / allSires.length;
  
  if (averageAei === 0) return 0;
  
  const ci = (aei / averageAei) * 100;
  return Math.round(ci * 10) / 10; // Round to 1 decimal
}

/**
 * Classify a stallion based on their AEI/CI performance
 */
export type SireClassification = 
  | "elite"      // AEI > 2.0, CI > 1.0
  | "premium"    // AEI > 1.5, CI > 0.8
  | "solid"      // AEI > 1.0, CI > 0.5
  | "developing" // AEI > 0.5, CI > 0.3
  | "unproven";  // AEI <= 0.5 or insufficient data

export function classifySire(stallion: Horse, allSires: Horse[]): SireClassification {
  if (!stallion.stud || stallion.stud.lifetimeFoals < 5) return "unproven";
  
  const aei = calculateAei(stallion, allSires);
  const ci = calculateCi(stallion, allSires);
  
  if (aei > 2.0 && ci > 1.0) return "elite";
  if (aei > 1.5 && ci > 0.8) return "premium";
  if (aei > 1.0 && ci > 0.5) return "solid";
  if (aei > 0.5 && ci > 0.3) return "developing";
  
  return "unproven";
}

/**
 * Get surface bias for a stallion based on progeny performance
 */
export type SurfaceBias = "dirt" | "turf" | "synthetic" | "balanced";

export function getSireSurfaceBias(stallion: Horse): SurfaceBias {
  // In a full implementation, this would analyze progeny race history by surface
  // For now, return a default based on bloodline or balanced
  if (stallion.bloodline) {
    const bloodline = stallion.bloodline.toLowerCase();
    if (bloodline.includes("northern dancer") || bloodline.includes("sadler's wells")) {
      return "turf";
    }
    if (bloodline.includes("mr. prospector") || bloodline.includes("storm cat")) {
      return "dirt";
    }
  }
  return "balanced";
}

/**
 * Get distance preference for a stallion based on progeny performance
 */
export type DistancePreference = "sprint" | "classic" | "stayer" | "versatile";

export function getSireDistancePreference(stallion: Horse): DistancePreference {
  // In a full implementation, this would analyze progeny race history by distance
  // For now, return a default based on dosage or versatile
  return "versatile";
}

/**
 * Calculate win percentage for a stallion's progeny
 */
export function calculateProgenyWinPercentage(stallion: Horse): number {
  if (!stallion.stud || !stallion.stud.lifetimeFoals) return 0;
  
  // Simplified calculation using stakes winners as proxy for wins
  const stakesWinners = stallion.stud.lifetimeStakesFoals || 0;
  const totalFoals = stallion.stud.lifetimeFoals;
  
  const winPercentage = (stakesWinners / totalFoals) * 100;
  return Math.round(winPercentage * 10) / 10; // Round to 1 decimal
}

/**
 * Get sire analytics summary
 */
export interface SireAnalytics {
  stallionId: string;
  stallionName: string;
  aei: number;
  ci: number;
  classification: SireClassification;
  surfaceBias: SurfaceBias;
  distancePreference: DistancePreference;
  progenyWinPercentage: number;
  lifetimeFoals: number;
  lifetimeStakesFoals: number;
  lifetimeG1Foals: number;
  standingFee: number;
}

export function getSireAnalytics(stallion: Horse, allSires: Horse[]): SireAnalytics {
  return {
    stallionId: stallion.id,
    stallionName: stallion.name,
    aei: calculateAei(stallion, allSires),
    ci: calculateCi(stallion, allSires),
    classification: classifySire(stallion, allSires),
    surfaceBias: getSireSurfaceBias(stallion),
    distancePreference: getSireDistancePreference(stallion),
    progenyWinPercentage: calculateProgenyWinPercentage(stallion),
    lifetimeFoals: stallion.stud?.lifetimeFoals || 0,
    lifetimeStakesFoals: stallion.stud?.lifetimeStakesFoals || 0,
    lifetimeG1Foals: stallion.stud?.lifetimeG1Foals || 0,
    standingFee: stallion.stud?.standingFee || 0,
  };
}
