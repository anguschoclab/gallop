/**
 * sireAnalytics.ts - Re-exports for stallion performance analytics
 *
 * This file re-exports types, metrics, and summary functions from
 * dedicated modules for backward compatibility.
 */

export {
  type SireClassification,
  type SurfaceBias,
  type DistancePreference,
  type SireAnalytics,
  type CropTier,
} from "@/domains/breeding/model/sireAnalyticsTypes";

export {
  calculateAei,
  calculateCi,
  classifySire,
  getSireSurfaceBias,
  getSireDistancePreference,
  calculateProgenyWinPercentage,
} from "@/domains/breeding/simulation/sireAnalyticsMetrics";

export {
  getSireAnalytics,
  classifyStallion,
  generateSireNarrative,
} from "@/domains/breeding/simulation/sireAnalyticsSummary";
