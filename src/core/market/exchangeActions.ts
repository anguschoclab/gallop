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
import { isPlayerOwned } from "@/core/horse/ownership";
import { exchangeCommission, netProceeds } from "@/core/market/exchange";

/**
 * Validate that a horse can be listed on the exchange.
 * Pure: returns an error reason string or null if valid.
 * @param horse - The horse to validate.
 * @param price - The ask price.
 * @param existingAsk - Whether an ask already exists for this horse.
 */
export function validateListHorse(
  horse: Horse | undefined,
  price: number,
  existingAsk: boolean,
): string | null {
  if (!horse) return "Horse not found";
  if (!isPlayerOwned(horse)) return "You do not own this horse";
  if (horse.consignedSaleId) return "Horse is already consigned to an auction";
  if (horse.lifecycleStatus === "deceased") return "Horse is no longer with us";
  if (!Number.isFinite(price) || price <= 0) return "Ask price must be positive";
  if (existingAsk) return "Horse is already listed";
  return null;
}

/**
 * Validate that a bid can be accepted by the player.
 * Pure: returns an error reason string or null if valid.
 * @param horse - The horse being sold.
 * @param buyer - The NPC buyer.
 * @param bidPrice - The bid price.
 */
export function validateAcceptBid(
  horse: Horse | undefined,
  buyer: Stable | undefined,
  bidPrice: number,
): string | null {
  if (!horse) return "Horse not found";
  if (!isPlayerOwned(horse)) return "You do not own this horse";
  if (!buyer) return "Buyer is no longer active";
  if (buyer.cash < bidPrice) return "Buyer can no longer fund the bid";
  return null;
}

/**
 * Validate that an ask can be bought by the player.
 * Pure: returns an error reason string or null if valid.
 * @param horse - The horse being bought.
 * @param sellerId - The seller's stable ID.
 * @param playerCash - The player's current cash.
 * @param askPrice - The ask price.
 */
export function validateBuyAsk(
  horse: Horse | undefined,
  sellerId: string,
  playerCash: number,
  askPrice: number,
): string | null {
  if (!horse) return "Horse not found";
  if (sellerId === "player") return "This is your own listing";
  if (playerCash < askPrice) return "Insufficient funds";
  return null;
}

/**
 * Build an ExchangeTrade object for a bid acceptance (player sells to NPC).
 * Pure: returns the trade object.
 * @param horse - The horse being sold.
 * @param bidPrice - The accepted bid price.
 * @param buyerId - The buyer's stable ID.
 * @param buyerName - The buyer's display name.
 * @param sellerName - The seller's display name.
 * @param currentDay - The current game day.
 * @param tradeId - Unique trade ID.
 */
export function buildBidAcceptTrade(
  horse: Horse,
  bidPrice: number,
  buyerId: string,
  buyerName: string,
  sellerName: string,
  currentDay: number,
  tradeId: string,
): ExchangeTrade {
  return {
    id: tradeId,
    horseId: horse.id,
    horseName: horse.name,
    price: bidPrice,
    commission: exchangeCommission(bidPrice),
    buyerId,
    buyerName,
    sellerId: "player",
    sellerName,
    day: currentDay,
    initiatedBy: "bid",
  };
}

/**
 * Build an ExchangeTrade object for an ask purchase (player buys from NPC).
 * Pure: returns the trade object.
 * @param horse - The horse being bought.
 * @param askPrice - The ask price.
 * @param sellerId - The seller's stable ID.
 * @param sellerName - The seller's display name.
 * @param buyerName - The buyer's display name.
 * @param currentDay - The current game day.
 * @param tradeId - Unique trade ID.
 */
export function buildAskBuyTrade(
  horse: Horse,
  askPrice: number,
  sellerId: string,
  sellerName: string,
  buyerName: string,
  currentDay: number,
  tradeId: string,
): ExchangeTrade {
  return {
    id: tradeId,
    horseId: horse.id,
    horseName: horse.name,
    price: askPrice,
    commission: exchangeCommission(askPrice),
    buyerId: "player",
    buyerName,
    sellerId,
    sellerName,
    day: currentDay,
    initiatedBy: "ask",
  };
}

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
