/**
 * sireAnalyticsTypes.ts - Type definitions for sire analytics
 *
 * Extracted from sireAnalytics.ts for modularity.
 */

export type SireClassification = "elite" | "premium" | "solid" | "developing" | "unproven";

export type SurfaceBias = "dirt" | "turf" | "synthetic" | "balanced";

export type DistancePreference = "sprint" | "classic" | "stayer" | "versatile";

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

export type CropTier = "freshman" | "second-crop" | "established" | "unproven";
