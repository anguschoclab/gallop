/**
 * stableReputationTier.ts - Reputation tiers for NPC stables
 *
 * Every NPC stable carries a 0-100 reputation. This module turns that number
 * into a named tier with its own commercial temperament, so the market reacts
 * to the *pairing* of the two sides rather than applying one flat factor to
 * every stable:
 *
 *   - A backyard yard barely knows (or cares) who the player is: it bids close
 *     to fair value whatever your standing, and hardly marks its asks up.
 *   - An elite operation is snobbish: it lowballs unknown managers hard, and
 *     charges them a premium to buy, but treats a legendary manager as a peer.
 *
 * Pure logic only - no store access, no mutation of inputs.
 *
 * Dependencies: @/core/reputation/reputationTypes, @/constants/privateSaleConstants
 * Related files: src/core/market/exchangeAI.ts, src/core/market/exchange.ts,
 *   src/components/market/HorseOrderBook.tsx
 */

import {
  getReputationTier,
  formatReputationTier,
  type ReputationTier,
} from "@/core/reputation/reputationTypes";
import { SELLER_STANDING_BID_FACTOR_BY_TIER } from "@/constants/privateSaleConstants";
import type { Stable } from "./types";

/** Named reputation band for an NPC stable (from its 0-100 reputation). */
export type StableReputationTier = "backyard" | "provincial" | "established" | "classic" | "elite";

export type StableReputationTierMeta = {
  tier: StableReputationTier;
  label: string;
  /** Inclusive lower bound of the stable's 0-100 reputation. */
  minReputation: number;
  /**
   * How strongly this stable reacts to the player's standing when bidding.
   * 0 = ignores standing entirely, 1 = full reputation-table swing,
   * >1 = amplifies it.
   */
  standingSensitivity: number;
  /**
   * How strongly it reacts to the player's standing when quoting an ask
   * (an unknown buyer pays more; a famous one is courted).
   */
  askSensitivity: number;
  /** Extra markup an unknown buyer pays at worst, as a fraction. */
  maxAskPremium: number;
  /** How this stable treats the player, for UI copy. */
  attitude: string;
};

/**
 * Tier table. Sensitivity rises with prestige: the grander the yard, the more
 * it cares who it is dealing with.
 */
export const STABLE_REPUTATION_TIERS: StableReputationTierMeta[] = [
  {
    tier: "elite",
    label: "Elite",
    minReputation: 85,
    standingSensitivity: 1.6,
    askSensitivity: 1.5,
    maxAskPremium: 0.18,
    attitude: "Deals only on its own terms — unknown managers pay for the privilege",
  },
  {
    tier: "classic",
    label: "Classic",
    minReputation: 70,
    standingSensitivity: 1.25,
    askSensitivity: 1.15,
    maxAskPremium: 0.12,
    attitude: "Protective of its name; weighs your standing carefully",
  },
  {
    tier: "established",
    label: "Established",
    minReputation: 50,
    standingSensitivity: 1,
    askSensitivity: 0.85,
    maxAskPremium: 0.08,
    attitude: "Trades on merit with a nod to reputation",
  },
  {
    tier: "provincial",
    label: "Provincial",
    minReputation: 30,
    standingSensitivity: 0.7,
    askSensitivity: 0.55,
    maxAskPremium: 0.05,
    attitude: "Happy to deal with anyone who turns up with money",
  },
  {
    tier: "backyard",
    label: "Backyard",
    minReputation: 0,
    standingSensitivity: 0.35,
    askSensitivity: 0.3,
    maxAskPremium: 0.03,
    attitude: "Barely follows the big yards — your standing means little here",
  },
];

/**
 * Tier band for a raw 0-100 stable reputation.
 *
 * @param reputation - Raw 0-100 stable reputation
 */
export function getStableReputationTier(reputation: number): StableReputationTier {
  const rep = Number.isFinite(reputation) ? reputation : 50;
  return STABLE_REPUTATION_TIERS.find((t) => rep >= t.minReputation)?.tier ?? "backyard";
}

/**
 * Full tier metadata for a raw 0-100 stable reputation.
 *
 * @param reputation - Raw 0-100 stable reputation
 */
export function getStableReputationTierMeta(reputation: number): StableReputationTierMeta {
  const tier = getStableReputationTier(reputation);
  return (
    STABLE_REPUTATION_TIERS.find((t) => t.tier === tier) ??
    STABLE_REPUTATION_TIERS[STABLE_REPUTATION_TIERS.length - 1]
  );
}

/**
 * Tier metadata for a stable object.
 *
 * @param stable - Stable to resolve tier metadata for
 */
export function stableTierMeta(stable: Pick<Stable, "reputation">): StableReputationTierMeta {
  return getStableReputationTierMeta(stable.reputation);
}

/**
 * The flat, stable-agnostic factor NPCs apply to bids on the player's horses,
 * based solely on the player's reputation tier. Unknown sellers get lowballed;
 * legendary ones command a premium. This is the canonical source —
 * `exchangeAI.sellerStandingBidFactor` delegates here.
 *
 * @param reputationScore - Player reputation score (0-1000)
 */
export function sellerStandingFactor(reputationScore: number): {
  factor: number;
  tier: ReputationTier;
  tierLabel: string;
} {
  const tier = getReputationTier(reputationScore);
  return {
    factor: SELLER_STANDING_BID_FACTOR_BY_TIER[tier] ?? 1,
    tier,
    tierLabel: formatReputationTier(tier),
  };
}

export type StandingReaction = {
  /** Price multiplier to apply. */
  factor: number;
  /** The flat, stable-agnostic factor this was derived from. */
  baseFactor: number;
  /** Player's reputation tier. */
  playerTier: ReputationTier;
  playerTierLabel: string;
  /** Stable's own reputation tier. */
  stableTier: StableReputationTier;
  stableTierLabel: string;
  /** Sensitivity actually applied. */
  sensitivity: number;
  /** Short human-readable explanation for the UI. */
  note: string;
};

function pct(factor: number): number {
  return Math.round(Math.abs(1 - factor) * 100);
}

/**
 * Shared setup for both bid and ask standing reactions: resolves the stable
 * tier metadata, player reputation tier, the flat bid-table factor, and the
 * player's tier label. The two reaction functions then apply their own
 * factor formula and note text on top of this.
 *
 * @param stableReputation - Stable reputation 0-100
 * @param playerReputationScore - Player reputation score 0-1000
 */
function standingReactionSetup(stableReputation: number, playerReputationScore: number) {
  const meta = getStableReputationTierMeta(stableReputation);
  const playerTier = getReputationTier(playerReputationScore);
  const baseFactor = SELLER_STANDING_BID_FACTOR_BY_TIER[playerTier] ?? 1;
  const playerTierLabel = formatReputationTier(playerTier);
  return { meta, playerTier, baseFactor, playerTierLabel };
}

/**
 * How much an NPC stable adjusts a *bid* on the player's horse, given the
 * player's standing and the stable's own tier.
 *
 * @param stableReputation - Stable reputation 0-100
 * @param playerReputationScore - Player reputation score 0-1000
 */
export function stableStandingBidReaction(
  stableReputation: number,
  playerReputationScore: number,
): StandingReaction {
  const { meta, playerTier, baseFactor, playerTierLabel } = standingReactionSetup(
    stableReputation,
    playerReputationScore,
  );
  const factor = 1 + (baseFactor - 1) * meta.standingSensitivity;

  const note =
    factor < 0.999
      ? `${meta.label} yard bids ${pct(factor)}% under — seller is ${playerTierLabel}`
      : factor > 1.001
        ? `${meta.label} yard pays ${pct(factor)}% over for a ${playerTierLabel} seller`
        : `${meta.label} yard is indifferent to your standing`;

  return {
    factor,
    baseFactor,
    playerTier,
    playerTierLabel,
    stableTier: meta.tier,
    stableTierLabel: meta.label,
    sensitivity: meta.standingSensitivity,
    note,
  };
}

/**
 * How much an NPC stable adjusts an *ask* when the player is the buyer. The
 * flat bid table is inverted: a poorly regarded buyer is quoted up, a highly
 * regarded one gets courted with a small discount. The swing is capped by the
 * stable tier's maxAskPremium.
 *
 * @param stableReputation - Stable reputation 0-100
 * @param playerReputationScore - Player reputation score 0-1000
 */
export function stableStandingAskReaction(
  stableReputation: number,
  playerReputationScore: number,
): StandingReaction {
  const {
    meta,
    playerTier,
    baseFactor: baseBid,
    playerTierLabel,
  } = standingReactionSetup(stableReputation, playerReputationScore);
  // Invert: standing below "national" (factor < 1) means the buyer is quoted up.
  const rawSwing = (1 - baseBid) * meta.askSensitivity;
  const swing = Math.max(-meta.maxAskPremium, Math.min(meta.maxAskPremium, rawSwing));
  const factor = 1 + swing;

  const note =
    factor > 1.001
      ? `${meta.label} yard quotes ${pct(factor)}% over to a ${playerTierLabel} buyer`
      : factor < 0.999
        ? `${meta.label} yard shades ${pct(factor)}% off for a ${playerTierLabel} buyer`
        : `${meta.label} yard quotes you the standard price`;

  return {
    factor,
    baseFactor: baseBid,
    playerTier,
    playerTierLabel,
    stableTier: meta.tier,
    stableTierLabel: meta.label,
    sensitivity: meta.askSensitivity,
    note,
  };
}
