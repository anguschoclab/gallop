/**
 * reputation/index.ts - Reputation module
 *
 * This module provides manager prestige and reputation tracking functionality.
 *
 * Dependencies: ./reputationTypes (types and functions)
 * Related files: reputationTypes.ts (provides types and functions)
 */

// Reputation Module - Manager prestige and reputation tracking

export type {
  ReputationTier,
  ReputationSource,
  ReputationEvent,
  ManagerReputation,
} from "@/domains/reputation/model/reputationTypes";

export {
  getReputationTier,
  createReputationEvent,
  calculateRaceWinReputation,
  calculateRaceLossReputation,
  calculateBreedingReputation,
  formatReputationTier,
} from "@/domains/reputation/model/reputationTypes";

export {
  priceWeight,
  daysSincePlayerAcquired,
  marketTradeReputation,
  syndicationStakeReputation,
  CHURN_WINDOW_DAYS,
} from "@/domains/reputation/simulation/commerceReputation";
export type {
  MarketTradeReputationArgs,
  SyndicationReputationArgs,
} from "@/domains/reputation/simulation/commerceReputation";

export {
  canUpgradeFacility,
  canAccessSale,
  canReceiveAtLargeInvite,
  FACILITY_UPGRADE_TIER_REQ,
  SALE_ACCESS_TIER_REQ,
  INVITE_GRADE_TIER_REQ,
} from "@/domains/reputation/simulation/reputationGating";
