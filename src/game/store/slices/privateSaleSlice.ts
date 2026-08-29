/**
 * store/slices/privateSaleSlice.ts - Private sales and claiming state slice
 *
 * This file provides actions for private sale offers, counter-offers, and
 * claiming race participation.
 *
 * Dependencies: @/game/types (Horse, PrivateSaleOffer, Claim, Race), @/game/uuid (generateUUID), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice)
 */

import type { Horse, PrivateSaleOffer, Claim, Race, Stable } from "@/game/types";
import { makePlayerOwned, isPlayerOwned, getStableId } from "@/core/horse/ownership";
import { generateUUID } from "@/core/uuid";
import type { StoreSet, StoreGet } from "../types";
import type { AnyIntent } from "@/core/resolver/intents";
import { evaluateHorseAttachment, attachmentAdjustedAsk } from "@/core/horse/attachment";
import { calculateLotValuation } from "@/core/auction/engine";
import { computePremiumBuyout, computeDiplomaticPressure } from "@/core/horse/overrideNegotiation";

export type PrivateSaleSlice = {
  /** Proposes a private sale offer to an NPC stable for one of its horses */
  proposePrivateSale: (
    horseId: string,
    stableId: string,
    amount: number,
  ) => { ok: boolean; reason?: string };
  /** Responds to a counter-offer from an NPC stable (accept or decline) */
  respondToPrivateSale: (offerId: string, accept: boolean) => { ok: boolean; reason?: string };
  /** Requests an override on a protected/untouchable horse (premium buyout or diplomatic pressure) */
  requestOverride: (
    offerId: string,
    type: "premium" | "diplomatic",
  ) => { ok: boolean; reason?: string };
  /** Enters a horse in a claiming race */
  enterClaimingRace: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  /** Withdraws a horse from a claiming race before the entry cutoff */
  withdrawFromClaimingRace: (raceId: string, horseId: string) => void;
  /** Files a claim on a horse running in a claiming race */
  fileClaim: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  /** Sets the collection of active private sale offers */
  setPrivateSaleOffers: (offers: PrivateSaleOffer[]) => void;
  /** Sets the collection of active claims */
  setClaims: (claims: Claim[]) => void;
};

/**
 * Create the private sales and claiming state slice.
 *
 * Provides private sale offers, counter-offers, claiming race entry and withdrawal,
 * and claim filing actions. Uses intent-based state updates.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Private sale slice with actions
 */
export function createPrivateSaleSlice(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): PrivateSaleSlice {
  return {
    proposePrivateSale: (horseId, stableId, amount) => {
      const s = get();
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "horse_not_found" };
      if (getStableId(horse) !== stableId) return { ok: false, reason: "horse_not_in_stable" };
      if (s.cash < amount) return { ok: false, reason: "insufficient_funds" };

      const offer: PrivateSaleOffer = {
        id: generateUUID(),
        horseId,
        fromStableId: undefined,
        toStableId: stableId,
        amount,
        status: "pending",
        createdDay: s.day,
        expiresDay: s.day + 3,
      };

      set({
        privateSaleOffers: [...s.privateSaleOffers, offer],
      });

      return { ok: true, reason: "offer_submitted" };
    },

    respondToPrivateSale: (offerId, accept) => {
      const s = get();
      const offer: PrivateSaleOffer | undefined = s.privateSaleOffers.find(
        (o: PrivateSaleOffer) => o.id === offerId,
      );
      if (!offer) return { ok: false, reason: "offer_not_found" };
      if (offer.status !== "countered") return { ok: false, reason: "offer_not_actionable" };

      if (accept) {
        const finalAmount = offer.counterAmount ?? offer.amount;
        if (s.cash < finalAmount) return { ok: false, reason: "insufficient_funds" };

        const horse = s.horses[offer.horseId];
        if (!horse) return { ok: false, reason: "horse_not_found" };

        const updatedHorse: Horse = { ...horse, ownership: makePlayerOwned() };

        const updatedOffers = s.privateSaleOffers.map((o: PrivateSaleOffer) =>
          o.id === offerId ? { ...o, status: "accepted" as const } : o,
        );

        set({
          cash: s.cash - finalAmount,
          horses: { ...s.horses, [offer.horseId]: updatedHorse },
          privateSaleOffers: updatedOffers,
        });

        return { ok: true };
      } else {
        const updatedOffers = s.privateSaleOffers.map((o: PrivateSaleOffer) =>
          o.id === offerId ? { ...o, status: "declined" as const } : o,
        );

        set({ privateSaleOffers: updatedOffers });
        return { ok: true };
      }
    },

    requestOverride: (offerId, type) => {
      const s = get();
      const offer: PrivateSaleOffer | undefined = s.privateSaleOffers.find(
        (o: PrivateSaleOffer) => o.id === offerId,
      );
      if (!offer) return { ok: false, reason: "offer_not_found" };
      if (offer.status !== "pending") return { ok: false, reason: "offer_not_actionable" };

      const horse = s.horses[offer.horseId];
      if (!horse) return { ok: false, reason: "horse_not_found" };

      const stableId = offer.toStableId;
      if (!stableId) return { ok: false, reason: "offer_not_actionable" };

      const stable: Stable | undefined = (s.npcStables as Stable[]).find(
        (st) => st.id === stableId,
      );
      if (!stable) return { ok: false, reason: "stable_not_found" };

      const allHorses = Object.values(s.horses);
      const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
      const attachment = evaluateHorseAttachment(horse, stable);
      const ask = attachmentAdjustedAsk(horse, stable, valuation, s.reputation?.score ?? 0);

      if (type === "premium") {
        const { cost } = computePremiumBuyout(attachment, ask);
        if (s.cash < cost) return { ok: false, reason: "insufficient_funds" };

        const updatedHorse: Horse = { ...horse, ownership: makePlayerOwned() };
        const updatedOffers = s.privateSaleOffers.map((o: PrivateSaleOffer) =>
          o.id === offerId
            ? {
                ...o,
                status: "accepted" as const,
                overrideType: "premium" as const,
                overrideAmount: cost,
              }
            : o,
        );

        set({
          cash: s.cash - cost,
          horses: { ...s.horses, [offer.horseId]: updatedHorse },
          privateSaleOffers: updatedOffers,
        });

        return { ok: true };
      } else {
        // Diplomatic: set to override_pending, resolved next day
        const friction = s.npcAIManager?.stableStates?.[stableId]?.friction ?? 0;
        const reputationScore = s.reputation?.score ?? 0;
        const { successCost } = computeDiplomaticPressure(
          attachment,
          ask,
          friction,
          reputationScore,
        );

        const updatedOffers = s.privateSaleOffers.map((o: PrivateSaleOffer) =>
          o.id === offerId
            ? {
                ...o,
                status: "override_pending" as const,
                overrideType: "diplomatic" as const,
                overrideAmount: successCost,
              }
            : o,
        );

        set({ privateSaleOffers: updatedOffers });
        return { ok: true };
      }
    },

    enterClaimingRace: (raceId, horseId) => {
      const s = get();
      const race: Race | undefined = s.races[raceId];
      if (!race) return { ok: false, reason: "race_not_found" };
      if (!race.claiming) return { ok: false, reason: "not_claiming_race" };
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "horse_not_found" };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "not_owned" };
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

    withdrawFromClaimingRace: (raceId, horseId) => {
      const s = get();
      const race: Race | undefined = s.races[raceId];
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

    fileClaim: (raceId, horseId) => {
      const s = get();
      const race: Race | undefined = s.races[raceId];
      if (!race) return { ok: false, reason: "race_not_found" };
      if (!race.claiming) return { ok: false, reason: "not_claiming_race" };
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "horse_not_found" };
      // Self-claim prohibited
      if (isPlayerOwned(horse)) return { ok: false, reason: "self_claim_prohibited" };
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

    setPrivateSaleOffers: (offers) => {
      set({ privateSaleOffers: offers });
    },

    setClaims: (claims) => {
      set({ claims });
    },
  };
}
