/**
 * prestigeTypes.ts - Shared prestige scale for venues (auction houses, racecourses)
 *
 * Prestige is a 0-100 score bucketed into tiers. Tiers drive display treatment
 * and gameplay multipliers (hammer price strength, fame earned at a venue).
 *
 * Dependencies: none
 * Related files: auctionHouses.ts, racecoursePrestige.ts
 */

export type PrestigeTier = "provincial" | "regional" | "national" | "premier" | "world";

export const PRESTIGE_TIER_LABELS: Record<PrestigeTier, string> = {
  provincial: "Provincial",
  regional: "Regional",
  national: "National",
  premier: "Premier",
  world: "World Class",
};

/**
 * Bucket a 0-100 prestige score into a tier.
 * @param score
 */
export function getPrestigeTier(score: number): PrestigeTier {
  if (score >= 90) return "world";
  if (score >= 72) return "premier";
  if (score >= 52) return "national";
  if (score >= 30) return "regional";
  return "provincial";
}

export function formatPrestigeTier(score: number): string {
  return PRESTIGE_TIER_LABELS[getPrestigeTier(score)];
}

/**
 * Multiplier applied to money/fame outcomes at a venue.
 * Prestige 50 is neutral (1.0); the span is intentionally modest.
 *
 * @param score - Prestige score 0-100
 * @param spread - Maximum deviation from 1.0 at the extremes (default 0.2)
 */
export function prestigeMultiplier(score: number, spread = 0.2): number {
  const clamped = Math.max(0, Math.min(100, score));
  return 1 + ((clamped - 50) / 50) * spread;
}
