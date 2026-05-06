/**
 * Market Slice
 * Market-related state and actions for trading, auctions, and scouting
 */

import type { Horse, AuctionSale, ScoutReport } from "@/game/types";
import type { MarketState } from "@/game/state/marketState";
import { createDefaultMarketState } from "@/game/state/marketState";
import { horsePrice, horsePriceWithPedigree } from "@/core/horse/pricing";
import { scoutHorse } from "@/game/scouting";
import { createRng, hashStr } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import type { PurchaseIntent } from "@/core/resolver/intents";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "@/game/auction";

export type MarketSlice = MarketState & {
  buyHorse: (horseId: string) => void;
  scoutHorse: (horseId: string) => {
    success: boolean;
    report?: ScoutReport;
    cost: number;
    message: string;
  };
  consignHorse: (horseId: string, saleId: string, reservePrice?: number) => { ok: true } | { ok: false; reason: string };
  withdrawConsignment: (horseId: string) => { ok: true } | { ok: false; reason: string };
  placeBookBid: (saleId: string, lotId: string, amount: number) => { ok: true } | { ok: false; reason: string };
  debitForLiveBid: (amount: number) => { ok: true } | { ok: false; reason: string };
  commitAuctionResult: (
    saleId: string,
    finalLots: import("@/game/types").AuctionLot[],
    impacts: import("@/core/resolver/impacts").AnyImpact[],
  ) => { ok: true } | { ok: false; reason: string };
  setMarket: (market: Horse[]) => void;
  setAuctions: (auctions: AuctionSale[]) => void;
  setScoutReports: (reports: ScoutReport[]) => void;
};

export function createMarketSlice(
  set: any,
  get: any,
  enqueueIntent: (intent: PurchaseIntent) => void,
): MarketSlice {
  return {
    ...createDefaultMarketState(),

    buyHorse: (horseId) => {
      const s = get();
      const h = s.market.find((m: Horse) => m.id === horseId);
      if (!h) return;
      const price = horsePrice(h);
      if (s.cash < price) return;

      // Enqueue PurchaseIntent for next day advance
      const intent: PurchaseIntent = {
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "purchase",
        horseId,
        price,
      };

      enqueueIntent(intent);

      // Deduct cash immediately
      set({
        cash: s.cash - price,
        log: [
          { day: s.day, text: `${h.name} purchase scheduled for $${price.toLocaleString()}.` },
          ...s.log,
        ].slice(0, 50),
      });
    },

    scoutHorse: (horseId) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) {
        return { success: false, cost: 0, message: "Horse not found." };
      }
      if (!horse.stableId) {
        return { success: false, cost: 0, message: "Cannot scout your own horses." };
      }
      const stable = s.npcStables.find((st: any) => st.id === horse.stableId);
      if (!stable) {
        return { success: false, cost: 0, message: "Stable not found." };
      }

      const scoutRng = createRng(hashStr(`scout_${horseId}_${s.day}`));
      const result = scoutHorse(horse, stable, s.day, s.cash, scoutRng);

      if (result.success && result.report) {
        const report = result.report;
        // Deduct cost and save report
        const updatedHorses = s.horses.map((h: Horse) =>
          h.id === horseId
            ? { ...h, scoutedStats: report.revealedStats, lastScoutedDay: s.day }
            : h,
        );
        set({
          horses: updatedHorses,
          cash: s.cash - result.cost,
          scoutReports: [report, ...s.scoutReports],
          log: [{ day: s.day, text: result.message }, ...s.log].slice(0, 50),
        });
      }
      return result;
    },

    consignHorse: (horseId: string, saleId: string, reservePrice?: number) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.consignedSaleId) return { ok: false, reason: "Already consigned to a sale." };
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
      const baseValue = horsePriceWithPedigree(horse, s.horses);
      const finalReserve = Math.round(reservePrice ?? baseValue * DEFAULT_PLAYER_RESERVE_RATIO);
      set({
        horses: s.horses.map((h: Horse) => (h.id === horseId ? { ...h, consignedSaleId: saleId } : h)),
        auctions: (s.auctions ?? []).map((a: AuctionSale) =>
          a.id === saleId
            ? {
                ...a,
                lots: [
                  ...a.lots,
                  {
                    id: generateUUID(),
                    horseId,
                    consignorStableId: undefined,
                    saleId,
                    reservePrice: finalReserve,
                    passed: false,
                    withdrawn: false,
                  },
                ],
              }
            : a,
        ),
        log: [
          {
            day: s.day,
            text: `${horse.name} consigned to ${sale.name} (reserve $${finalReserve.toLocaleString()}).`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    withdrawConsignment: (horseId: string) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.consignedSaleId) return { ok: false, reason: "Horse not consigned." };
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === horse.consignedSaleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
      
      set({
        horses: s.horses.map((h: Horse) => (h.id === horseId ? { ...h, consignedSaleId: undefined } : h)),
        auctions: (s.auctions ?? []).map((a: AuctionSale) =>
          a.id === sale.id
            ? {
                ...a,
                lots: a.lots.map((lot) =>
                  lot.horseId === horseId ? { ...lot, withdrawn: true } : lot,
                ),
              }
            : a,
        ),
        log: [
          {
            day: s.day,
            text: `${horse.name} withdrawn from ${sale.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    placeBookBid: (saleId: string, lotId: string, amount: number) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
      const lot = sale.lots.find((l: any) => l.id === lotId);
      if (!lot) return { ok: false, reason: "Lot not found." };
      if (lot.withdrawn || lot.passed) return { ok: false, reason: "Lot not available." };
      if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };
      
      set({
        cash: s.cash - amount,
        auctions: (s.auctions ?? []).map((a: AuctionSale) =>
          a.id === saleId
            ? {
                ...a,
                lots: a.lots.map((l: any) =>
                  l.id === lotId
                    ? {
                        ...l,
                        bids: [...(l.bids || []), { bidderId: "player", amount, day: s.day }],
                      }
                    : l,
                ),
              }
            : a,
        ),
        log: [
          {
            day: s.day,
            text: `Book bid of $${amount.toLocaleString()} placed on lot ${lotId} in ${sale.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    debitForLiveBid: (amount: number) => {
      const s = get();
      if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };
      set({ cash: s.cash - amount });
      return { ok: true };
    },

    commitAuctionResult: (saleId: string, finalLots: any[], impacts: any[]) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "Sale not found." };
      
      // Apply impacts via resolver (this would be handled by the main store's applyImpacts)
      // For now, just update the auction state
      set({
        auctions: (s.auctions ?? []).map((a: AuctionSale) =>
          a.id === saleId
            ? {
                ...a,
                resolved: true,
                lots: finalLots,
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

    setMarket: (market) => {
      set({ market });
    },

    setAuctions: (auctions) => {
      set({ auctions });
    },

    setScoutReports: (reports) => {
      set({ scoutReports: reports });
    },
  };
}
