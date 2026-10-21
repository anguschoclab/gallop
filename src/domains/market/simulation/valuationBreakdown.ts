/**
 * valuationBreakdown.ts — Explain a horse's auction-house value.
 *
 * Breaks horseMarketValue() into the factors that drive it (stats, age,
 * potential, build/soundness, fan base, pedigree, recent results, breeding
 * upside), explains recent price movement (wins, reputation, everything else)
 * and lists what each rival stable would bid. Pure — reads only its inputs.
 */

import type { AuctionSaleKind, Horse, Stable } from "@/platform/game/types";
import type { AuctionHouse } from "@/domains/prestige/simulation";
import {
  estimateBreedingValue,
  horseMarketValue,
  horsePedigreeMultiplier,
  horsePriceFactors,
  marketValueBlend,
  type MarketValueBlend,
} from "@/domains/horse/simulation/pricing";
import { raceFormPremium } from "@/domains/market/simulation/raceForm";
import { npcWalkAwayPrice, type NpcWalkAwayPrice } from "@/domains/auction/simulation/engine";
import type { RankingsSnapshot } from "@/domains/market/simulation/rankingsHistory";

export interface ValueFactor {
  key: "stats" | "age" | "potential" | "build" | "fans" | "pedigree" | "form";
  label: string;
  /** Plain-language reading of the input, e.g. "Rating 78" or "3 recent wins". */
  detail: string;
  /** Multiplier applied (stats is the base, so null). */
  multiplier: number | null;
  /** Running racing value after this factor. */
  valueAfter: number;
}

export interface HorseValueBreakdown {
  factors: ValueFactor[];
  racingValue: number;
  breedingValue: number;
  /** Where the breeding value comes from. */
  breedingDetail: string;
  blend: MarketValueBlend;
  marketValue: number;
  /** Best speed figure on record (not part of the price formula). */
  bestSpeedFigure: number | null;
  wins: number;
  starts: number;
  fame: number;
  fans: number;
}

function winsIn(h: Horse): number {
  return (h.raceHistory ?? []).filter((r) => r.position === 1).length;
}

function breedingDetail(h: Horse): string {
  if (h.gender === "gelding" || h.gelded) return "geldings have no breeding value";
  if (h.stud?.atStud && h.stud.standingFee > 0) {
    return `at stud: $${h.stud.standingFee.toLocaleString()} fee × ${h.stud.bookSize || 100} mares a year`;
  }
  return `projected from stats, pedigree and fame ${Math.round(h.fame ?? 0)}`;
}

export function explainHorseValue(horse: Horse, allHorses: Horse[]): HorseValueBreakdown {
  const f = horsePriceFactors(horse);
  const ped = horsePedigreeMultiplier(horse, allHorses);
  const form = raceFormPremium(horse);
  const history = horse.raceHistory ?? [];
  const figures = history.map((r) => r.beyer).filter((b): b is number => typeof b === "number");
  const graded = history.filter((r) => r.position === 1 && r.grade).length;

  let running = f.overall * 80;
  const factors: ValueFactor[] = [
    {
      key: "stats",
      label: "Stats",
      detail: `Overall rating ${Math.round(f.overall)} (speed, stamina, acceleration, consistency)`,
      multiplier: null,
      valueAfter: Math.round(running),
    },
  ];
  const push = (key: ValueFactor["key"], label: string, detail: string, m: number) => {
    running *= m;
    factors.push({ key, label, detail, multiplier: m, valueAfter: Math.round(running) });
  };
  push("age", "Age", `${horse.age} years old`, f.ageMod);
  push("potential", "Potential", `Potential ${Math.round(horse.potential ?? 0)}`, f.potMod);
  push("build", "Build & soundness", "Conformation, temperament and injury risk", f.bioMod);
  push("fans", "Fan base", `${(horse.fanCount ?? 0).toLocaleString()} fans`, f.fanMod);
  push("pedigree", "Pedigree", "Quality of sire, dam and family", ped);
  push(
    "form",
    "Recent results",
    history.length === 0
      ? "No starts yet"
      : `${winsIn(horse)} wins${graded ? ` (${graded} graded)` : ""} from ${history.length} starts, recent ones count most`,
    form,
  );

  return {
    factors,
    racingValue: Math.round(running),
    breedingValue: estimateBreedingValue(horse, allHorses),
    breedingDetail: breedingDetail(horse),
    blend: marketValueBlend(horse),
    marketValue: horseMarketValue(horse, allHorses),
    bestSpeedFigure: figures.length ? Math.max(...figures) : null,
    wins: winsIn(horse),
    starts: history.length,
    fame: Math.round(horse.fame ?? 0),
    fans: horse.fanCount ?? 0,
  };
}

export interface PriceMovement {
  windowDays: number;
  /** Price at the start of the window (from rankings history), if known. */
  priceThen: number | null;
  priceNow: number;
  /** priceNow − priceThen (null when no history). */
  change: number | null;
  /** Value added by results inside the window. */
  fromResults: number;
  winsInWindow: number;
  /** Value added by fame gained inside the window. */
  fromReputation: number;
  fameThen: number | null;
  fameNow: number;
  /** Whatever is left: age, training, condition, pedigree news. */
  fromOther: number | null;
  rankThen: number | null;
  rankNow: number | null;
}

/**
 * Explain how a horse's price moved over the last `windowDays`.
 * Contributions are counterfactual: the value today minus the value today
 * without the window's results (or without the fame it gained).
 */
export function explainPriceMovement(
  horse: Horse,
  allHorses: Horse[],
  snapshots: RankingsSnapshot[] | undefined,
  day: number,
  windowDays = 30,
): PriceMovement {
  const windowStart = day - windowDays;
  // Snapshots taken before a price was recorded carry 0; ignore them.
  const rows = (snapshots ?? []).filter((s) => s.price > 0);
  const then =
    [...rows].reverse().find((s) => s.day <= windowStart) ?? rows.find((s) => s.day > windowStart);
  const latest = rows.at(-1);
  // When history starts inside the window, measure from that first record so
  // results already priced in on that day aren't counted twice.
  const since = then && then.day > windowStart ? then.day : windowStart;
  const priceNow = horseMarketValue(horse, allHorses);
  const history = horse.raceHistory ?? [];
  const inWindow = history.filter((r) => r.day > since);
  const withoutRecent = { ...horse, raceHistory: history.filter((r) => r.day <= since) } as Horse;
  const fromResults = priceNow - horseMarketValue(withoutRecent, allHorses);

  const fameNow = horse.fame ?? 0;
  const fameThen = then ? then.reputation : null;
  const fromReputation =
    fameThen !== null && fameThen !== fameNow
      ? priceNow - horseMarketValue({ ...horse, fame: fameThen } as Horse, allHorses)
      : 0;
  const priceThen = then ? then.price : null;
  const change = priceThen !== null ? priceNow - priceThen : null;

  return {
    windowDays: day - since,
    priceThen,
    priceNow,
    change,
    fromResults,
    winsInWindow: inWindow.filter((r) => r.position === 1).length,
    fromReputation,
    fameThen,
    fameNow,
    fromOther: change !== null ? change - fromResults - fromReputation : null,
    rankThen: then?.rank ?? null,
    rankNow: latest?.rank ?? null,
  };
}

/** Which sale ring a horse would be offered in. */
export function saleKindForHorse(horse: Horse): AuctionSaleKind {
  if (horse.age <= 0) return "weanling";
  if (horse.age === 1) return "yearling";
  if (horse.age === 2) return "2yo_training";
  const female = horse.gender === "mare" || horse.gender === "filly";
  if (female && (horse.lifecycleStatus === "retired" || horse.racingViable === false)) return "broodmare";
  return "racing_age";
}

export interface RivalBidder extends NpcWalkAwayPrice {
  stableId: string;
  stableName: string;
  personality: Stable["personality"];
}

/** Rival stables ranked by the most they would bid for this horse. */
export function rivalBidders(
  horse: Horse,
  stables: Stable[],
  allHorses: Horse[],
  house?: AuctionHouse,
  limit = 5,
): RivalBidder[] {
  const saleKind = saleKindForHorse(horse);
  const ownerId = horse.ownership?.type === "npc" ? String(horse.ownership.stableId) : null;
  return stables
    .filter((s) => String(s.id) !== ownerId)
    .map((s) => ({
      stableId: String(s.id),
      stableName: s.name,
      personality: s.personality,
      ...npcWalkAwayPrice(s, horse, saleKind, allHorses, undefined, house),
    }))
    .filter((b) => b.walkAway > 0)
    .sort((a, b) => b.walkAway - a.walkAway)
    .slice(0, limit);
}
