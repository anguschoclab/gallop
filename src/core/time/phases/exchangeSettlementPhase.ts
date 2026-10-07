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
import { createDefaultExchangeState } from "@/core/market/exchange";
import { runExchangeSettlementDay } from "@/core/market/exchangeSettlement";

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

    // Shared daily tick — same implementation as exchangeSlice.refreshExchange.
    const result = runExchangeSettlementDay({
      day: newDay,
      exchange,
      horses: state.horses,
      npcStables: state.npcStables ?? [],
      playerReputation: state.reputation?.score ?? 0,
      playerName: state.playerProfile?.stableName ?? "My Stable",
    });

    return {
      ...context,
      state: {
        ...state,
        horses: result.horses,
        npcStables: result.npcStables,
        exchange: result.exchange,
        cash: result.playerCashDelta ? state.cash + result.playerCashDelta : state.cash,
      },
    };
  },
};
