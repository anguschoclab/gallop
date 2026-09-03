/**
 * store/slices/exchangeSlice.ts - Bloodstock exchange slice
 *
 * Player-facing actions for the continuous horse exchange: listing owned horses
 * as asks, cancelling listings, hitting an NPC bid, and buying an NPC ask.
 * The NPC side of the book is regenerated deterministically per day.
 *
 * Dependencies: @/core/market/exchange, @/core/horse/ownership, @/core/uuid
 * Related files: src/components/market/ExchangePanel.tsx
 */

import type { Horse } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import { asNpcStableId } from "@/core/types/branded";
import {
  getStableId,
  isPlayerOwned,
  makeNpcOwned,
  makePlayerOwned,
  makeUnowned,
} from "@/core/horse/ownership";
import { getAuctionHouse } from "@/core/prestige/auctionHouses";
import { houseQuote } from "@/core/market/houseQuotes";
import {
  createDefaultExchangeState,
  exchangeCommission,
  
  generateNpcBook,
  netProceeds,
  resolveNpcExchangeTrades,
  pruneExchange,
  suggestAskPrice,
  EXCHANGE_ORDER_TTL_DAYS,
  type ExchangeState,
  type ExchangeTrade,
} from "@/core/market/exchange";
import type { StoreSet, StoreGet } from "../types";
import type { ActionResult } from "../types";

export type ExchangeSlice = {
  /** Regenerate the NPC side of the book for the current day (idempotent per day). */
  refreshExchange: () => void;
  /** List a player-owned horse on the exchange at the given ask price. */
  listHorseOnExchange: (horseId: string, price: number) => ActionResult;
  /** Cancel one of the player's own listings. */
  cancelExchangeListing: (askId: string) => ActionResult;
  /** Sell a listed player horse into a standing NPC bid. */
  acceptExchangeBid: (bidId: string) => ActionResult;
  /** Buy an NPC-listed horse at its ask price. */
  buyFromExchange: (askId: string) => ActionResult;
  /** Sell a player horse through an auction house at that house's quote. */
  sellHorseToAuctionHouse: (horseId: string, houseId: string) => ActionResult;
  /** Buy a horse from an auction house catalogue at that house's buy price. */
  buyHorseFromAuctionHouse: (horseId: string, houseId: string) => ActionResult;
};

const PLAYER_ID = "player";

export function createExchangeSlice(set: StoreSet, get: StoreGet): ExchangeSlice {
  const readExchange = (): ExchangeState => get().exchange ?? createDefaultExchangeState();

  const pushTrade = (state: ExchangeState, trade: ExchangeTrade): ExchangeState => ({
    ...state,
    asks: state.asks.filter((a) => a.horseId !== trade.horseId),
    bids: state.bids.filter((b) => b.horseId !== trade.horseId),
    trades: [...state.trades, trade],
  });

  return {
    refreshExchange: () => {
      const s = get();
      const exchange = readExchange();
      if (exchange.lastRefreshDay === s.day) return;
      const horses = Object.values(s.horses) as Horse[];
      const pruned = pruneExchange(exchange, s.day);
      const { asks, bids } = generateNpcBook({
        day: s.day,
        horses,
        npcStables: s.npcStables ?? [],
        existing: pruned,
        playerReputation: s.reputation?.score ?? 0,
      });
      const refreshed: ExchangeState = {
        ...pruned,
        asks: [...pruned.asks.filter((a) => a.sellerId === PLAYER_ID), ...asks],
        bids,
        lastRefreshDay: s.day,
      };

      // NPC-vs-NPC trading: cross the book so the tape stays live even when the
      // player does nothing.
      const npcStables = s.npcStables ?? [];
      const settlement = resolveNpcExchangeTrades({
        day: s.day,
        state: refreshed,
        horses,
        npcStables,
        commission: (price) => exchangeCommission(price),
      });

      if (settlement.trades.length === 0) {
        set({ exchange: refreshed });
        return;
      }

      const nextHorses = { ...s.horses };
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

      set({
        horses: nextHorses,
        npcStables: npcStables.map((st) =>
          settlement.cashDeltas[st.id] !== undefined
            ? { ...st, cash: st.cash + settlement.cashDeltas[st.id] }
            : st,
        ),
        exchange: {
          ...refreshed,
          asks: refreshed.asks.filter(
            (a) => !filledAsks.has(a.id) && !(a.sellerId !== PLAYER_ID && tradedHorses.has(a.horseId)),
          ),
          bids: refreshed.bids.filter(
            (b) => !filledBids.has(b.id) && !tradedHorses.has(b.horseId),
          ),
          trades: [...refreshed.trades, ...settlement.trades],
        },
      });
    },

    listHorseOnExchange: (horseId, price) => {
      const s = get();
      const horse = s.horses[horseId] as Horse | undefined;
      if (!horse) return { ok: false, reason: "Horse not found" };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "You do not own this horse" };
      if (horse.consignedSaleId)
        return { ok: false, reason: "Horse is already consigned to an auction" };
      if (horse.lifecycleStatus === "deceased")
        return { ok: false, reason: "Horse is no longer with us" };
      if (!Number.isFinite(price) || price <= 0)
        return { ok: false, reason: "Ask price must be positive" };

      const exchange = readExchange();
      if (exchange.asks.some((a) => a.horseId === horseId && a.sellerId === PLAYER_ID))
        return { ok: false, reason: "Horse is already listed" };

      const { fairValue } = suggestAskPrice(horse, Object.values(s.horses) as Horse[]);

      set({
        exchange: {
          ...exchange,
          asks: [
            ...exchange.asks,
            {
              id: generateUUID(),
              horseId,
              sellerId: PLAYER_ID,
              sellerName: s.playerProfile?.stableName ?? "My Stable",
              price: Math.round(price),
              fairValue,
              createdDay: s.day,
              expiresDay: s.day + EXCHANGE_ORDER_TTL_DAYS,
            },
          ],
        },
        log: [
          ...s.log,
          { day: s.day, text: `${horse.name} listed on the exchange at ${Math.round(price)}.` },
        ],
      });
      return { ok: true };
    },

    cancelExchangeListing: (askId) => {
      const s = get();
      const exchange = readExchange();
      const ask = exchange.asks.find((a) => a.id === askId);
      if (!ask) return { ok: false, reason: "Listing not found" };
      if (ask.sellerId !== PLAYER_ID) return { ok: false, reason: "Not your listing" };
      set({
        exchange: { ...exchange, asks: exchange.asks.filter((a) => a.id !== askId) },
      });
      return { ok: true };
    },

    acceptExchangeBid: (bidId) => {
      const s = get();
      const exchange = readExchange();
      const bid = exchange.bids.find((b) => b.id === bidId);
      if (!bid) return { ok: false, reason: "Bid no longer available" };
      const horse = s.horses[bid.horseId] as Horse | undefined;
      if (!horse) return { ok: false, reason: "Horse not found" };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "You do not own this horse" };

      const buyer = (s.npcStables ?? []).find((st) => st.id === bid.bidderId);
      if (!buyer) return { ok: false, reason: "Buyer is no longer active" };
      if (buyer.cash < bid.price) return { ok: false, reason: "Buyer can no longer fund the bid" };

      const commission = exchangeCommission(bid.price);
      const proceeds = netProceeds(bid.price);

      const trade: ExchangeTrade = {
        id: generateUUID(),
        horseId: horse.id,
        horseName: horse.name,
        price: bid.price,
        commission,
        buyerId: buyer.id,
        buyerName: buyer.name,
        sellerId: PLAYER_ID,
        sellerName: s.playerProfile?.stableName ?? "My Stable",
        day: s.day,
        initiatedBy: "bid",
      };

      set({
        cash: s.cash + proceeds,
        horses: {
          ...s.horses,
          [horse.id]: { ...horse, ownership: makeNpcOwned(asNpcStableId(buyer.id)) },
        },
        npcStables: (s.npcStables ?? []).map((st) =>
          st.id === buyer.id ? { ...st, cash: st.cash - bid.price } : st,
        ),
        exchange: pushTrade(exchange, trade),
        log: [
          ...s.log,
          {
            day: s.day,
            text: `Sold ${horse.name} to ${buyer.name} on the exchange for ${bid.price} (net ${proceeds}).`,
          },
        ],
      });
      return { ok: true };
    },

    buyFromExchange: (askId) => {
      const s = get();
      const exchange = readExchange();
      const ask = exchange.asks.find((a) => a.id === askId);
      if (!ask) return { ok: false, reason: "Listing no longer available" };
      if (ask.sellerId === PLAYER_ID) return { ok: false, reason: "This is your own listing" };
      const horse = s.horses[ask.horseId] as Horse | undefined;
      if (!horse) return { ok: false, reason: "Horse not found" };
      if (s.cash < ask.price) return { ok: false, reason: "Insufficient funds" };

      const seller = (s.npcStables ?? []).find((st) => st.id === ask.sellerId);
      const proceeds = netProceeds(ask.price);

      const trade: ExchangeTrade = {
        id: generateUUID(),
        horseId: horse.id,
        horseName: horse.name,
        price: ask.price,
        commission: exchangeCommission(ask.price),
        buyerId: PLAYER_ID,
        buyerName: s.playerProfile?.stableName ?? "My Stable",
        sellerId: ask.sellerId,
        sellerName: ask.sellerName,
        day: s.day,
        initiatedBy: "ask",
      };

      set({
        cash: s.cash - ask.price,
        horses: {
          ...s.horses,
          [horse.id]: { ...horse, ownership: makePlayerOwned() },
        },
        npcStables: seller
          ? (s.npcStables ?? []).map((st) =>
              st.id === seller.id ? { ...st, cash: st.cash + proceeds } : st,
            )
          : s.npcStables,
        exchange: pushTrade(exchange, trade),
        log: [
          ...s.log,
          {
            day: s.day,
            text: `Bought ${horse.name} from ${ask.sellerName} on the exchange for ${ask.price}.`,
          },
        ],
      });
      return { ok: true };
    },

    sellHorseToAuctionHouse: (horseId, houseId) => {
      const s = get();
      const horse = s.horses[horseId] as Horse | undefined;
      if (!horse) return { ok: false, reason: "Horse not found" };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "You do not own this horse" };
      if (horse.consignedSaleId)
        return { ok: false, reason: "Horse is already consigned to an auction" };
      if (horse.lifecycleStatus === "deceased")
        return { ok: false, reason: "Horse is no longer with us" };
      const house = getAuctionHouse(houseId);
      if (!house) return { ok: false, reason: "Auction house not found" };

      const quote = houseQuote(horse, Object.values(s.horses) as Horse[], house);
      const exchange = readExchange();
      const trade: ExchangeTrade = {
        id: generateUUID(),
        horseId: horse.id,
        horseName: horse.name,
        price: quote.hammerEstimate,
        commission: quote.commission,
        buyerId: house.id,
        buyerName: house.name,
        sellerId: PLAYER_ID,
        sellerName: s.playerProfile?.stableName ?? "My Stable",
        day: s.day,
        initiatedBy: "bid",
      };

      set({
        cash: s.cash + quote.sellPrice,
        horses: { ...s.horses, [horse.id]: { ...horse, ownership: makeUnowned() } },
        exchange: pushTrade(exchange, trade),
        log: [
          ...s.log,
          {
            day: s.day,
            text: `${horse.name} sold through ${house.shortName} for ${quote.hammerEstimate} (net ${quote.sellPrice}).`,
          },
        ],
      });
      return { ok: true };
    },

    buyHorseFromAuctionHouse: (horseId, houseId) => {
      const s = get();
      const horse = s.horses[horseId] as Horse | undefined;
      if (!horse) return { ok: false, reason: "Horse not found" };
      if (isPlayerOwned(horse)) return { ok: false, reason: "You already own this horse" };
      if (horse.lifecycleStatus === "deceased")
        return { ok: false, reason: "Horse is no longer with us" };
      const house = getAuctionHouse(houseId);
      if (!house) return { ok: false, reason: "Auction house not found" };

      const quote = houseQuote(horse, Object.values(s.horses) as Horse[], house);
      if (s.cash < quote.buyPrice) return { ok: false, reason: "Insufficient funds" };

      const sellerStableId = getStableId(horse);
      const seller = sellerStableId
        ? (s.npcStables ?? []).find((st) => st.id === sellerStableId)
        : undefined;

      const exchange = readExchange();
      const trade: ExchangeTrade = {
        id: generateUUID(),
        horseId: horse.id,
        horseName: horse.name,
        price: quote.hammerEstimate,
        commission: quote.commission,
        buyerId: PLAYER_ID,
        buyerName: s.playerProfile?.stableName ?? "My Stable",
        sellerId: seller?.id ?? house.id,
        sellerName: seller?.name ?? house.name,
        day: s.day,
        initiatedBy: "ask",
      };

      set({
        cash: s.cash - quote.buyPrice,
        horses: { ...s.horses, [horse.id]: { ...horse, ownership: makePlayerOwned() } },
        npcStables: seller
          ? (s.npcStables ?? []).map((st) =>
              st.id === seller.id ? { ...st, cash: st.cash + quote.sellPrice } : st,
            )
          : s.npcStables,
        exchange: pushTrade(exchange, trade),
        log: [
          ...s.log,
          {
            day: s.day,
            text: `Bought ${horse.name} at ${house.shortName} for ${quote.buyPrice} (hammer ${quote.hammerEstimate}).`,
          },
        ],
      });
      return { ok: true };
    },
  };
}

