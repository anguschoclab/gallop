/**
 * rivalStakes.ts — Player stakes in rival (NPC-owned) racehorses.
 *
 * The player buys a percentage of a rival stable's racehorse. The rival stays
 * the owner and keeps control (the player can never hold a majority), but
 * every prize the horse earns is split by stake, and the player's reputation
 * (prestige) rises with the horse's wins in proportion to the stake held.
 *
 * Pure rules only — no state access. Prices are expressed per 1% of the horse.
 */

/** Rivals always keep control of their horse. */
export const MAX_RIVAL_STAKE_PERCENT = 49;
/** Smallest stake the player can buy or sell. */
export const MIN_RIVAL_STAKE_PERCENT = 1;
/** Owners charge a premium over market value to sell part of a horse. */
export const STAKE_BUY_PREMIUM = 1.15;
/** Owners buy stakes back at a discount to market value. */
export const STAKE_SELL_DISCOUNT = 0.9;
/** Graded 2nd/3rd places earn this fraction of a win's stake prestige. */
export const STAKE_PLACE_PRESTIGE_FACTOR = 0.3;
/** Payout rows kept per stake. */
export const MAX_STAKE_PAYOUTS = 30;

export interface RivalStakePayout {
  day: number;
  raceId: string;
  raceName: string;
  position: number;
  /** Full prize the horse earned. */
  prize: number;
  /** The player's share of that prize. */
  share: number;
  /** Reputation the player gained from the result. */
  reputation: number;
}

export interface RivalStake {
  horseId: string;
  horseName: string;
  /** Owning NPC stable id at purchase time. */
  stableId: string;
  /** Percentage of the horse the player owns (1-49). */
  percent: number;
  /** Total cash the player has paid for the stake (reduced pro-rata on sales). */
  costBasis: number;
  boughtDay: number;
  /** Lifetime prize money the player has received from this horse. */
  prizeEarned: number;
  /** Lifetime reputation the player has gained from this horse. */
  reputationEarned: number;
  /** Cash received from selling parts of the stake back. */
  saleProceeds: number;
  payouts: RivalStakePayout[];
}

/**
 * Price the owner asks for each 1% of the horse.
 * @param marketValue
 */
export function stakeBuyPricePerPercent(marketValue: number): number {
  return Math.max(100, Math.round((Math.max(0, marketValue) * STAKE_BUY_PREMIUM) / 100));
}

/**
 * Price the owner pays to buy back each 1% of the horse.
 * @param marketValue
 */
export function stakeSellPricePerPercent(marketValue: number): number {
  return Math.max(0, Math.round((Math.max(0, marketValue) * STAKE_SELL_DISCOUNT) / 100));
}

/**
 * The player's share of the horse's current market value.
 * @param percent
 * @param marketValue
 */
export function stakeMarketValue(percent: number, marketValue: number): number {
  return Math.round((Math.max(0, marketValue) * percent) / 100);
}

/**
 * How much more of the horse the player may buy.
 * @param currentPercent
 */
export function remainingStakeCapacity(currentPercent: number): number {
  return Math.max(0, MAX_RIVAL_STAKE_PERCENT - currentPercent);
}

/**
 * Split a prize between the player (by stake) and the owning stable.
 * @param prize
 * @param percent
 */
export function splitStakePrize(
  prize: number,
  percent: number,
): { playerShare: number; ownerShare: number } {
  if (prize <= 0 || percent <= 0) return { playerShare: 0, ownerShare: Math.max(0, prize) };
  const playerShare = Math.round((prize * Math.min(percent, MAX_RIVAL_STAKE_PERCENT)) / 100);
  return { playerShare, ownerShare: prize - playerShare };
}

/**
 * Reputation the player earns from a staked horse's result.
 * Wins earn the stake's fraction of the full win reputation (at least 1);
 * graded 2nd/3rd places earn a smaller fraction; other results earn nothing.
 * @param winReputation
 * @param percent
 * @param position
 * @param graded
 */
export function stakeResultReputation(
  winReputation: number,
  percent: number,
  position: number,
  graded: boolean,
): number {
  if (winReputation <= 0 || percent <= 0) return 0;
  const fraction = Math.min(percent, MAX_RIVAL_STAKE_PERCENT) / 100;
  if (position === 1) return Math.max(1, Math.round(winReputation * fraction));
  if (graded && (position === 2 || position === 3)) {
    return Math.round(winReputation * fraction * STAKE_PLACE_PRESTIGE_FACTOR);
  }
  return 0;
}

export type StakeEligibility = { ok: true } | { ok: false; reason: string };

export interface StakeEligibilityHorse {
  age: number;
  ownership?: { type: string } | null;
  lifecycleStatus?: string;
  racingViable?: boolean;
  stud?: { atStud?: boolean } | null;
}

/** Oldest age a rival will still sell a racing stake in. */
export const MAX_STAKE_HORSE_AGE = 12;

/**
 * Whether a rival will sell part of this horse.
 * @param horse
 */
export function rivalStakeEligibility(horse: StakeEligibilityHorse): StakeEligibility {
  if (horse.ownership?.type !== "npc") return { ok: false, reason: "Only rival stables' horses" };
  if (horse.lifecycleStatus === "deceased") return { ok: false, reason: "Horse has died" };
  if (horse.lifecycleStatus === "retired" || horse.racingViable === false) {
    return { ok: false, reason: "Retired from racing" };
  }
  if (horse.stud?.atStud) return { ok: false, reason: "Standing at stud" };
  if (horse.age < 2) return { ok: false, reason: "Too young to race" };
  if (horse.age > MAX_STAKE_HORSE_AGE) return { ok: false, reason: "Past racing age" };
  return { ok: true };
}
