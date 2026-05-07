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
import { scoutHorse } from "@/game/scouting";
import { createRng, hashStr } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import type { PurchaseIntent } from "@/core/resolver/intents";
import { DEFAULT_PLAYER_RESERVE_RATIO, calculateLotValuation } from "@/game/auction";
import { formatCurrency } from "@/components/HorseBits";

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
          { day: s.day, text: `${h.name} purchase scheduled for ${formatCurrency(price)}.` },
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
        horses: s.horses.map((h: Horse) =>
          h.id === horseId ? { ...h, consignedSaleId: saleId } : h,
        ),
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
            text: `${horse.name} consigned to ${sale.name} (reserve ${formatCurrency(finalReserve)}).`,
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
        horses: s.horses.map((h: Horse) =>
          h.id === horseId ? { ...h, consignedSaleId: undefined } : h,
        ),
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

    // -------------------------------------------------------------------------
    // D1 — Buy-Now
    // -------------------------------------------------------------------------

    buyNow: (saleId: string, lotId: string) => {
      const s = get();
      const sale = (s.auctions ?? []).find((a: AuctionSale) => a.id === saleId);
      if (!sale) return { ok: false, reason: "sale_not_found" };
      if (sale.resolved) return { ok: false, reason: "sale_resolved" };
      // Broodmare sales never have buy-now; guard for degenerate state.
      if (sale.kind === "broodmare") return { ok: false, reason: "buy_now_unavailable" };
      const lot = sale.lots.find((l: any) => l.id === lotId);
      if (!lot) return { ok: false, reason: "lot_not_found" };
      if (lot.buyNowPrice === undefined) return { ok: false, reason: "buy_now_unavailable" };
      const buyNowPrice: number = lot.buyNowPrice;
      if (s.cash < buyNowPrice) return { ok: false, reason: "insufficient_funds" };
      if (lot.withdrawn || lot.passed || lot.hammerPrice !== undefined)
        return { ok: false, reason: "lot_not_available" };
      const horse = s.horses.find((h: Horse) => h.id === lot.horseId);
      if (!horse) return { ok: false, reason: "horse_not_found" };
      if (horse.owned) return { ok: false, reason: "already_owned" };

      // Apply: debit cash, transfer horse, mark lot sold
      const updatedHorses = s.horses.map((h: Horse) =>
        h.id === lot.horseId
          ? { ...h, owned: true, stableId: undefined, consignedSaleId: undefined }
          : h,
      );
      const updatedAuctions = (s.auctions ?? []).map((a: AuctionSale) =>
        a.id === saleId
          ? {
              ...a,
              lots: a.lots.map((l: any) =>
                l.id === lotId
                  ? {
                      ...l,
                      hammerPrice: buyNowPrice,
                      soldToStableId: undefined, // player won
                      passed: false,
                      buyNowPrice: undefined,
                    }
                  : l,
              ),
            }
          : a,
      );
      set({
        cash: s.cash - buyNowPrice,
        horses: updatedHorses,
        auctions: updatedAuctions,
        log: [
          {
            day: s.day,
            text: `${horse.name} purchased via Buy Now for ${formatCurrency(buyNowPrice)}.`,
          },
          ...s.log,
        ].slice(0, 50),
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

      // Duplicate offer guard
      const existingOffer = (s.privateSaleOffers ?? []).find(
        (o: PrivateSaleOffer) =>
          o.horseId === horseId &&
          o.fromStableId === undefined &&
          (o.status === "pending" || o.status === "countered"),
      );
      if (existingOffer) return { ok: false, reason: "duplicate_offer" };

      // Horse in auction guard
      if (horse.consignedSaleId) return { ok: false, reason: "horse_in_auction" };

      const stable: Stable | undefined = s.npcStables.find((st: Stable) => st.id === stableId);
      if (!stable) return { ok: false, reason: "stable_not_found" };

      const valuation = calculateLotValuation(horse, stable, "racing_age", s.horses);
      const offerId = generateUUID();
      const expiresDay = s.day + 3;

      let status: PrivateSaleOffer["status"];
      let counterAmount: number | undefined;

      if (amount >= valuation * 0.9) {
        status = "accepted";
      } else if (amount >= valuation * 0.6) {
        status = "countered";
        counterAmount = Math.round(valuation * 0.95);
      } else {
        status = "declined";
      }

      const offer: PrivateSaleOffer = {
        id: offerId,
        horseId,
        fromStableId: undefined, // player is the buyer
        toStableId: stableId,
        amount,
        counterAmount,
        status,
        createdDay: s.day,
        expiresDay,
      };

      const newOffers = [...(s.privateSaleOffers ?? []), offer];

      if (status === "accepted") {
        // Immediately transfer
        const updatedHorses = s.horses.map((h: Horse) =>
          h.id === horseId ? { ...h, owned: true, stableId: undefined } : h,
        );
        // Credit NPC stable
        const updatedStables = s.npcStables.map((st: Stable) =>
          st.id === stableId
            ? {
                ...st,
                cash: st.cash + amount,
                horses: st.horses.filter((id: string) => id !== horseId),
              }
            : st,
        );
        set({
          cash: s.cash - amount,
          horses: updatedHorses,
          npcStables: updatedStables,
          privateSaleOffers: newOffers,
          log: [
            {
              day: s.day,
              text: `${horse.name} acquired from ${stable.name} for ${formatCurrency(amount)}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
      } else {
        set({
          privateSaleOffers: newOffers,
          log: [
            {
              day: s.day,
              text: `Private sale offer of ${formatCurrency(amount)} for ${horse.name} submitted to ${stable.name}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
      }

      return { ok: true, reason: status };
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
        const horse = s.horses.find((h: Horse) => h.id === offer.horseId);
        if (!horse) return { ok: false, reason: "horse_not_found" };
        const stable: Stable | undefined = s.npcStables.find(
          (st: Stable) => st.id === offer.toStableId,
        );

        const updatedHorses = s.horses.map((h: Horse) =>
          h.id === offer.horseId ? { ...h, owned: true, stableId: undefined } : h,
        );
        const updatedStables = s.npcStables.map((st: Stable) =>
          st.id === offer.toStableId
            ? {
                ...st,
                cash: st.cash + finalAmount,
                horses: st.horses.filter((id: string) => id !== offer.horseId),
              }
            : st,
        );
        const updatedOffers = (s.privateSaleOffers ?? []).map((o: PrivateSaleOffer) =>
          o.id === offerId ? { ...o, status: "accepted" as const } : o,
        );
        set({
          cash: s.cash - finalAmount,
          horses: updatedHorses,
          npcStables: updatedStables,
          privateSaleOffers: updatedOffers,
          log: [
            {
              day: s.day,
              text: `Counter offer accepted. ${horse?.name ?? "Horse"} joins your stable for ${formatCurrency(finalAmount)}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
      } else {
        const updatedOffers = (s.privateSaleOffers ?? []).map((o: PrivateSaleOffer) =>
          o.id === offerId ? { ...o, status: "declined" as const } : o,
        );
        set({ privateSaleOffers: updatedOffers });
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
      if (race.entries.some((e: any) => e.horseId === horseId))
        return { ok: false, reason: "already_entered" };

      const updatedRaces = s.races.map((r: Race) =>
        r.id === raceId
          ? {
              ...r,
              entries: [...r.entries, { horseId, owned: true }],
            }
          : r,
      );
      set({
        races: updatedRaces,
        log: [
          {
            day: s.day,
            text: `${horse.name} entered in ${race.name} (claiming ${formatCurrency(race.claiming!.price)}).`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    withdrawFromClaimingRace: (raceId: string, horseId: string) => {
      const s = get();
      const race: Race | undefined = s.races.find((r: Race) => r.id === raceId);
      if (!race) return;
      const entry = race.entries.find((e: any) => e.horseId === horseId);
      if (!entry) return;
      // Withdrawal window: before race.day - 1
      if (s.day >= race.day - 1) return;

      const updatedRaces = s.races.map((r: Race) =>
        r.id === raceId
          ? { ...r, entries: r.entries.filter((e: any) => e.horseId !== horseId) }
          : r,
      );
      const horse = s.horses.find((h: Horse) => h.id === horseId);
      set({
        races: updatedRaces,
        log: [
          { day: s.day, text: `${horse?.name ?? "Horse"} withdrawn from ${race.name}.` },
          ...s.log,
        ].slice(0, 50),
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

      // Duplicate guard
      const duplicate = (s.claims ?? []).find(
        (c: Claim) =>
          c.raceId === raceId && c.horseId === horseId && c.claimantStableId === undefined,
      );
      if (duplicate) return { ok: false, reason: "duplicate_claim" };

      const claim: Claim = {
        id: generateUUID(),
        raceId,
        horseId,
        claimantStableId: undefined, // player
        price: race.claiming.price,
        day: s.day,
      };
      set({
        claims: [...(s.claims ?? []), claim],
        log: [
          {
            day: s.day,
            text: `Claim filed on ${horse.name} in ${race.name} for ${formatCurrency(race.claiming.price)}.`,
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

    setPrivateSaleOffers: (offers) => {
      set({ privateSaleOffers: offers });
    },

    setClaims: (claims) => {
      set({ claims });
    },
  };
}
