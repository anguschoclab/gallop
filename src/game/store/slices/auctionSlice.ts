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
import { asHorseId, asPlayerOwnerId } from "@/core/types/branded";
import { generateUUID } from "@/core/uuid";
import { formatCurrency } from "@/core/common/formatting";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts";
import { requireHorse, requireOwned } from "../guards";
import { buildBiddingRecord, mergeBiddingHistory } from "@/core/auction/biddingHistory";
import { applyAuctionImpacts } from "@/core/auction/auctionImpactActions";
import {
  validateConsignment,
  validateWithdrawal,
  validateBookBid,
  validateBuyNow,
  buildBookBidLogText,
  buildAuctionResolutionLogText,
} from "@/core/auction/auctionActions";

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
    impacts: AnyImpact[],
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

      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      const validation = validateConsignment({
        horse: horse!,
        sale,
        allHorses: Object.values(s.horses),
        reservePrice,
      });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "consignment",
        horseId: asHorseId(horseId),
        saleId,
        reservePrice: validation.reservePrice!,
      });

      return { ok: true };
    },

    withdrawConsignment: (horseId) => {
      const s = get();
      const horse = s.horses[asHorseId(horseId)];
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === horse?.consignedSaleId);
      const validation = validateWithdrawal({ horse, sale });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "consignment_withdrawal",
        horseId: asHorseId(horseId),
        saleId: horse!.consignedSaleId!,
      });

      return { ok: true };
    },

    placeBookBid: (saleId, lotId, amount) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      const lot = sale?.lots.find((l: AuctionLot) => l.id === lotId);
      const validation = validateBookBid({ sale, lot, cash: s.cash, amount });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

      const bookLot: AuctionLot = {
        ...lot!,
        bidHistory: [
          ...(lot!.bidHistory || []),
          { stableId: asPlayerOwnerId("player"), amount, tick: s.day },
        ],
      };
      const bookRecord = buildBiddingRecord(
        sale!,
        bookLot,
        s.horses[bookLot.horseId]?.name ?? "Unknown",
        s.day,
      );

      set({
        cash: s.cash - amount,
        playerBiddingHistory: bookRecord
          ? mergeBiddingHistory(s.playerBiddingHistory ?? [], [bookRecord])
          : (s.playerBiddingHistory ?? []),
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
                          { stableId: asPlayerOwnerId("player"), amount, tick: s.day },
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
            text: buildBookBidLogText(amount, lotId, sale!.name),
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
      const acc = {
        cash: s.cash,
        npcStables: [...s.npcStables],
        horses: { ...s.horses } as Record<string, Horse>,
        inbox: [...s.inbox],
      };
      applyAuctionImpacts(acc, impacts ?? []);
      const { cash: newCash, npcStables: newNpcStables, horses: newHorses, inbox: newInbox } = acc;

      // ⚡ Bolt Optimization: Replaced O(N*M) nested array loop with O(N) hash map lookup.
      // 📊 Expected Impact: O(1) lookup reduces time complexity for resolving auction sales with large numbers of lots.
      const finalLotsMap = new Map(finalLots.map((fl) => [fl.id, fl]));

      // Record every lot the player bid on, with its final hammer outcome.
      const biddingRecords = finalLots
        .map((fl) => {
          const original = sale.lots.find((l: AuctionLot) => l.id === fl.id);
          const merged: AuctionLot = { ...(original ?? fl), ...fl };
          const horseName =
            newHorses[merged.horseId]?.name ?? s.horses[merged.horseId]?.name ?? "Unknown";
          return buildBiddingRecord(sale, merged, horseName, s.day);
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      set({
        playerBiddingHistory: mergeBiddingHistory(s.playerBiddingHistory ?? [], biddingRecords),
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
            text: buildAuctionResolutionLogText(sale.name),
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    buyNow: (saleId, lotId) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      const lot = sale?.lots.find((l: AuctionLot) => l.id === lotId);
      const validation = validateBuyNow({ sale, lot, cash: s.cash });
      if (!validation.ok) return { ok: false, reason: validation.reason! };

      enqueueIntent({
        id: generateUUID(),
        entityId: lot!.horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "purchase",
        horseId: lot!.horseId,
        price: validation.buyNowPrice!,
      });

      return { ok: true };
    },

    setAuctions: (auctions) => {
      set({ auctions });
    },
  };
}
