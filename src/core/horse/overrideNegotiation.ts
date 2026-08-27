import type { HorseAttachment, AttachmentTier } from "@/core/horse/attachment";

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
  const multiplier = PREMIUM_MULTIPLIERS[attachment.tier] ?? 1.5;
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
  let odds = 0.4;
  if (friction > 50) odds += 0.1;
  odds -= 0.15 * TIER_PENALTY[attachment.tier];
  if (reputationScore < 50) odds -= 0.1;
  odds = Math.max(0.05, Math.min(0.85, odds));

  return {
    odds,
    successCost: Math.round(ask * 1.1),
    failurePenalty: "Relationship damaged — friction +20 with this stable.",
  };
}
