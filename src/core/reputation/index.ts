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
} from "./reputationTypes";

export {
  getReputationTier,
  createReputationEvent,
  calculateRaceWinReputation,
  calculateRaceLossReputation,
  calculateBreedingReputation,
  formatReputationTier,
} from "./reputationTypes";

export {
  canUpgradeFacility,
  canAccessSale,
  canReceiveAtLargeInvite,
  FACILITY_UPGRADE_TIER_REQ,
  SALE_ACCESS_TIER_REQ,
  INVITE_GRADE_TIER_REQ,
} from "./reputationGating";
