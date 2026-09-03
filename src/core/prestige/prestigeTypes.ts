/**
 * prestigeTypes.ts - Shared prestige scale for venues (auction houses, racecourses)
 *
 * Prestige is a 0-100 score bucketed into tiers. Tiers drive display treatment
 * and gameplay multipliers (hammer price strength, fame earned at a venue).
 *
 * Dependencies: none
 * Related files: auctionHouses.ts, racecoursePrestige.ts
 */

/** Prestige score at which the multiplier is exactly 1.0 (neutral). */
export const NEUTRAL_PRESTIGE_SCORE = 50;
/** Maximum prestige score on the 0-100 scale. */
export const MAX_PRESTIGE_SCORE = 100;
/** Minimum fame gain after prestige scaling (prevents zeroing out small gains). */
export const MIN_FAME_GAIN = 1;

export type PrestigeTier = "provincial" | "regional" | "national" | "premier" | "world";

export const PRESTIGE_TIER_LABELS: Record<PrestigeTier, string> = {
  provincial: "Provincial",
  regional: "Regional",
  national: "National",
  premier: "Premier",
  world: "World Class",
};

/**
 * Prestige tier boundaries in descending order. Each entry is the inclusive
 * lower bound for its tier. The single source of truth for `getPrestigeTier`
 * and the prestige meter ticks in the UI.
 */
export const PRESTIGE_TIER_BOUNDARIES: { tier: PrestigeTier; min: number }[] = [
  { tier: "world", min: 90 },
  { tier: "premier", min: 72 },
  { tier: "national", min: 52 },
  { tier: "regional", min: 30 },
  { tier: "provincial", min: 0 },
];

/**
 * Bucket a 0-100 prestige score into a tier.
 * @param score
 */
export function getPrestigeTier(score: number): PrestigeTier {
  return PRESTIGE_TIER_BOUNDARIES.find((b) => score >= b.min)?.tier ?? "provincial";
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
  const clamped = Math.max(0, Math.min(MAX_PRESTIGE_SCORE, score));
  return 1 + ((clamped - NEUTRAL_PRESTIGE_SCORE) / NEUTRAL_PRESTIGE_SCORE) * spread;
}
