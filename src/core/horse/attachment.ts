/**
 * attachment.ts - How attached an NPC stable is to one of its horses
 *
 * Some horses are simply not for sale at any sane price. This module scores a
 * stable's emotional/strategic attachment to a horse (0-100) and converts that
 * score into an asking-price multiplier used by:
 *  - the private sale resolution phase (accept / counter thresholds)
 *  - the player-facing offer dialog (quick offers, "your value" estimate)
 *
 * Dependencies: @/game/types (Horse, Stable)
 */

import type { Horse, Stable } from "@/game/types";

export type AttachmentTier = "available" | "valued" | "protected" | "untouchable";

export interface AttachmentSignal {
  label: string;
  points: number;
}

export interface HorseAttachment {
  /** 0-100 attachment score. */
  score: number;
  tier: AttachmentTier;
  /** Human label for the tier. */
  label: string;
  /** Multiplier applied to fair market value to get the stable's asking price. */
  askMultiplier: number;
  /** Individual contributions, largest first. */
  signals: AttachmentSignal[];
  /** One-line flavour explanation. */
  blurb: string;
}

/** Highest multiplier a completely untouchable horse can command. */
export const ATTACHMENT_MAX_MULTIPLIER = 6;
/** Baseline premium every NPC applies over raw market value. */
export const ATTACHMENT_BASE_MULTIPLIER = 1.05;

const TIER_LABELS: Record<AttachmentTier, string> = {
  available: "Open to offers",
  valued: "Valued",
  protected: "Protected",
  untouchable: "Untouchable",
};

const TIER_BLURBS: Record<AttachmentTier, string> = {
  available: "They would move this one for the right price.",
  valued: "They like this horse and will haggle hard.",
  protected: "A cornerstone of the stable — expect an inflated ask.",
  untouchable: "Effectively not for sale. They will name a ridiculous number.",
};

function tierFor(score: number): AttachmentTier {
  if (score >= 78) return "untouchable";
  if (score >= 52) return "protected";
  if (score >= 26) return "valued";
  return "available";
}

function personalitySignal(horse: Horse, stable: Stable): AttachmentSignal | null {
  const prime = horse.age >= horse.peakAge - 1 && horse.age <= horse.peakAge + 1;
  switch (stable.personality) {
    case "prestige":
      return horse.fame >= 20 ? { label: "Flagship of a prestige stable", points: 16 } : null;
    case "breeder":
      return horse.gender === "mare" || horse.isBlueHen
        ? { label: "Core of the breeding program", points: 14 }
        : null;
    case "win-now":
      return prime ? { label: "Peak-age horse for a win-now stable", points: 14 } : null;
    case "developer":
      return horse.age <= 2 ? { label: "Development project", points: 12 } : null;
    case "specialist":
      return { label: "Fits the stable's niche", points: 8 };
    case "trader":
      return { label: "Trading stable — everything has a price", points: -8 };
    case "aggressive":
      return prime ? { label: "Current campaign horse", points: 8 } : null;
    case "conservative":
      return { label: "Slow to sell out of the string", points: 6 };
    default:
      return null;
  }
}

/**
 * Scores how tightly a stable holds onto a horse.
 * @param horse - The horse being coveted.
 * @param stable - The NPC stable that owns it.
 */
export function evaluateHorseAttachment(horse: Horse, stable: Stable): HorseAttachment {
  const signals: AttachmentSignal[] = [];

  const fame = horse.fame ?? 0;
  if (fame > 0) {
    signals.push({ label: "Public profile / fame", points: Math.min(26, Math.round(fame / 2.2)) });
  }

  const potential = horse.potential ?? 0;
  if (potential >= 88) signals.push({ label: "Elite potential", points: 22 });
  else if (potential >= 78) signals.push({ label: "High potential", points: 13 });
  else if (potential >= 68) signals.push({ label: "Above-average potential", points: 6 });

  const starts = horse.careerStarts ?? 0;
  const wins = horse.careerWins ?? 0;
  if (starts >= 3 && wins / starts >= 0.5) {
    signals.push({ label: "Winning better than 50%", points: 12 });
  }

  if ((horse.lifetimeEarnings ?? 0) >= 250_000) {
    signals.push({ label: "Proven earner", points: 10 });
  }

  if (horse.isBlueHen || horse.blueHenStatus?.isBlueHen) {
    signals.push({ label: "Blue hen broodmare", points: 20 });
  }

  if (horse.stud?.atStud) {
    signals.push({ label: "Active at stud", points: 14 });
  }

  if ((horse.fanCount ?? 0) >= 500) {
    signals.push({ label: "Large fan following", points: 8 });
  }

  const p = personalitySignal(horse, stable);
  if (p) signals.push(p);

  if (horse.age >= horse.peakAge + 3) {
    signals.push({ label: "Past its peak", points: -12 });
  }

  const raw = signals.reduce((sum, s) => sum + s.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  const tier = tierFor(score);

  const askMultiplier =
    Math.round(
      (ATTACHMENT_BASE_MULTIPLIER +
        Math.pow(score / 100, 1.5) * (ATTACHMENT_MAX_MULTIPLIER - ATTACHMENT_BASE_MULTIPLIER)) *
        100,
    ) / 100;

  return {
    score,
    tier,
    label: TIER_LABELS[tier],
    askMultiplier,
    signals: [...signals].sort((a, b) => b.points - a.points),
    blurb: TIER_BLURBS[tier],
  };
}

/**
 * Converts a fair market valuation into the price the stable actually wants.
 * @param horse - The horse being coveted.
 * @param stable - The NPC stable that owns it.
 * @param marketValue - Fair market valuation of the horse.
 */
export function attachmentAdjustedAsk(horse: Horse, stable: Stable, marketValue: number): number {
  const { askMultiplier } = evaluateHorseAttachment(horse, stable);
  return Math.max(0, Math.round(marketValue * askMultiplier));
}

/**
 * Pre-computed quick-offer amounts for the player, derived from the stable's ask.
 * @param ask - The attachment-adjusted asking price.
 */
export function suggestedOfferTiers(ask: number): {
  lowball: number;
  fair: number;
  generous: number;
} {
  const round = (n: number) => Math.max(500, Math.round(n / 500) * 500);
  return {
    lowball: round(ask * 0.75),
    fair: round(ask),
    generous: round(ask * 1.15),
  };
}
