/**
 * commerceReputation.ts - Reputation earned (and lost) in the bloodstock market
 *
 * A manager's standing is not only built on the track: what you buy, what you
 * sell, and how much of a stallion syndicate you are willing to underwrite all
 * shape how other stables read you. This module holds the pure arithmetic for
 * those commerce-driven reputation events.
 *
 * Rules of thumb:
 *  - Committing real money to quality stock earns respect.
 *  - Selling well (at or above fair value) earns respect; dumping stock cheaply
 *    costs it.
 *  - Flipping a horse you only just bought marks you as a trader, not a
 *    horseman, and costs reputation.
 *  - Underwriting a large share of a syndicate is the loudest signal of all.
 *
 * Pure logic only - no store access, no mutation of inputs.
 *
 * Dependencies: ./reputationTypes
 * Related files: src/game/store/helpers/reputation.ts,
 *   src/game/store/slices/exchangeSlice.ts
 */

import { createReputationEvent, type ReputationEvent } from "./reputationTypes";

/** A horse sold again within this many days counts as a flip. */
export const CHURN_WINDOW_DAYS = 30;

/** Money scale at which a single transaction reads as a statement of intent. */
const HEADLINE_PRICE = 250_000;

/**
 * Scale a cash amount into 0..1 "how much does the industry notice this".
 *
 * @param amount - Cash amount in dollars
 * @returns Normalised weight between 0 and 1
 */
export function priceWeight(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(1, Math.sqrt(amount / HEADLINE_PRICE));
}

/** Minimal shape of a completed trade needed to detect flipping. */
export type TradeRecordLike = {
  horseId: string;
  buyerId: string;
  sellerId: string;
  day: number;
};

/**
 * Days since the player acquired a horse, based on completed trade history.
 *
 * @param trades - Completed market trades, any order
 * @param horseId - Horse being sold
 * @param day - Current game day
 * @param playerId - Identifier used for the player in trade records
 * @returns Days since the most recent player purchase, or undefined if the
 *   player never bought this horse on the market (e.g. bred it themselves)
 */
export function daysSincePlayerAcquired(
  trades: readonly TradeRecordLike[],
  horseId: string,
  day: number,
  playerId = "player",
): number | undefined {
  let latest: number | undefined;
  for (const trade of trades) {
    if (trade.horseId !== horseId || trade.buyerId !== playerId) continue;
    if (latest === undefined || trade.day > latest) latest = trade.day;
  }
  return latest === undefined ? undefined : Math.max(0, day - latest);
}

export type MarketTradeReputationArgs = {
  /** Which side of the trade the player was on */
  role: "buyer" | "seller";
  /** Price the horse changed hands at */
  price: number;
  /** Reference market valuation of the horse */
  fairValue: number;
  /** Horse name for the event description */
  horseName: string;
  /** Horse id, recorded on the event */
  horseId?: string;
  /** Counterparty name (stable or auction house) */
  counterpartyName: string;
  /** Current game day */
  day: number;
  /**
   * Days the player has owned the horse, when selling. Sales inside
   * CHURN_WINDOW_DAYS are treated as flips.
   */
  daysOwned?: number;
};

/**
 * Reputation event for a completed horse purchase or sale.
 *
 * @param args - Trade context
 * @returns A reputation event, or null when the trade is too small to register
 */
export function marketTradeReputation(args: MarketTradeReputationArgs): ReputationEvent | null {
  const { role, price, fairValue, horseName, horseId, counterpartyName, day, daysOwned } = args;
  const weight = priceWeight(price);
  if (weight <= 0) return null;

  const ratio = fairValue > 0 ? price / fairValue : 1;

  if (role === "buyer") {
    // Buying quality earns respect; paying over the odds earns a little more
    // attention still (the industry remembers who is spending).
    let amount = Math.round(weight * 6);
    if (ratio >= 1.15) amount += 2;
    if (amount <= 0) return null;
    return createReputationEvent(
      "market_purchase",
      amount,
      `Bought ${horseName} from ${counterpartyName} for $${Math.round(price).toLocaleString()}.`,
      day,
      { horseId },
    );
  }

  const isFlip = daysOwned !== undefined && daysOwned < CHURN_WINDOW_DAYS;
  if (isFlip) {
    const amount = -Math.min(10, 3 + Math.round(weight * 7));
    return createReputationEvent(
      "trade_churn",
      amount,
      `Flipped ${horseName} to ${counterpartyName} after only ${daysOwned} day${daysOwned === 1 ? "" : "s"} in your care.`,
      day,
      { horseId },
    );
  }

  // Selling well is a mark of a good judge of a horse; dumping cheap is not.
  let amount = Math.round(weight * 5);
  if (ratio >= 1.1) amount += 2;
  else if (ratio <= 0.7) amount = -Math.min(8, 2 + Math.round(weight * 5));
  if (amount === 0) return null;

  return createReputationEvent(
    "market_sale",
    amount,
    amount > 0
      ? `Sold ${horseName} to ${counterpartyName} for $${Math.round(price).toLocaleString()}.`
      : `Let ${horseName} go to ${counterpartyName} well below value ($${Math.round(price).toLocaleString()}).`,
    day,
    { horseId },
  );
}

export type SyndicationReputationArgs = {
  /** Whether the player took shares on or sold them down */
  direction: "buy" | "sell";
  /** Number of shares traded */
  shares: number;
  /** Total shares in the syndicate */
  totalShares: number;
  /** Price paid or received per share */
  pricePerShare: number;
  /** Stallion / syndicate name for the description */
  syndicateName: string;
  /** Current game day */
  day: number;
};

/**
 * Reputation event for taking on or selling down a syndicate stake.
 *
 * @param args - Syndication context
 * @returns A reputation event, or null when the stake is negligible
 */
export function syndicationStakeReputation(
  args: SyndicationReputationArgs,
): ReputationEvent | null {
  const { direction, shares, totalShares, pricePerShare, syndicateName, day } = args;
  if (shares <= 0 || totalShares <= 0) return null;

  const stakeFraction = Math.min(1, shares / totalShares);
  const cash = shares * pricePerShare;
  const magnitude = Math.round(stakeFraction * 10 + priceWeight(cash) * 6);
  if (magnitude <= 0) return null;

  if (direction === "buy") {
    return createReputationEvent(
      "syndication_stake",
      Math.min(16, magnitude),
      `Underwrote ${Math.round(stakeFraction * 100)}% of the ${syndicateName} syndicate ($${Math.round(cash).toLocaleString()}).`,
      day,
    );
  }

  // Selling down a stake reads as a loss of faith, but costs less than it earned.
  return createReputationEvent(
    "syndication_exit",
    -Math.min(10, Math.round(magnitude * 0.6)),
    `Sold down ${Math.round(stakeFraction * 100)}% of the ${syndicateName} syndicate.`,
    day,
  );
}
