/**
 * phases/exchangeSettlementPhase.ts - Daily exchange refresh + NPC settlement
 *
 * Regenerates the NPC side of the bloodstock-exchange order book and settles
 * NPC-vs-NPC crossings once per simulated day. Running inside the shared
 * pipeline keeps the trade tape live during week/month batch advances, where
 * post-advance store callbacks only see the final day.
 *
 * Player orders are never auto-settled: asks survive the refresh and NPC bids
 * against them surface as "fillable" notifications instead.
 *
 * Dependencies: ../pipeline, @/core/market/exchange, @/core/horse/ownership
 * Related files: src/game/store/slices/exchangeSlice.ts (player-facing actions)
 */

import { PHASE_ORDER_EXCHANGE_SETTLEMENT } from "@/constants";
import type { PipelineContext } from "../pipeline";
import {
  createDefaultExchangeState,
  exchangeCommission,
  generateNpcBook,
  pruneExchange,
  resolveNpcExchangeTrades,
  type ExchangeState,
} from "@/core/market/exchange";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import type { Horse } from "@/core/horse/types";

const PLAYER_ID = "player";

/**
 * Phase: Exchange Settlement
 * Refresh the NPC exchange book and cross NPC asks with standing NPC bids.
 */
export const exchangeSettlementPhase = {
  name: "exchangeSettlement",
  order: PHASE_ORDER_EXCHANGE_SETTLEMENT,
  skipIf: (context: PipelineContext): boolean =>
    (context.state.exchange ?? createDefaultExchangeState()).lastRefreshDay === context.newDay,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const exchange = state.exchange ?? createDefaultExchangeState();
    if (exchange.lastRefreshDay === newDay) return context;

    const horses = Object.values(state.horses) as Horse[];
    const npcStables = state.npcStables ?? [];

    const pruned = pruneExchange(exchange, newDay);
    const { asks, bids } = generateNpcBook({
      day: newDay,
      horses,
      npcStables,
      existing: pruned,
      playerReputation: state.reputation?.score ?? 0,
    });
    const refreshed: ExchangeState = {
      ...pruned,
      asks: [...pruned.asks.filter((a) => a.sellerId === PLAYER_ID), ...asks],
      bids,
      lastRefreshDay: newDay,
    };

    const settlement = resolveNpcExchangeTrades({
      day: newDay,
      state: refreshed,
      horses,
      npcStables,
      commission: (price) => exchangeCommission(price),
    });

    if (settlement.trades.length === 0) {
      return { ...context, state: { ...state, exchange: refreshed } };
    }

    const nextHorses = { ...state.horses };
    for (const change of settlement.ownershipChanges) {
      const horse = nextHorses[change.horseId] as Horse | undefined;
      if (!horse) continue;
      nextHorses[change.horseId] = {
        ...horse,
        ownership: makeNpcOwned(asNpcStableId(change.buyerStableId)),
      };
    }

    const filledAsks = new Set(settlement.filledAskIds);
    const filledBids = new Set(settlement.filledBidIds);
    const tradedHorses = new Set(settlement.trades.map((t) => t.horseId));

    return {
      ...context,
      state: {
        ...state,
        horses: nextHorses,
        npcStables: npcStables.map((st) =>
          settlement.cashDeltas[st.id] !== undefined
            ? { ...st, cash: st.cash + settlement.cashDeltas[st.id] }
            : st,
        ),
        exchange: {
          ...refreshed,
          asks: refreshed.asks.filter(
            (a) =>
              !filledAsks.has(a.id) && !(a.sellerId !== PLAYER_ID && tradedHorses.has(a.horseId)),
          ),
          bids: refreshed.bids.filter((b) => !filledBids.has(b.id) && !tradedHorses.has(b.horseId)),
          trades: [...refreshed.trades, ...settlement.trades],
        },
      },
    };
  },
};
