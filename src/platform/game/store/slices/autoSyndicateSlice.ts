/**
 * autoSyndicateSlice.ts - Automatic syndication of the player's top stallions
 *
 * When enabled, each committed day the player's highest-rated eligible stallions
 * are syndicated (G1 winners only, matching the manual rule) and existing
 * syndicates are topped up by soliciting investors until the player keeps a
 * controlling stake. Exchange listings are refreshed afterwards so the new
 * stakes show up in the book.
 *
 * Dependencies: @/core/horse/pricing (horseMarketValue), @/core/horse/ownership (isPlayerOwned)
 * Related files: src/game/store/slices/advanceDayActions.ts, src/routes/portfolio.tsx
 */

import type { Horse } from "@/platform/game/types";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";
import { syndicationTrend } from "@/domains/market/model/syndicationTrend";
import type { StoreSet, StoreGet, StoreType } from "@/platform/game/store/types";

/** Player keeps at least this share of a syndicate when auto-topping up. */
export const AUTO_SYNDICATE_MIN_CONTROL = 0.55;
/** Shares issued per new auto-created syndicate. */
export const AUTO_SYNDICATE_TOTAL_SHARES = 40;
/** Player never buys back above this share of a syndicate. */
export const AUTO_SYNDICATE_MAX_BUYBACK = 0.75;
/** Maximum syndicates opened automatically per day. */
export const AUTO_SYNDICATE_PER_DAY = 2;

export type AutoSyndicateSlice = {
  /** Turn daily automatic syndication on or off. */
  setAutoSyndicateEnabled: (enabled: boolean) => void;
  /** Run one pass of automatic syndication. Returns what it did. */
  runAutoSyndicate: () => {
    created: number;
    solicited: number;
    boughtBack: number;
    raised: number;
    trendPct: number;
  };
};

function g1Wins(horse: Horse): number {
  return horse.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length ?? 0;
}

function isEligibleStallion(horse: Horse): boolean {
  return (
    isPlayerOwned(horse) &&
    (horse.gender === "colt" || horse.gender === "horse") &&
    horse.lifecycleStatus !== "deceased" &&
    g1Wins(horse) > 0
  );
}

export function createAutoSyndicateSlice(set: StoreSet, get: StoreGet): AutoSyndicateSlice {
  return {
    setAutoSyndicateEnabled: (enabled) => set({ autoSyndicateEnabled: enabled }),

    runAutoSyndicate: () => {
      const store = get() as StoreType;
      const s = get();
      let created = 0;
      let solicited = 0;
      let boughtBack = 0;
      const trend = syndicationTrend(s.day);
      const cashBefore = s.cash;

      const horses = Object.values(s.horses) as Horse[];
      const eligible = horses
        .filter(isEligibleStallion)
        .sort((a, b) => horseMarketValue(b, horses) - horseMarketValue(a, horses));

      // 1. Open syndicates on the top-rated stallions that don't have one yet.
      for (const horse of eligible) {
        if (created >= AUTO_SYNDICATE_PER_DAY) break;
        if (get().syndicates?.[horse.id]) continue;
        const value = horseMarketValue(horse, horses);
        const sharePrice = Math.max(
          1000,
          Math.round((value / AUTO_SYNDICATE_TOTAL_SHARES) * trend.priceMultiplier),
        );
        const result = store.createSyndicate?.(horse.id, AUTO_SYNDICATE_TOTAL_SHARES, sharePrice, {
          player: AUTO_SYNDICATE_TOTAL_SHARES,
        });
        if (result?.ok) created += 1;
      }

      // 2. Follow the real-world trend: reprice shares, then sell spare shares
      //    into a rising market (keeping control) or buy back into a falling one.
      for (const syndicate of Object.values(get().syndicates ?? {})) {
        const total = syndicate.totalShares ?? 0;
        if (total <= 0) continue;
        const stallion = get().horses[syndicate.stallionId] as Horse | undefined;
        if (stallion) {
          const repriced = Math.max(
            1000,
            Math.round((horseMarketValue(stallion, horses) / total) * trend.priceMultiplier),
          );
          if (repriced !== syndicate.sharePrice) {
            set((state) => ({
              syndicates: {
                ...state.syndicates,
                [syndicate.id]: { ...state.syndicates[syndicate.id]!, sharePrice: repriced },
              },
            }));
          }
        }
        const current = get().syndicates?.[syndicate.id];
        if (!current) continue;
        const playerShares = current.shareHolders?.["player"] ?? 0;
        const step = Math.max(1, Math.round(total * trend.shareFraction));
        if (trend.action === "sell") {
          const spare = playerShares - Math.ceil(total * AUTO_SYNDICATE_MIN_CONTROL);
          if (spare <= 0) continue;
          const result = store.solicitInvestor?.(current.id, Math.min(spare, step));
          if (result?.ok) solicited += 1;
        } else if (trend.action === "buy") {
          const room = Math.floor(total * AUTO_SYNDICATE_MAX_BUYBACK) - playerShares;
          const shares = Math.min(room, step);
          if (shares <= 0 || get().cash < shares * current.sharePrice) continue;
          const result = store.purchaseShares?.(current.id, shares, current.sharePrice);
          if (result?.ok) boughtBack += 1;
        }
      }

      // Fresh stakes should be reflected in the exchange book immediately.
      if (created > 0 || solicited > 0 || boughtBack > 0) {
        try {
          store.refreshExchange?.();
        } catch {
          // Exchange refresh must never break syndication.
        }
      }

      return {
        created,
        solicited,
        boughtBack,
        raised: Math.max(0, get().cash - cashBefore),
        trendPct: trend.trendPct,
      };
    },
  };
}
