/**
 * store/slices/privateSaleSlice.ts - Private sales and claiming state slice
 *
 * This file provides actions for private sale offers, counter-offers, and
 * claiming race participation.
 *
 * Dependencies: @/game/types (Horse, PrivateSaleOffer, Claim, Race), @/game/uuid (generateUUID), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice)
 */

import type { Horse, PrivateSaleOffer, Claim, Race } from "@/game/types";
import { generateUUID } from "@/core/uuid";
import type { StoreGet } from "../types";

export type PrivateSaleSlice = {
  /** Proposes a private sale offer to an NPC stable for one of its horses */
  proposePrivateSale: (
    horseId: string,
    stableId: string,
    amount: number,
  ) => { ok: boolean; reason?: string };
  /** Responds to a counter-offer from an NPC stable (accept or decline) */
  respondToPrivateSale: (offerId: string, accept: boolean) => { ok: boolean; reason?: string };
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
  set: any,
  get: StoreGet,
  enqueueIntent: (intent: any) => void,
): PrivateSaleSlice {
  return {
    proposePrivateSale: (horseId, stableId, amount) => {
      const s = get();
      const horse = s.horseMap.get(horseId);
      if (!horse) return { ok: false, reason: "horse_not_found" };
      if (horse.stableId !== stableId) return { ok: false, reason: "horse_not_in_stable" };
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
        privateSaleOffers: [...(s.privateSaleOffers ?? []), offer],
      });

      return { ok: true, reason: "offer_submitted" };
    },

    respondToPrivateSale: (offerId, accept) => {
      const s = get();
      const offer: PrivateSaleOffer | undefined = (s.privateSaleOffers ?? []).find(
        (o: PrivateSaleOffer) => o.id === offerId,
      );
      if (!offer) return { ok: false, reason: "offer_not_found" };
      if (offer.status !== "countered") return { ok: false, reason: "offer_not_actionable" };

      if (accept) {
        const finalAmount = offer.counterAmount ?? offer.amount;
        if (s.cash < finalAmount) return { ok: false, reason: "insufficient_funds" };

        const horse = s.horseMap.get(offer.horseId);
        if (!horse) return { ok: false, reason: "horse_not_found" };

        const updatedHorse: Horse = { ...horse, owned: true, stableId: undefined as any };
        const updatedHorseMap = new Map(s.horseMap);
        updatedHorseMap.set(offer.horseId, updatedHorse);

        const updatedOffers = (s.privateSaleOffers ?? []).map((o: PrivateSaleOffer) =>
          o.id === offerId ? { ...o, status: "accepted" as const } : o,
        );

        set({
          cash: s.cash - finalAmount,
          horseMap: updatedHorseMap,
          horses: s.horses.map((h: Horse) => (h.id === offer.horseId ? updatedHorse : h)),
          privateSaleOffers: updatedOffers,
        });

        return { ok: true };
      } else {
        const updatedOffers = (s.privateSaleOffers ?? []).map((o: PrivateSaleOffer) =>
          o.id === offerId ? { ...o, status: "declined" as const } : o,
        );

        set({ privateSaleOffers: updatedOffers });
        return { ok: true };
      }
    },

    enterClaimingRace: (raceId, horseId) => {
      const s = get();
      const race: Race | undefined = s.raceMap.get(raceId);
      if (!race) return { ok: false, reason: "race_not_found" };
      if (!race.claiming) return { ok: false, reason: "not_claiming_race" };
      const horse = s.horseMap.get(horseId);
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

    withdrawFromClaimingRace: (raceId, horseId) => {
      const s = get();
      const race: Race | undefined = s.raceMap.get(raceId);
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
      const race: Race | undefined = s.raceMap.get(raceId);
      if (!race) return { ok: false, reason: "race_not_found" };
      if (!race.claiming) return { ok: false, reason: "not_claiming_race" };
      const horse = s.horseMap.get(horseId);
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

    setPrivateSaleOffers: (offers) => {
      set({ privateSaleOffers: offers });
    },

    setClaims: (claims) => {
      set({ claims });
    },
  };
}
