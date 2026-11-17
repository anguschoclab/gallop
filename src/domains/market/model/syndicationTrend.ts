/**
 * syndicationTrend.ts - Real-world trend signal for automatic syndication
 *
 * Reads the bundled (offline) real-world bloodstock indices — whole market and
 * the Group/Grade 1 pedigree segment — and turns their recent move into a
 * share-price multiplier and a buy / hold / sell decision for auto-syndicate.
 */

import { realWorldMovePct } from "@/domains/calendar/model/realWorldMarketIndices";

/** Look-back window for the real-world trend, in game days. */
export const SYNDICATION_TREND_WINDOW_DAYS = 90;
/** Move (in %) beyond which the market counts as rising or falling. */
export const SYNDICATION_TREND_THRESHOLD_PCT = 2;
/** Move (in %) that counts as a strong rise, doubling shares offered. */
export const SYNDICATION_STRONG_RISE_PCT = 8;
export const SYNDICATION_PRICE_MIN_MULT = 0.85;
export const SYNDICATION_PRICE_MAX_MULT = 1.2;

export type SyndicationAction = "sell" | "hold" | "buy";

export type SyndicationTrend = {
  /** Blended real-world move over the window, in %. */
  trendPct: number;
  /** Multiplier applied to share prices. */
  priceMultiplier: number;
  action: SyndicationAction;
  /** Fraction of the syndicate's shares to offer (sell) or buy back (buy). */
  shareFraction: number;
};

export function syndicationTrend(day: number): SyndicationTrend {
  const windowDays = SYNDICATION_TREND_WINDOW_DAYS;
  const market = realWorldMovePct({ kind: "market", day, windowDays });
  const g1 = realWorldMovePct({ kind: "grade", value: "G1", day, windowDays });
  return trendFromMove((market + g1) / 2);
}

export function trendFromMove(trendPct: number): SyndicationTrend {
  const priceMultiplier = Math.min(
    SYNDICATION_PRICE_MAX_MULT,
    Math.max(SYNDICATION_PRICE_MIN_MULT, 1 + trendPct / 100),
  );
  if (trendPct >= SYNDICATION_TREND_THRESHOLD_PCT) {
    return {
      trendPct,
      priceMultiplier,
      action: "sell",
      shareFraction: trendPct >= SYNDICATION_STRONG_RISE_PCT ? 0.1 : 0.05,
    };
  }
  if (trendPct <= -SYNDICATION_TREND_THRESHOLD_PCT) {
    return { trendPct, priceMultiplier, action: "buy", shareFraction: 0.05 };
  }
  return { trendPct, priceMultiplier, action: "hold", shareFraction: 0 };
}
