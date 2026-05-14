"use strict";
/**
 * store/slices/privateSaleSlice.ts - Private sales and claiming state slice
 *
 * This file provides actions for private sale offers, counter-offers, and
 * claiming race participation.
 *
 * Dependencies: @/game/types (Horse, PrivateSaleOffer, Claim, Race), @/game/uuid (generateUUID), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrivateSaleSlice = createPrivateSaleSlice;
var uuid_1 = require("@/core/uuid");
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
function createPrivateSaleSlice(set, get, enqueueIntent) {
    return {
        proposePrivateSale: function (horseId, stableId, amount) {
            var s = get();
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse)
                return { ok: false, reason: "horse_not_found" };
            if (horse.stableId !== stableId)
                return { ok: false, reason: "horse_not_in_stable" };
            if (s.cash < amount)
                return { ok: false, reason: "insufficient_funds" };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "purchase",
                horseId: horseId,
                price: amount,
            });
            return { ok: true, reason: "offer_submitted" };
        },
        respondToPrivateSale: function (offerId, accept) {
            var _a, _b;
            var s = get();
            var offer = ((_a = s.privateSaleOffers) !== null && _a !== void 0 ? _a : []).find(function (o) { return o.id === offerId; });
            if (!offer)
                return { ok: false, reason: "offer_not_found" };
            if (offer.status !== "countered")
                return { ok: false, reason: "offer_not_actionable" };
            if (accept) {
                var finalAmount = (_b = offer.counterAmount) !== null && _b !== void 0 ? _b : offer.amount;
                if (s.cash < finalAmount)
                    return { ok: false, reason: "insufficient_funds" };
                enqueueIntent({
                    id: (0, uuid_1.generateUUID)(),
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
        enterClaimingRace: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return { ok: false, reason: "race_not_found" };
            if (!race.claiming)
                return { ok: false, reason: "not_claiming_race" };
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse)
                return { ok: false, reason: "horse_not_found" };
            if (!horse.owned)
                return { ok: false, reason: "not_owned" };
            if (s.day >= race.day)
                return { ok: false, reason: "entries_closed" };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "race_entry",
                raceId: raceId,
                horseId: horseId,
            });
            return { ok: true };
        },
        withdrawFromClaimingRace: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return;
            if (s.day >= race.day - 1)
                return;
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "race_withdrawal",
                raceId: raceId,
                horseId: horseId,
            });
        },
        fileClaim: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return { ok: false, reason: "race_not_found" };
            if (!race.claiming)
                return { ok: false, reason: "not_claiming_race" };
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse)
                return { ok: false, reason: "horse_not_found" };
            // Self-claim prohibited
            if (horse.owned)
                return { ok: false, reason: "self_claim_prohibited" };
            if (s.cash < race.claiming.price)
                return { ok: false, reason: "insufficient_funds" };
            if (s.day >= race.day)
                return { ok: false, reason: "post_time_passed" };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "claiming",
                raceId: raceId,
                horseId: horseId,
                claimingPrice: race.claiming.price,
            });
            return { ok: true };
        },
        setPrivateSaleOffers: function (offers) {
            set({ privateSaleOffers: offers });
        },
        setClaims: function (claims) {
            set({ claims: claims });
        },
    };
}
