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
} from "./sireAnalyticsTypes";

export {
  calculateAei,
  calculateCi,
  classifySire,
  getSireSurfaceBias,
  getSireDistancePreference,
  calculateProgenyWinPercentage,
} from "./sireAnalyticsMetrics";

export { getSireAnalytics, classifyStallion, generateSireNarrative } from "./sireAnalyticsSummary";
