/**
 * portfolio.ts - League-wide stable portfolio derivation
 *
 * Builds a comparable holdings snapshot for the player's stable and every NPC
 * stable: liquid cash, horse inventory and valuation, syndicate stakes, and
 * prestige (manager/stable reputation on the shared 0-100 prestige scale).
 *
 * Pure derivation only - no state mutation.
 *
 * Dependencies: @/core/horse/pricing, @/core/horse/ownership, @/core/prestige
 * Related files: src/routes/portfolio.tsx, src/components/portfolio/*
 */

import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";
import type { Syndicate } from "@/core/breeding/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { isPlayerOwned } from "@/core/horse/ownership";
import { getPrestigeTier, type PrestigeTier } from "@/core/prestige/prestigeTypes";

/** Keys that historically identified the player inside syndicate shareholder maps. */
const PLAYER_SYNDICATE_KEYS = ["player", "__player__"];

export type StablePortfolio = {
  /** Stable id, or "player" for the player's own stable. */
  id: string;
  name: string;
  owner: string;
  isPlayer: boolean;
  tier: Stable["tier"] | "player";
  personality: Stable["personality"] | "player";
  country?: string;
  /** Liquid cash on hand. */
  cash: number;
  /** Live (non-deceased) horses owned. */
  horseCount: number;
  activeHorses: number;
  retiredHorses: number;
  broodmares: number;
  stallions: number;
  youngstock: number;
  /** Sum of market valuations for owned horses. */
  horseValue: number;
  /** Most valuable single holding. */
  topHorseName?: string;
  topHorseValue: number;
  /** Number of syndicates this stable holds shares in. */
  syndicateCount: number;
  syndicateShares: number;
  /** Cash value of all syndicate shares held. */
  syndicateValue: number;
  /** Share of total syndicated share capital, 0-100. */
  syndicateSharePct: number;
  /** 0-100 prestige score. */
  prestige: number;
  prestigeTier: PrestigeTier;
  lifetimeEarnings: number;
  careerWins: number;
  /** cash + horseValue + syndicateValue. */
  netWorth: number;
};

type BuildArgs = {
  playerName: string;
  playerOwnerName: string;
  playerCash: number;
  playerPrestige: number;
  playerCountry?: string;
  horses: Horse[];
  npcStables: Stable[];
  syndicates: Record<string, Syndicate>;
};

type Bucket = {
  horses: Horse[];
  value: number;
  top?: { name: string; value: number };
};

function emptyBucket(): Bucket {
  return { horses: [], value: 0 };
}

function classify(bucket: Bucket) {
  let activeHorses = 0;
  let retiredHorses = 0;
  let broodmares = 0;
  let stallions = 0;
  let youngstock = 0;
  let lifetimeEarnings = 0;
  let careerWins = 0;

  for (const h of bucket.horses) {
    if (h.lifecycleStatus === "retired") retiredHorses += 1;
    else activeHorses += 1;
    if (h.age < 2) youngstock += 1;
    if (h.gender === "mare" || h.gender === "filly") {
      if (h.age >= 3) broodmares += 1;
    } else if (h.stud) {
      stallions += 1;
    }
    lifetimeEarnings += h.lifetimeEarnings ?? 0;
    careerWins += h.careerWins ?? 0;
  }

  return { activeHorses, retiredHorses, broodmares, stallions, youngstock, lifetimeEarnings, careerWins };
}

/**
 * Build a portfolio row for the player and each NPC stable.
 *
 * @param args - World slices needed for the derivation
 * @returns One portfolio row per stable, player first
 */
export function buildStablePortfolios(args: BuildArgs): StablePortfolio[] {
  const { horses, npcStables, syndicates } = args;

  const live = horses.filter((h) => h.lifecycleStatus !== "deceased");
  const allForPedigree = horses;

  const buckets = new Map<string, Bucket>();
  buckets.set("player", emptyBucket());
  for (const s of npcStables) buckets.set(s.id, emptyBucket());

  for (const raw of live) {
    const key = isPlayerOwned(raw)
      ? "player"
      : raw.ownership.type === "npc"
        ? (raw.ownership.stableId as string)
        : null;
    if (!key) continue;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    // NPC horses carry a deferred phenotype; resolve so valuations are real.
    const h = ensurePhenotypeResolved(raw);
    const value = horseMarketValue(h, allForPedigree);
    bucket.horses.push(h);

    bucket.value += value;
    if (!bucket.top || value > bucket.top.value) bucket.top = { name: h.name, value };
  }

  // Syndicate stakes
  const syndicateList = Object.values(syndicates ?? {});
  let totalShareCapital = 0;
  const stakes = new Map<string, { count: number; shares: number; value: number }>();
  for (const syn of syndicateList) {
    totalShareCapital += syn.totalShares;
    for (const [holder, shares] of Object.entries(syn.shareHolders ?? {})) {
      if (!shares) continue;
      const key = PLAYER_SYNDICATE_KEYS.includes(holder) ? "player" : holder;
      const prev = stakes.get(key) ?? { count: 0, shares: 0, value: 0 };
      prev.count += 1;
      prev.shares += shares;
      prev.value += shares * (syn.sharePrice || 0);
      stakes.set(key, prev);
    }
  }

  const rows: StablePortfolio[] = [];

  const makeRow = (
    id: string,
    name: string,
    owner: string,
    cash: number,
    prestige: number,
    isPlayer: boolean,
    tier: StablePortfolio["tier"],
    personality: StablePortfolio["personality"],
    country?: string,
  ): StablePortfolio => {
    const bucket = buckets.get(id) ?? emptyBucket();
    const counts = classify(bucket);
    const stake = stakes.get(id) ?? { count: 0, shares: 0, value: 0 };
    const clampedPrestige = Math.max(0, Math.min(100, Math.round(prestige)));
    return {
      id,
      name,
      owner,
      isPlayer,
      tier,
      personality,
      country,
      cash: Math.round(cash),
      horseCount: bucket.horses.length,
      ...counts,
      horseValue: Math.round(bucket.value),
      topHorseName: bucket.top?.name,
      topHorseValue: Math.round(bucket.top?.value ?? 0),
      syndicateCount: stake.count,
      syndicateShares: stake.shares,
      syndicateValue: Math.round(stake.value),
      syndicateSharePct: totalShareCapital > 0 ? (stake.shares / totalShareCapital) * 100 : 0,
      prestige: clampedPrestige,
      prestigeTier: getPrestigeTier(clampedPrestige),
      netWorth: Math.round(cash + bucket.value + stake.value),
    };
  };

  rows.push(
    makeRow(
      "player",
      args.playerName,
      args.playerOwnerName,
      args.playerCash,
      args.playerPrestige,
      true,
      "player",
      "player",
      args.playerCountry,
    ),
  );

  for (const s of npcStables) {
    rows.push(
      makeRow(s.id, s.name, s.owner, s.cash, s.reputation ?? 0, false, s.tier, s.personality, s.country),
    );
  }

  return rows;
}

export type PortfolioSortKey =
  | "name"
  | "netWorth"
  | "cash"
  | "horseCount"
  | "horseValue"
  | "syndicateValue"
  | "prestige"
  | "lifetimeEarnings";

/**
 * Sort portfolio rows.
 *
 * @param rows - Rows to sort (not mutated)
 * @param key - Column to sort by
 * @param dir - Sort direction
 */
export function sortPortfolios(
  rows: StablePortfolio[],
  key: PortfolioSortKey,
  dir: "asc" | "desc",
): StablePortfolio[] {
  const sorted = [...rows].sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name);
    return (a[key] as number) - (b[key] as number);
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

/** Aggregate totals across the whole league for context rows. */
export function portfolioTotals(rows: StablePortfolio[]) {
  return rows.reduce(
    (acc, r) => ({
      cash: acc.cash + r.cash,
      horseCount: acc.horseCount + r.horseCount,
      horseValue: acc.horseValue + r.horseValue,
      syndicateValue: acc.syndicateValue + r.syndicateValue,
      netWorth: acc.netWorth + r.netWorth,
    }),
    { cash: 0, horseCount: 0, horseValue: 0, syndicateValue: 0, netWorth: 0 },
  );
}
