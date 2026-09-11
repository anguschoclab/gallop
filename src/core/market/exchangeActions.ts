/**
 * exchangeActions.ts - Pure helpers for exchange slice trade settlement.
 *
 * Extracted from exchangeSlice.ts so the slice becomes a thin coordinator.
 * Each helper is pure (no store access) and handles one responsibility.
 *
 * Dependencies: @/game/types, @/core/horse/ownership, @/core/market/exchange,
 *              @/core/reputation/commerceReputation, @/core/horse/pricing
 * Related files: src/game/store/slices/exchangeSlice.ts (coordinator)
 */

import type { Horse, Stable } from "@/game/types";
import { horseMarketValue } from "@/core/horse/pricing";
import {
  daysSincePlayerAcquired,
  marketTradeReputation,
} from "@/core/reputation/commerceReputation";
import { applyReputationEvents } from "@/core/reputation/reputationEvents";
import type { ExchangeState, ExchangeTrade } from "@/core/market/exchange";

/**
 * Compute the reputation state after a market trade.
 * Pure: reads only its inputs, returns the new reputation state.
 *
 * @param role - Whether the player is the buyer or seller.
 * @param horse - The horse traded.
 * @param price - The trade price.
 * @param counterpartyName - Name of the NPC counterparty.
 * @param allHorses - All horses for fair-value calculation.
 * @param tradeHistory - Exchange trade tape (for days-owned calculation).
 * @param currentDay - Current game day.
 * @param currentReputation - Current reputation state (may be undefined).
 * @param args
 * @param args.role
 * @param args.horse
 * @param args.price
 * @param args.counterpartyName
 * @param args.allHorses
 * @param args.tradeHistory
 * @param args.currentDay
 * @param args.currentReputation
 * @returns The updated reputation state.
 */
export function computeReputationAfterTrade(args: {
  role: "buyer" | "seller";
  horse: Horse;
  price: number;
  counterpartyName: string;
  allHorses: Horse[];
  tradeHistory: ExchangeTrade[];
  currentDay: number;
  currentReputation: ReturnType<typeof applyReputationEvents> | undefined;
}) {
  const daysOwned =
    args.role === "seller"
      ? daysSincePlayerAcquired(args.tradeHistory, args.horse.id, args.currentDay)
      : undefined;
  const event = marketTradeReputation({
    role: args.role,
    price: args.price,
    fairValue: Math.round(horseMarketValue(args.horse, args.allHorses)),
    horseName: args.horse.name,
    horseId: args.horse.id,
    counterpartyName: args.counterpartyName,
    day: args.currentDay,
    daysOwned,
  });
  return applyReputationEvents(args.currentReputation, [event]);
}

/**
 * Apply a completed trade to the exchange state: remove matching asks/bids
 * and append the trade to the tape. Pure: returns a new state object.
 *
 * @param state - Current exchange state.
 * @param trade - The completed trade to record.
 * @returns New exchange state with the trade applied.
 */
export function applyTradeToExchange(state: ExchangeState, trade: ExchangeTrade): ExchangeState {
  return {
    ...state,
    asks: state.asks.filter((a) => a.horseId !== trade.horseId),
    bids: state.bids.filter((b) => b.horseId !== trade.horseId),
    trades: [...state.trades, trade],
  };
}

/**
 * Build the state patch for a settled trade. Pure: combines all the
 * state mutations needed for a trade into a single patch object.
 *
 * @param args - Trade settlement parameters.
 * @param args.horse
 * @param args.newOwnership
 * @param args.playerCashDelta
 * @param args.currentCash
 * @param args.currentHorses
 * @param args.currentNpcStables
 * @param args.currentExchange
 * @param args.trade
 * @param args.reputation
 * @param args.logEntry
 * @param args.logEntry.day
 * @param args.logEntry.text
 * @param args.currentLog
 * @param args.npcCashDeltas
 * @returns A partial state patch to be applied via set().
 */
export function buildSettleTradePatch(args: {
  horse: Horse;
  newOwnership: Horse["ownership"];
  playerCashDelta: number;
  currentCash: number;
  currentHorses: Record<string, Horse>;
  currentNpcStables: Stable[] | undefined;
  currentExchange: ExchangeState;
  trade: ExchangeTrade;
  reputation: ReturnType<typeof applyReputationEvents>;
  logEntry: { day: number; text: string };
  currentLog: { day: number; text: string }[];
  npcCashDeltas?: { stableId: string; delta: number }[];
}) {
  const npcDeltas = new Map(args.npcCashDeltas?.map((d) => [d.stableId, d.delta]));
  return {
    reputation: args.reputation,
    cash: args.currentCash + args.playerCashDelta,
    horses: {
      ...args.currentHorses,
      [args.horse.id]: { ...args.horse, ownership: args.newOwnership },
    },
    npcStables:
      npcDeltas.size > 0
        ? (args.currentNpcStables ?? []).map((st) =>
            npcDeltas.has(st.id) ? { ...st, cash: st.cash + (npcDeltas.get(st.id) ?? 0) } : st,
          )
        : args.currentNpcStables,
    exchange: applyTradeToExchange(args.currentExchange, args.trade),
    log: [...args.currentLog, args.logEntry],
  };
}
