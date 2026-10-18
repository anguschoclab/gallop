/**
 * prestige/index.ts - Venue prestige module
 *
 * Prestige for auction houses and racecourses.
 */

export type { PrestigeTier } from "@/domains/prestige/model/prestigeTypes";
export {
  PRESTIGE_TIER_LABELS,
  PRESTIGE_TIER_BOUNDARIES,
  getPrestigeTier,
  formatPrestigeTier,
  prestigeMultiplier,
  NEUTRAL_PRESTIGE_SCORE,
  MAX_PRESTIGE_SCORE,
  MIN_FAME_GAIN,
} from "@/domains/prestige/model/prestigeTypes";

export type { AuctionHouse } from "@/domains/prestige/simulation/auctionHouses";
export {
  AUCTION_HOUSES,
  AUCTION_HOUSE_BY_ID,
  getAuctionHouse,
  getHouseForSaleKind,
  resolveSaleHouse,
  housePrestigeMultiplier,
  houseCommissionRate,
  HOUSE_PRESTIGE_SPREAD,
} from "@/domains/prestige/simulation/auctionHouses";

export {
  getRacecoursePrestige,
  getRacecoursePrestigeByName,
  racecoursePrestigeMultiplier,
  rankedRacecourses,
  RACECOURSE_FLOOR_PRESTIGE,
  RACECOURSE_PRESTIGE_SPREAD,
} from "@/domains/prestige/simulation/racecoursePrestige";

export type {
  PlayerPrestigeStanding,
  PrestigeLadderEntry,
  PrestigeEntityKind,
} from "@/domains/prestige/simulation/playerPrestige";
export {
  playerPrestigeScore,
  playerPrestigeStanding,
  prestigeLadder,
} from "@/domains/prestige/simulation/playerPrestige";
