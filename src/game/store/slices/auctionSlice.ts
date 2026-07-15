/**
 * store/slices/auctionSlice.ts - Auction state slice
 *
 * This file provides auction-related state management, including consignment,
 * bidding, and result processing.
 *
 * Dependencies: @/game/types (Horse, AuctionSale, AuctionLot), @/core/horse/pricing (horsePriceWithPedigree), @/game/uuid (generateUUID), @/game/auction (DEFAULT_PLAYER_RESERVE_RATIO), @/lib/formatting (formatCurrency), ../types (StoreGet), ../guards (requireHorse, requireOwned)
 * Related files: store/index.ts (uses this slice), @/game/auction.ts (auction logic)
 */

import type { Horse, AuctionSale, AuctionLot } from "@/game/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { generateUUID } from "@/core/uuid";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "@/constants";
import { formatCurrency } from "@/core/common/formatting";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";
import { requireHorse, requireOwned } from "../guards";

export type AuctionSlice = {
  /** Consigns a horse to an upcoming auction sale */
  consignHorse: (
    horseId: string,
    saleId: string,
    reservePrice?: number,
  ) => { ok: true } | { ok: false; reason: string };
  /** Withdraws a horse from a sale it was previously consigned to */
  withdrawConsignment: (horseId: string) => { ok: true } | { ok: false; reason: string };
  /** Places a book bid on a lot before the sale starts */
  placeBookBid: (
    saleId: string,
    lotId: string,
    amount: number,
  ) => { ok: true } | { ok: false; reason: string };
  /** Debits the player's cash for a live bid during a sale */
  debitForLiveBid: (amount: number) => { ok: true } | { ok: false; reason: string };
  /** Commits the final results of an auction sale to the state */
  commitAuctionResult: (
    saleId: string,
    finalLots: AuctionLot[],
    impacts: any[],
  ) => { ok: true } | { ok: false; reason: string };
  /** Immediately resolves a lot at its buy-now price */
  buyNow: (saleId: string, lotId: string) => { ok: boolean; reason?: string };
  /** Sets the collection of active and upcoming auction sales */
  setAuctions: (auctions: AuctionSale[]) => void;
};

/**
 * Create the auction state slice with consignment, bidding, and result processing actions.
 *
 * Provides horse consignment to sales, consignment withdrawal, book bidding, live bid
 * debiting, auction result commitment, and buy-now functionality. Uses intent-based
 * state updates for auction actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Auction slice with actions
 */
export function createAuctionSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): AuctionSlice {
  return {
    consignHorse: (horseId, saleId, reservePrice) => {
      const s = get();
      const horse = requireHorse(s.horses, horseId);
      const ownershipGuard = requireOwned(horse);
      if (ownershipGuard) return ownershipGuard;

      if (horse!.consignedSaleId) return { ok: false, reason: "Already consigned to a sale." };
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
      const baseValue = horseMarketValue(horse!, Object.values(s.horses));
      const finalReserve = Math.round(reservePrice ?? baseValue * DEFAULT_PLAYER_RESERVE_RATIO);

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "consignment",
        horseId,
        saleId,
        reservePrice: finalReserve,
      });

      return { ok: true };
    },

    withdrawConsignment: (horseId) => {
      const s = get();
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.consignedSaleId) return { ok: false, reason: "Horse not consigned." };
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === horse.consignedSaleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      if (sale.resolved) return { ok: false, reason: "Sale already resolved." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "consignment_withdrawal",
        horseId,
        saleId: horse.consignedSaleId,
      });

      return { ok: true };
    },

    placeBookBid: (saleId, lotId, amount) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
      const lot = sale.lots.find((l: AuctionLot) => l.id === lotId);
      if (!lot) return { ok: false, reason: "Lot not found." };
      if (lot.withdrawn || lot.passed) return { ok: false, reason: "Lot not available." };
      if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };

      set({
        cash: s.cash - amount,
        auctions: (s.auctions ?? []).map((a: AuctionSale) =>
          a.id === saleId
            ? {
                ...a,
                lots: a.lots.map((l: AuctionLot) =>
                  l.id === lotId
                    ? {
                        ...l,
                        bidHistory: [
                          ...(l.bidHistory || []),
                          { stableId: "player", amount, tick: s.day },
                        ],
                      }
                    : l,
                ),
              }
            : a,
        ),
        log: [
          {
            day: s.day,
            text: `Book bid of ${formatCurrency(amount)} placed on lot ${lotId} in ${sale.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    debitForLiveBid: (amount) => {
      const s = get();
      if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };
      set({ cash: s.cash - amount });
      return { ok: true };
    },

    commitAuctionResult: (saleId, finalLots, impacts) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "Sale not found." };

      // Apply auction impacts directly (live Theater path, outside pipeline)
      let newCash = s.cash;
      let newNpcStables = [...s.npcStables];
      let newHorses: Record<string, import("@/game/types").Horse> = { ...s.horses };
      let newInbox = [...s.inbox];

      for (const impact of impacts ?? []) {
        const anyImpact = impact as any;

        switch (anyImpact.type) {
          case "cash_change": {
            const { entityId, amount } = anyImpact;
            if (entityId) {
              // NPC stable cash change
              newNpcStables = newNpcStables.map((stable) =>
                stable.id === entityId
                  ? { ...stable, cash: Math.max(0, stable.cash + amount) }
                  : stable,
              );
            } else {
              // Player cash change (offline path only; live path debits via debitForLiveBid)
              newCash = Math.max(0, newCash + amount);
            }
            break;
          }

          case "horse_transfer": {
            const { horseId: transferId, toStableId } = anyImpact;
            if (newHorses[transferId]) {
              newHorses = {
                ...newHorses,
                [transferId]: {
                  ...newHorses[transferId],
                  stableId: toStableId,
                  owned: !toStableId,
                },
              };
            }
            break;
          }

          case "inbox_message": {
            const { message } = anyImpact;
            if (message) {
              newInbox = [message, ...newInbox].slice(0, 100);
            }
            break;
          }
        }
      }

      // ⚡ Bolt Optimization: Replaced O(N*M) nested array loop with O(N) hash map lookup.
      // 📊 Expected Impact: O(1) lookup reduces time complexity for resolving auction sales with large numbers of lots.
      const finalLotsMap = new Map(finalLots.map((fl) => [fl.id, fl]));

      set({
        cash: newCash,
        npcStables: newNpcStables,
        horses: newHorses,
        inbox: newInbox,
        auctions: (s.auctions ?? []).map((a: AuctionSale) =>
          a.id === saleId
            ? {
                ...a,
                resolved: true,
                lots: a.lots.map((l: AuctionLot) => {
                  const finalLot = finalLotsMap.get(l.id);
                  if (!finalLot) return l;
                  return { ...l, ...finalLot };
                }),
              }
            : a,
        ),
        log: [
          {
            day: s.day,
            text: `Auction ${sale.name} resolved.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    buyNow: (saleId, lotId) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "sale_not_found" };
      if (sale.resolved) return { ok: false, reason: "sale_resolved" };
      if (sale.kind === "broodmare") return { ok: false, reason: "buy_now_unavailable" };
      const lot = sale.lots.find((l: any) => l.id === lotId);
      if (!lot) return { ok: false, reason: "lot_not_found" };
      if (lot.buyNowPrice === undefined) return { ok: false, reason: "buy_now_unavailable" };
      const buyNowPrice: number = lot.buyNowPrice;
      if (s.cash < buyNowPrice) return { ok: false, reason: "insufficient_funds" };
      if (lot.withdrawn || lot.passed || lot.hammerPrice !== undefined)
        return { ok: false, reason: "lot_not_available" };

      enqueueIntent({
        id: generateUUID(),
        entityId: lot.horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "purchase",
        horseId: lot.horseId,
        price: buyNowPrice,
      });

      return { ok: true };
    },

    setAuctions: (auctions) => {
      set({ auctions });
    },
  };
}
