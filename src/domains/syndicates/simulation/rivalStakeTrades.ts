/**
 * rivalStakeTrades.ts — Buying and selling player stakes in rival racehorses.
 *
 * Returns state patches (immutable) so the store can apply them in one set().
 * Cash moves between the player and the owning rival stable, and each trade
 * is recorded in the player's transaction ledger.
 */

import type { GameState, Horse } from "@/platform/game/types";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";
import { ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import { createTransaction } from "@/domains/transactions/model/transactionTypes";
import {
  MIN_RIVAL_STAKE_PERCENT,
  remainingStakeCapacity,
  rivalStakeEligibility,
  stakeBuyPricePerPercent,
  stakeSellPricePerPercent,
  type RivalStake,
} from "@/domains/syndicates/model/rivalStakes";

export type StakeTradeResult =
  { ok: true; patch: Partial<GameState>; amount: number } | { ok: false; reason: string };

type TradeState = Pick<
  GameState,
  "day" | "cash" | "horses" | "npcStables" | "rivalStakes" | "transactions" | "log"
>;

/**
 * Current market value used for every stake price. Rival horses can hold
 * unrevealed stats until first inspected; they resolve deterministically, so
 * the page and the trade always agree on the price.
 * @param horse
 * @param allHorses
 */
export function rivalStakeHorseValue(horse: Horse, allHorses: Horse[]): number {
  return horseMarketValue(ensurePhenotypeResolved(horse), allHorses);
}

function stableName(state: TradeState, stableId: string): string {
  return state.npcStables.find((s) => s.id === stableId)?.name ?? "Rival stable";
}

export function buyRivalStake(
  state: TradeState,
  horseId: string,
  percent: number,
): StakeTradeResult {
  const horse = state.horses[horseId as keyof typeof state.horses] as Horse | undefined;
  if (!horse) return { ok: false, reason: "Horse not found" };
  const eligible = rivalStakeEligibility(horse);
  if (!eligible.ok) return eligible;
  const pct = Math.floor(percent);
  if (pct < MIN_RIVAL_STAKE_PERCENT) return { ok: false, reason: "Choose at least 1%" };

  const existing = state.rivalStakes?.[horseId];
  const ownerId = horse.ownership?.type === "npc" ? String(horse.ownership.stableId) : "";
  // A horse that changed hands since the stake was bought starts a fresh owner relationship.
  const capacity = remainingStakeCapacity(existing?.percent ?? 0);
  if (pct > capacity) {
    return {
      ok: false,
      reason:
        capacity === 0
          ? "The owner won't sell any more — they keep a majority"
          : `The owner will only sell ${capacity}% more`,
    };
  }

  const value = rivalStakeHorseValue(horse, Object.values(state.horses));
  const cost = stakeBuyPricePerPercent(value) * pct;
  if (state.cash < cost) return { ok: false, reason: "Not enough cash" };

  const stake: RivalStake = existing
    ? { ...existing, percent: existing.percent + pct, costBasis: existing.costBasis + cost }
    : {
        horseId,
        horseName: horse.name,
        stableId: ownerId,
        percent: pct,
        costBasis: cost,
        boughtDay: state.day,
        prizeEarned: 0,
        reputationEarned: 0,
        saleProceeds: 0,
        payouts: [],
      };

  const description = `Bought ${pct}% stake in ${horse.name} from ${stableName(state, ownerId)}`;
  return {
    ok: true,
    amount: cost,
    patch: {
      cash: state.cash - cost,
      npcStables: state.npcStables.map((s) =>
        s.id === ownerId ? { ...s, cash: s.cash + cost } : s,
      ),
      rivalStakes: { ...(state.rivalStakes ?? {}), [horseId]: stake },
      transactions: [
        ...(state.transactions ?? []),
        createTransaction(
          "expense",
          "stake_purchase",
          -cost,
          description,
          state.day,
          state.cash - cost,
          {
            horseId,
          },
        ),
      ],
      log: [{ day: state.day, text: description }, ...state.log].slice(0, 50),
    },
  };
}

export function sellRivalStake(
  state: TradeState,
  horseId: string,
  percent: number,
): StakeTradeResult {
  const existing = state.rivalStakes?.[horseId];
  if (!existing) return { ok: false, reason: "You hold no stake in this horse" };
  const pct = Math.floor(percent);
  if (pct < MIN_RIVAL_STAKE_PERCENT) return { ok: false, reason: "Choose at least 1%" };
  if (pct > existing.percent) return { ok: false, reason: `You only hold ${existing.percent}%` };

  const horse = state.horses[horseId as keyof typeof state.horses] as Horse | undefined;
  const alive = horse && horse.lifecycleStatus !== "deceased";
  const value = alive ? rivalStakeHorseValue(horse, Object.values(state.horses)) : 0;
  const proceeds = stakeSellPricePerPercent(value) * pct;
  // The current owner buys the stake back (may differ from the original seller).
  const buyerId =
    horse?.ownership?.type === "npc" ? String(horse.ownership.stableId) : existing.stableId;

  const remaining = existing.percent - pct;
  const nextStakes = { ...(state.rivalStakes ?? {}) };
  if (remaining <= 0) {
    delete nextStakes[horseId];
  } else {
    nextStakes[horseId] = {
      ...existing,
      percent: remaining,
      costBasis: Math.round((existing.costBasis * remaining) / existing.percent),
      saleProceeds: existing.saleProceeds + proceeds,
    };
  }

  const name = horse?.name ?? existing.horseName;
  const description = `Sold ${pct}% stake in ${name} to ${stableName(state, buyerId)}`;
  return {
    ok: true,
    amount: proceeds,
    patch: {
      cash: state.cash + proceeds,
      npcStables: state.npcStables.map((s) =>
        s.id === buyerId ? { ...s, cash: s.cash - proceeds } : s,
      ),
      rivalStakes: nextStakes,
      transactions: [
        ...(state.transactions ?? []),
        createTransaction(
          "income",
          "stake_sale",
          proceeds,
          description,
          state.day,
          state.cash + proceeds,
          {
            horseId,
          },
        ),
      ],
      log: [{ day: state.day, text: description }, ...state.log].slice(0, 50),
    },
  };
}
