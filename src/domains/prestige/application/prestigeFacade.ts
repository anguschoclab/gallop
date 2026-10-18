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
} from "@/domains/prestige/model/prestigeTypes";
export type { PrestigeTier } from "@/domains/prestige/model/prestigeTypes";

export * from "@/domains/prestige/simulation/auctionHouses";
export * from "@/domains/prestige/simulation/playerPrestige";
export * from "@/domains/prestige/simulation/racecoursePrestige";

// Export strategy prestige helpers with disambiguated names to avoid
// PrestigeTier type conflict with prestigeTypes.
export {
  getPrestigeTier as getStrategyPrestigeTier,
  getPrestigeTierBadgeClass,
  calculateVenuePrestige,
  calculateAverageCampaignPrestige,
} from "@/domains/prestige/simulation/strategyPrestigeHelpers";
export type { PrestigeTier as StrategyPrestigeTier } from "@/domains/prestige/simulation/strategyPrestigeHelpers";
