/**
 * exchangeSettlement.ts - Shared daily exchange settlement
 *
 * Single implementation of the once-per-day exchange tick used by BOTH the
 * store slice (`refreshExchange`, mounted-panel path) and the pipeline phase
 * (`exchangeSettlementPhase`, batch-advance path). Previously each caller kept
 * its own copy of this logic and they had already begun to drift.
 *
 * Per day it:
 *   1. Prunes expired orders — expired player bids refund their escrow.
 *   2. Regenerates the NPC book — player asks AND player bids survive.
 *   3. Crosses the book — NPC bids and the player's standing bids compete on
 *      price; a player fill transfers ownership to the player and pays the
 *      seller net proceeds (the player's side was escrowed at placement).
 *   4. Refunds losing player bids on horses that just traded to someone else.
 *
 * Pure logic only — no store access, no mutation of inputs.
 *
 * Dependencies: ./exchange, ./exchangeAI, @/core/horse/ownership
 * Related files: src/game/store/slices/exchangeSlice.ts,
 *   src/core/time/phases/exchangeSettlementPhase.ts
 */

import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";
import { makeNpcOwned, makePlayerOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import {
  exchangeCommission,
  generateNpcBook,
  pruneExchange,
  resolveNpcExchangeTrades,
  type ExchangeState,
} from "./exchange";

export const EXCHANGE_PLAYER_ID = "player";

export interface DailyExchangeSettlement {
  exchange: ExchangeState;
  horses: Record<string, Horse>;
  npcStables: Stable[];
  /**
   * Cash returned to the player this tick: escrow refunds for player bids
   * that expired or can no longer fill. Fills are NOT charged here — the
   * player paid escrow when the bid was placed.
   */
  playerCashDelta: number;
}

/**
 * Run one day of exchange lifecycle: prune, regen the NPC book, settle
 * crossings, refund orphaned player escrow.
 *
 * @param args - World slices needed for the tick
 * @param args.day - Current game day
 * @param args.exchange - Current exchange state
 * @param args.horses - All horses keyed by id
 * @param args.npcStables - NPC stables
 * @param args.playerReputation - Player reputation score (0-1000)
 * @param args.playerName - Player stable name (trade tape display)
 */
export function runExchangeSettlementDay(args: {
  day: number;
  exchange: ExchangeState;
  horses: Record<string, Horse>;
  npcStables: Stable[];
  playerReputation: number;
  playerName?: string;
}): DailyExchangeSettlement {
  const { day, npcStables, playerReputation } = args;
  const playerId = EXCHANGE_PLAYER_ID;
  const playerName = args.playerName ?? "My Stable";
  const horseArr = Object.values(args.horses);

  // --- 1. Prune expired orders; expired player bids refund their escrow.
  const pruned = pruneExchange(args.exchange, day);
  const livePlayerBidIds = new Set(
    pruned.bids.filter((b) => b.bidderId === playerId).map((b) => b.id),
  );
  let playerCashDelta = 0;
  for (const bid of args.exchange.bids) {
    if (bid.bidderId === playerId && !livePlayerBidIds.has(bid.id)) {
      playerCashDelta += bid.price;
    }
  }

  // --- 2. Regenerate the NPC book, preserving live player orders.
  const { asks: npcAsks, bids: npcBids } = generateNpcBook({
    day,
    horses: horseArr,
    npcStables,
    existing: pruned,
    playerReputation,
  });
  const refreshed: ExchangeState = {
    ...pruned,
    asks: [...pruned.asks.filter((a) => a.sellerId === playerId), ...npcAsks],
    bids: [...pruned.bids.filter((b) => b.bidderId === playerId), ...npcBids],
    lastRefreshDay: day,
  };

  // --- 3. Cross the book. NPC bids and standing player bids compete on price;
  // a winning player bid buys the horse with its escrowed funds.
  const settlement = resolveNpcExchangeTrades({
    day,
    state: refreshed,
    horses: horseArr,
    npcStables,
    commission: (price) => exchangeCommission(price),
    playerId,
    playerName,
  });

  const nextHorses = { ...args.horses };
  for (const change of settlement.ownershipChanges) {
    const horse = nextHorses[change.horseId];
    if (!horse) continue;
    nextHorses[change.horseId] =
      change.buyerStableId === playerId
        ? { ...horse, ownership: makePlayerOwned() }
        : { ...horse, ownership: makeNpcOwned(asNpcStableId(change.buyerStableId)) };
  }

  const filledAsks = new Set(settlement.filledAskIds);
  const filledBids = new Set(settlement.filledBidIds);
  const tradedHorses = new Set(settlement.trades.map((t) => t.horseId));

  // --- 4. Refund surviving player bids on horses that just traded — the horse
  // left its seller, so the standing bid can never fill.
  for (const bid of refreshed.bids) {
    if (bid.bidderId === playerId && !filledBids.has(bid.id) && tradedHorses.has(bid.horseId)) {
      playerCashDelta += bid.price;
    }
  }

  const nextExchange: ExchangeState = {
    ...refreshed,
    asks: refreshed.asks.filter(
      (a) => !filledAsks.has(a.id) && !(a.sellerId !== playerId && tradedHorses.has(a.horseId)),
    ),
    bids: refreshed.bids.filter((b) => !filledBids.has(b.id) && !tradedHorses.has(b.horseId)),
    trades: [...refreshed.trades, ...settlement.trades],
  };

  const nextStables = npcStables.map((st) =>
    settlement.cashDeltas[st.id] !== undefined
      ? { ...st, cash: st.cash + settlement.cashDeltas[st.id] }
      : st,
  );

  return {
    exchange: nextExchange,
    horses: nextHorses,
    npcStables: nextStables,
    playerCashDelta,
  };
}
