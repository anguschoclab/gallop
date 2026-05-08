/**
 * Market Slice
 * Market-related state and actions for trading, auctions, and scouting
 */

import type {
  Horse,
  AuctionSale,
  ScoutReport,
  PrivateSaleOffer,
  Claim,
  Stable,
  Race,
} from "@/game/types";
import type { MarketState } from "@/game/state/marketState";
import { createDefaultMarketState } from "@/game/state/marketState";
import { horsePrice, horsePriceWithPedigree } from "@/core/horse/pricing";
import { scoutHorse, calculateScoutCost } from "@/game/scouting";
import { createRng, hashStr } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import type { PurchaseIntent, ScoutIntent } from "@/core/resolver/intents";
import { DEFAULT_PLAYER_RESERVE_RATIO, calculateLotValuation } from "@/game/auction";
import { formatCurrency } from "@/components/HorseBits";
import type { StoreSet, StoreGet } from "../types";

export type MarketSlice = MarketState & {
  buyHorse: (horseId: string) => void;
  scoutHorse: (horseId: string) => {
    success: boolean;
    report?: ScoutReport;
    cost: number;
    message: string;
  };
  consignHorse: (
    horseId: string,
    saleId: string,
    reservePrice?: number,
  ) => { ok: true } | { ok: false; reason: string };
  withdrawConsignment: (horseId: string) => { ok: true } | { ok: false; reason: string };
  placeBookBid: (
    saleId: string,
    lotId: string,
    amount: number,
  ) => { ok: true } | { ok: false; reason: string };
  debitForLiveBid: (amount: number) => { ok: true } | { ok: false; reason: string };
  commitAuctionResult: (
    saleId: string,
    finalLots: import("@/game/types").AuctionLot[],
    impacts: import("@/core/resolver/impacts").AnyImpact[],
  ) => { ok: true } | { ok: false; reason: string };
  /** D1 — Buy-now: immediately resolve a lot at its buyNowPrice */
  buyNow: (saleId: string, lotId: string) => { ok: boolean; reason?: string };
  /** D2 — Propose a private sale offer to an NPC stable */
  proposePrivateSale: (
    horseId: string,
    stableId: string,
    amount: number,
  ) => { ok: boolean; reason?: string };
  /** D2 — Respond to a counter-offer (accept or decline) */
  respondToPrivateSale: (offerId: string, accept: boolean) => { ok: boolean; reason?: string };
  /** D3 — Enter a horse in a claiming race */
  enterClaimingRace: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  /** D3 — Withdraw a horse from a claiming race (before cutoff) */
  withdrawFromClaimingRace: (raceId: string, horseId: string) => void;
  /** D3 — File a claim on a horse in a claiming race */
  fileClaim: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  setMarket: (market: Horse[]) => void;
  setAuctions: (auctions: AuctionSale[]) => void;
  setScoutReports: (reports: ScoutReport[]) => void;
  setPrivateSaleOffers: (offers: PrivateSaleOffer[]) => void;
  setClaims: (claims: Claim[]) => void;
};

export function createMarketSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
): MarketSlice {
  return {
    ...createDefaultMarketState(),

    buyHorse: (horseId) => {
      const s = get();
      const h = s.market.find((m: Horse) => m.id === horseId);
      if (!h) return;
      const price = horsePrice(h);
      if (s.cash < price) return;

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "purchase",
        horseId,
        price,
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
      const stable = s.npcStables.find((st: Stable) => st.id === horse.stableId);
      if (!stable) {
        return { success: false, cost: 0, message: "Stable not found." };
      }

      const cost = calculateScoutCost(horse, stable);
      if (s.cash < cost) {
        return {
          success: false,
          cost: 0,
          message: `Insufficient funds. Scouting costs ${formatCurrency(cost)}.`,
        };
      }

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "scout",
        horseId,
        stableId: horse.stableId,
      });

      return {
        success: true,
        cost,
        message: `Scout dispatched to examine ${horse.name}. Report ready tomorrow.`,
      };
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

    withdrawConsignment: (horseId: string) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
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

    placeBookBid: (saleId: string, lotId: string, amount: number) => {
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
            text: `Book bid of ${formatCurrency(amount)} placed on lot ${lotId} in ${sale.name}.`,
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

    commitAuctionResult: (
      saleId: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      finalLots: any[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      impacts: any[],
    ) => {
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lots: a.lots.map((l: any) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const finalLot = finalLots.find((fl: any) => fl.id === l.id);
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

    // -------------------------------------------------------------------------
    // D1 — Buy-Now
    // -------------------------------------------------------------------------

    buyNow: (saleId: string, lotId: string) => {
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

    // -------------------------------------------------------------------------
    // D2 — Private Sales
    // -------------------------------------------------------------------------

    proposePrivateSale: (horseId: string, stableId: string, amount: number) => {
      const s = get();
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "horse_not_found" };
      if (horse.stableId !== stableId) return { ok: false, reason: "horse_not_in_stable" };
      if (s.cash < amount) return { ok: false, reason: "insufficient_funds" };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "purchase", // Re-using purchase for now or create new
        horseId,
        price: amount,
      });

      return { ok: true, reason: "offer_submitted" };
    },

    respondToPrivateSale: (offerId: string, accept: boolean) => {
      const s = get();
      const offer: PrivateSaleOffer | undefined = (s.privateSaleOffers ?? []).find(
        (o: PrivateSaleOffer) => o.id === offerId,
      );
      if (!offer) return { ok: false, reason: "offer_not_found" };
      if (offer.status !== "countered") return { ok: false, reason: "offer_not_actionable" };

      if (accept) {
        const finalAmount = offer.counterAmount ?? offer.amount;
        if (s.cash < finalAmount) return { ok: false, reason: "insufficient_funds" };

        enqueueIntent({
          id: generateUUID(),
          entityId: offer.horseId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "purchase",
          horseId: offer.horseId,
          price: finalAmount,
        });
      }

      return { ok: true };
    },

    // -------------------------------------------------------------------------
    // D3 — Claiming Races
    // -------------------------------------------------------------------------

    enterClaimingRace: (raceId: string, horseId: string) => {
      const s = get();
      const race: Race | undefined = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "race_not_found" };
      if (!race.claiming) return { ok: false, reason: "not_claiming_race" };
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "horse_not_found" };
      if (!horse.owned) return { ok: false, reason: "not_owned" };
      if (s.day >= race.day) return { ok: false, reason: "entries_closed" };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_entry",
        raceId,
        horseId,
      });

      return { ok: true };
    },

    withdrawFromClaimingRace: (raceId: string, horseId: string) => {
      const s = get();
      const race: Race | undefined = s.races.find((r: Race) => r.id === raceId);
      if (!race) return;
      if (s.day >= race.day - 1) return;

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_withdrawal",
        raceId,
        horseId,
      });
    },

    fileClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race: Race | undefined = s.races.find((r: Race) => r.id === raceId);
      if (!race) return { ok: false, reason: "race_not_found" };
      if (!race.claiming) return { ok: false, reason: "not_claiming_race" };
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      if (!horse) return { ok: false, reason: "horse_not_found" };
      // Self-claim prohibited
      if (horse.owned) return { ok: false, reason: "self_claim_prohibited" };
      if (s.cash < race.claiming.price) return { ok: false, reason: "insufficient_funds" };
      if (s.day >= race.day) return { ok: false, reason: "post_time_passed" };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "claiming",
        raceId,
        horseId,
        claimingPrice: race.claiming.price,
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

    setPrivateSaleOffers: (offers) => {
      set({ privateSaleOffers: offers });
    },

    setClaims: (claims) => {
      set({ claims });
    },
  };
}
