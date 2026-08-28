import type { HorseAttachment, AttachmentTier } from "@/core/horse/attachment";
import {
  PREMIUM_FALLBACK_MULTIPLIER,
  DIPLOMATIC_BASE_ODDS,
  DIPLOMATIC_FRICTION_THRESHOLD,
  DIPLOMATIC_FRICTION_BOOST,
  DIPLOMATIC_TIER_PENALTY_STEP,
  DIPLOMATIC_REPUTATION_THRESHOLD,
  DIPLOMATIC_REPUTATION_PENALTY,
  DIPLOMATIC_MIN_ODDS,
  DIPLOMATIC_MAX_ODDS,
  DIPLOMATIC_SUCCESS_COST_MULTIPLIER,
  DIPLOMATIC_FAILURE_FRICTION_PENALTY,
} from "@/constants/privateSaleConstants";

export interface PremiumBuyoutResult {
  cost: number;
  label: string;
}

const PREMIUM_MULTIPLIERS: Record<AttachmentTier, number> = {
  available: 1.0,
  valued: 1.2,
  protected: 1.5,
  untouchable: 2.0,
};

export function computePremiumBuyout(
  attachment: HorseAttachment,
  ask: number,
): PremiumBuyoutResult {
  const multiplier = PREMIUM_MULTIPLIERS[attachment.tier] ?? PREMIUM_FALLBACK_MULTIPLIER;
  return {
    cost: Math.round(ask * multiplier),
    label: "Guaranteed acquisition",
  };
}

const TIER_PENALTY: Record<AttachmentTier, number> = {
  available: 0,
  valued: 0.5,
  protected: 1,
  untouchable: 2,
};

export interface DiplomaticPressureResult {
  odds: number;
  successCost: number;
  failurePenalty: string;
}

export function computeDiplomaticPressure(
  attachment: HorseAttachment,
  ask: number,
  friction: number,
  reputationScore: number,
): DiplomaticPressureResult {
  let odds = DIPLOMATIC_BASE_ODDS;
  if (friction > DIPLOMATIC_FRICTION_THRESHOLD) odds += DIPLOMATIC_FRICTION_BOOST;
  odds -= DIPLOMATIC_TIER_PENALTY_STEP * TIER_PENALTY[attachment.tier];
  if (reputationScore < DIPLOMATIC_REPUTATION_THRESHOLD) odds -= DIPLOMATIC_REPUTATION_PENALTY;
  odds = Math.max(DIPLOMATIC_MIN_ODDS, Math.min(DIPLOMATIC_MAX_ODDS, odds));

  return {
    odds,
    successCost: Math.round(ask * DIPLOMATIC_SUCCESS_COST_MULTIPLIER),
    failurePenalty: `Relationship damaged — friction +${DIPLOMATIC_FAILURE_FRICTION_PENALTY} with this stable.`,
  };
}
