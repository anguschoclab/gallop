/**
 * prestige/index.ts - Venue prestige module
 *
 * Prestige for auction houses and racecourses.
 */

export type { PrestigeTier } from "./prestigeTypes";
export {
  PRESTIGE_TIER_LABELS,
  getPrestigeTier,
  formatPrestigeTier,
  prestigeMultiplier,
  NEUTRAL_PRESTIGE_SCORE,
  MAX_PRESTIGE_SCORE,
  MIN_FAME_GAIN,
} from "./prestigeTypes";

export type { AuctionHouse } from "./auctionHouses";
export {
  AUCTION_HOUSES,
  AUCTION_HOUSE_BY_ID,
  getAuctionHouse,
  getHouseForSaleKind,
  resolveSaleHouse,
  housePrestigeMultiplier,
  houseCommissionRate,
  HOUSE_PRESTIGE_SPREAD,
} from "./auctionHouses";

export {
  getRacecoursePrestige,
  getRacecoursePrestigeByName,
  racecoursePrestigeMultiplier,
  rankedRacecourses,
  RACECOURSE_FLOOR_PRESTIGE,
  RACECOURSE_PRESTIGE_SPREAD,
} from "./racecoursePrestige";
