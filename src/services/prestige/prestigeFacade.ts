/**
 * prestigeFacade.ts — Service-layer facade for prestige domain.
 * Per PR 9 of the megaplan.
 */

// Export prestigeTypes members (the default PrestigeTier)
export {
  NEUTRAL_PRESTIGE_SCORE,
  MAX_PRESTIGE_SCORE,
  MIN_FAME_GAIN,
  PRESTIGE_TIER_LABELS,
  PRESTIGE_TIER_BOUNDARIES,
  getPrestigeTier,
  formatPrestigeTier,
  prestigeMultiplier,
} from "@/core/prestige/prestigeTypes";
export type { PrestigeTier } from "@/core/prestige/prestigeTypes";

export * from "@/core/prestige/auctionHouses";
export * from "@/core/prestige/playerPrestige";
export * from "@/core/prestige/racecoursePrestige";

// Export strategy prestige helpers with disambiguated names to avoid
// PrestigeTier type conflict with prestigeTypes.
export {
  getPrestigeTier as getStrategyPrestigeTier,
  getPrestigeTierBadgeClass,
  calculateVenuePrestige,
  calculateAverageCampaignPrestige,
} from "@/core/prestige/strategyPrestigeHelpers";
export type { PrestigeTier as StrategyPrestigeTier } from "@/core/prestige/strategyPrestigeHelpers";
