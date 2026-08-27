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
} from "./auctionHouses";

export {
  getRacecoursePrestige,
  getRacecoursePrestigeByName,
  racecoursePrestigeMultiplier,
  rankedRacecourses,
} from "./racecoursePrestige";
