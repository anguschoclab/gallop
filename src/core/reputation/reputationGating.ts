/**
 * reputationGating.ts - Reputation-based access gating logic
 *
 * Maps reputation tiers to access levels for facility upgrades,
 * auction sales, and race invitations.
 *
 * Dependencies: ./reputationTypes (ReputationTier), @/core/facilities (FacilityLevel), @/core/market/types (AuctionSaleKind)
 */

import type { ReputationTier } from "./reputationTypes";
import type { FacilityLevel } from "@/core/facilities";
import type { AuctionSaleKind } from "@/core/market/types";

// ─── Tier ordering ───────────────────────────────────────────────────────────

const TIER_ORDER: Record<ReputationTier, number> = {
  unknown: 0,
  local: 1,
  regional: 2,
  national: 3,
  international: 4,
  world_class: 5,
  legendary: 6,
};

function tierMeets(tier: ReputationTier, required: ReputationTier): boolean {
  return TIER_ORDER[tier] >= TIER_ORDER[required];
}

// ─── Facility upgrade gates ──────────────────────────────────────────────────

/**
 * Reputation tier required to upgrade FROM each facility level.
 * To upgrade from `basic` -> `standard`, you need `local` reputation.
 */
export const FACILITY_UPGRADE_TIER_REQ: Record<FacilityLevel, ReputationTier | null> = {
  basic: "local",
  standard: "regional",
  premium: "national",
  elite: null, // max level, no gate
};

export function canUpgradeFacility(
  currentLevel: FacilityLevel,
  tier: ReputationTier,
): { allowed: boolean; requiredTier: ReputationTier } {
  const required = FACILITY_UPGRADE_TIER_REQ[currentLevel];
  if (required === null) {
    return { allowed: true, requiredTier: tier };
  }
  return { allowed: tierMeets(tier, required), requiredTier: required };
}

// ─── Sale access gates ───────────────────────────────────────────────────────

/**
 * Reputation tier required to access each sale kind.
 * Only gated sale kinds are listed; unlisted kinds are open access.
 */
export const SALE_ACCESS_TIER_REQ: Partial<Record<AuctionSaleKind, ReputationTier>> = {
  "2yo_training": "regional",
  broodmare: "local",
};

export function canAccessSale(
  saleKind: AuctionSaleKind,
  tier: ReputationTier,
): { allowed: boolean; requiredTier: ReputationTier } {
  const required = SALE_ACCESS_TIER_REQ[saleKind];
  if (!required) {
    return { allowed: true, requiredTier: tier };
  }
  return { allowed: tierMeets(tier, required), requiredTier: required };
}

// ─── Race invitation gates ───────────────────────────────────────────────────

/**
 * Reputation tier required for at-large invitations by race grade.
 * Only graded races are gated; unlisted grades are open.
 */
export const INVITE_GRADE_TIER_REQ: Record<string, ReputationTier> = {
  G1: "regional",
  G2: "regional",
  G3: "local",
};

export function canReceiveAtLargeInvite(
  grade: string,
  tier: ReputationTier,
): { allowed: boolean; requiredTier: ReputationTier } {
  const required = INVITE_GRADE_TIER_REQ[grade];
  if (!required) {
    return { allowed: true, requiredTier: tier };
  }
  return { allowed: tierMeets(tier, required), requiredTier: required };
}
