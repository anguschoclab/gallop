import { isFemaleHorse } from "@/domains/horse/simulation/gender";
import type { Horse, Stable, AuctionSaleKind } from "@/platform/game/types";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";
import { PERSONALITY_CONFIG } from "@/domains/stable/simulation/stableConfig";
import {
  AUCTION_AGGRESSIVE_PREMIUM,
  AUCTION_2YO_TRAINING_PREMIUM,
  AUCTION_CONSERVATIVE_DISCOUNT,
  AUCTION_YEARLING_PREMIUM,
  AUCTION_WEANLING_PREMIUM,
  AUCTION_RACING_AGE_DISCOUNT,
  AUCTION_WEANLING_DISCOUNT,
  AUCTION_BROODMARE_DISCOUNT,
  AUCTION_FILLY_PREMIUM,
  AUCTION_BROODMARE_PREMIUM,
  AUCTION_RACING_AGE_PREMIUM,
} from "@/domains/auction/model/auctionConstants";
import {
  FAN_VALUATION_DIVISOR,
  FAN_AUCTION_RACING_AGE_THRESHOLD,
} from "@/domains/prestige/model/fameConstants";

export interface ValuationContext {
  horse: Horse;
  stable: Stable;
  saleKind: AuctionSaleKind;
  base: number;
  isYearling: boolean;
  isWeanling: boolean;
  isFilly: boolean;
  is2yoTraining: boolean;
  isBroodmare: boolean;
  isRacingAge: boolean;
}

function aggressiveValuation(ctx: ValuationContext): number {
  let mod = 1.0 + AUCTION_AGGRESSIVE_PREMIUM;
  if (ctx.is2yoTraining) mod *= 1.0 + AUCTION_2YO_TRAINING_PREMIUM;
  return mod;
}

function conservativeValuation(ctx: ValuationContext): number {
  return 1.0 - AUCTION_CONSERVATIVE_DISCOUNT;
}

function developerValuation(ctx: ValuationContext): number {
  let mod = ctx.isYearling
    ? 1.0 + AUCTION_YEARLING_PREMIUM
    : ctx.isWeanling
      ? 1.0 + AUCTION_WEANLING_PREMIUM
      : 1.0 - AUCTION_RACING_AGE_DISCOUNT;
  if (ctx.is2yoTraining) mod *= 0.9;
  if (ctx.isBroodmare) mod *= 1.1;
  return mod;
}

function winNowValuation(ctx: ValuationContext): number {
  let mod = ctx.isWeanling ? 1.0 - AUCTION_WEANLING_DISCOUNT : ctx.isYearling ? 0.9 : 1.0;
  if (ctx.is2yoTraining) mod *= 1.0 + AUCTION_2YO_TRAINING_PREMIUM;
  if (ctx.isBroodmare) mod *= 1.0 - AUCTION_BROODMARE_DISCOUNT;
  if (ctx.isRacingAge) mod *= 1.0 + AUCTION_RACING_AGE_PREMIUM;
  return mod;
}

function specialistValuation(ctx: ValuationContext): number {
  const stableDist = ctx.stable.preferredDistance ?? 1600;
  const horseDist = ctx.horse.distanceAptitude ?? 1600;
  const distanceMatch = Math.abs(horseDist - stableDist) < 400;
  return distanceMatch ? 1.5 : 0.5;
}

function isStudStallion(horse: Horse): boolean {
  return !isFemaleHorse(horse.gender) && !!horse.stud?.atStud && horse.stud.standingFee > 0;
}

function breederValuation(ctx: ValuationContext): number {
  // A stallion already earning stud fees is exactly what a breeder wants.
  if (isStudStallion(ctx.horse)) return 1.1;
  let mod = ctx.isFilly ? 1.0 + AUCTION_FILLY_PREMIUM : 0.7;
  if (ctx.horse.damName && ctx.horse.blueHenStatus?.isBlueHen) mod *= 1.2;
  if (ctx.isBroodmare) mod *= 1.0 + AUCTION_BROODMARE_PREMIUM;
  return mod;
}

function traderValuation(ctx: ValuationContext): number {
  return 0.85;
}

function prestigeValuation(ctx: ValuationContext): number {
  let mod = 1.2 + ctx.horse.fame / 200;
  if (ctx.base < 5000) mod = 0;
  if (ctx.isRacingAge) mod *= 1.0 + AUCTION_RACING_AGE_PREMIUM;
  const fanCount = ctx.horse.fanCount ?? 0;
  if (fanCount > FAN_AUCTION_RACING_AGE_THRESHOLD) {
    mod *= 1.0 + fanCount / FAN_VALUATION_DIVISOR;
  }
  return mod;
}

const VALUATION_STRATEGIES: Record<Stable["personality"], (ctx: ValuationContext) => number> = {
  aggressive: aggressiveValuation,
  conservative: conservativeValuation,
  developer: developerValuation,
  "win-now": winNowValuation,
  specialist: specialistValuation,
  breeder: breederValuation,
  trader: traderValuation,
  prestige: prestigeValuation,
};

/** Richer stables pay a little over the auction-house price for the same horse. */
export const NPC_TIER_PREMIUM: Record<Stable["tier"], number> = {
  low: 1.0,
  mid: 1.1,
  elite: 1.25,
};

/**
 * What any rival stable starts from before its personality: the auction-house
 * market value (stats, pedigree, recent form, prize earnings and — for
 * stallions at stud — capitalised stud fees), scaled by the stable's tier.
 */
export function npcBaseValuation(
  horse: Horse,
  stable: Pick<Stable, "tier">,
  allHorses?: readonly Horse[],
  horseMap?: Map<string, Horse>,
): number {
  const market = horseMarketValue(horse, allHorses ?? [], horseMap);
  return Math.round(market * (NPC_TIER_PREMIUM[stable.tier] ?? 1));
}

export function calculateLotValuation(
  horse: Horse,
  stable: Stable,
  saleKind: AuctionSaleKind,
  allHorses?: readonly Horse[],
  horseMap?: Map<string, Horse>,
): number {
  const base = npcBaseValuation(horse, stable, allHorses, horseMap);

  const p = stable.personality;
  const cfg = PERSONALITY_CONFIG[p];
  const isYearling = saleKind === "yearling" || saleKind === "yearling_south";
  const isWeanling = saleKind === "weanling" || saleKind === "weanling_south";
  const isFilly = isFemaleHorse(horse.gender);
  const is2yoTraining = saleKind === "2yo_training";
  const isBroodmare = saleKind === "broodmare";
  const isRacingAge = saleKind === "racing_age";

  const ctx: ValuationContext = {
    horse,
    stable,
    saleKind,
    base,
    isYearling,
    isWeanling,
    isFilly,
    is2yoTraining,
    isBroodmare,
    isRacingAge,
  };

  const strategy = VALUATION_STRATEGIES[p] || (() => 1.0);
  let mod = strategy(ctx);

  const conformationVal = horse.stats?.conformation ?? horse.conformation ?? 50;
  const temperamentVal = horse.stats?.temperament ?? horse.temperament ?? 50;
  if (conformationVal >= 90) mod *= 1.1;
  if (temperamentVal >= 90) mod *= 1.05;

  if ((isYearling || isWeanling) && cfg.youthPreference > 0.5) {
    mod *= 1 + (cfg.youthPreference - 0.5) * 0.3;
  }

  if (isBroodmare && horse.blueHenStatus?.isBlueHen) {
    mod *= 1.3;
  }

  if (isRacingAge && horse.fame > 30) {
    mod *= 1.0 + horse.fame / 200;
  }

  return Math.max(0, Math.round(base * mod));
}
