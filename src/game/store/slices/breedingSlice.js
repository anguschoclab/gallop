"use strict";
/**
 * store/slices/breedingSlice.ts - Breeding state slice
 *
 * This file provides breeding-related state and actions for reproduction and lineage
 * tracking, including breeding, retirement, pregnancy management, and breeding
 * program management.
 *
 * Dependencies: @/game/types (Pregnancy, TripleCrownProgress, Horse), @/game/state/breedingState (BreedingState, createDefaultBreedingState), @/core/breeding/programs (createBreedingProgram, updateProgramProgress, BreedingProgram), @/core/breeding/archetypes (getArchetypeById), @/core/breeding/eligibility (canBreed, BreedResult), @/game/uuid (generateUUID), @/core/resolver/intents (BreedingIntent), @/game/constants/gameConstants (BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE), @/lib/formatting (formatCurrency), ../guards (requireOwned, requireHorse), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/core/breeding/programs.ts (breeding programs)
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBreedingSlice = createBreedingSlice;
var breedingState_1 = require("@/game/state/breedingState");
var eligibility_1 = require("@/core/breeding/eligibility");
var uuid_1 = require("@/core/uuid");
var gameConstants_1 = require("@/game/constants/gameConstants");
var guards_1 = require("../guards");
/**
 * Create the breeding state slice with breeding and retirement actions.
 *
 * Provides breeding, retirement to pasture, pregnancy management, and Triple Crown
 * history tracking. Uses intent-based state updates for breeding actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Breeding slice with state and actions
 */
function createBreedingSlice(set, get, enqueueIntent) {
    return __assign(__assign({}, (0, breedingState_1.createDefaultBreedingState)()), { breed: function (sireId, damId, liveFoalGuarantee) {
            var _a, _b, _c;
            if (liveFoalGuarantee === void 0) { liveFoalGuarantee = false; }
            var s = get();
            var sire = s.horses.find(function (h) { return h.id === sireId; });
            var dam = s.horses.find(function (h) { return h.id === damId; });
            var fail = function (reason) {
                set({ log: __spreadArray([{ day: s.day, text: "Breeding: ".concat(reason) }], s.log, true).slice(0, 50) });
                return { ok: false, reason: reason };
            };
            var eligibility = (0, eligibility_1.canBreed)(sire, dam, s.day, s.pregnancies);
            if (!eligibility.ok)
                return fail(eligibility.reason);
            // External-stallion path: if the sire belongs to an NPC stable, charge
            // the player the stud fee (in addition to base breeding fee), credit
            // the stable, and increment the stallion's season-bookings counter.
            // If the stallion is syndicated, apply fee reduction based on player's share ownership.
            var isExternal = !!sire.stableId;
            var studFee = 0;
            if (isExternal) {
                if (!((_a = sire.stud) === null || _a === void 0 ? void 0 : _a.atStud))
                    return fail("".concat(sire.name, " is not standing at stud."));
                if (sire.stud.seasonBookings >= sire.stud.bookSize) {
                    return fail("".concat(sire.name, "'s book is full this season."));
                }
                if (sire.hemisphere !== dam.hemisphere) {
                    return fail("Cross-hemisphere breeding is not supported.");
                }
                // Check if stallion is syndicated and apply fee reduction
                var syndicate = (_b = s.syndicates) === null || _b === void 0 ? void 0 : _b[sireId];
                var playerShareCount = ((_c = syndicate === null || syndicate === void 0 ? void 0 : syndicate.shareHolders) === null || _c === void 0 ? void 0 : _c["player"]) || 0;
                var totalShares = (syndicate === null || syndicate === void 0 ? void 0 : syndicate.totalShares) || 1;
                var playerSharePercentage = playerShareCount / totalShares;
                // Apply fee reduction: player only pays their share of the stud fee
                studFee = sire.stud.standingFee * (1 - playerSharePercentage);
                // Enqueue fee distribution intent if syndicated
                if (syndicate && syndicate.totalShares > 0) {
                    var feeDistIntent = {
                        id: (0, uuid_1.generateUUID)(),
                        entityId: sireId,
                        source: "system",
                        day: s.day,
                        priority: 50,
                        type: "syndicate_fee_distribution",
                        syndicateId: syndicate.id,
                        totalFee: sire.stud.standingFee,
                        breedingDay: s.day,
                    };
                    enqueueIntent(feeDistIntent);
                }
            }
            var totalFee = isExternal
                ? gameConstants_1.BREEDING_FEE + (liveFoalGuarantee ? gameConstants_1.LIVE_FOAL_GUARANTEE_FEE : 0) + studFee
                : 0;
            if (s.cash < totalFee)
                return fail("Insufficient cash for breeding fee.");
            // Enqueue BreedingIntent for next day advance
            var intent = {
                id: (0, uuid_1.generateUUID)(),
                entityId: damId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "breeding",
                sireId: sireId,
                damId: damId,
                liveFoalGuarantee: liveFoalGuarantee,
            };
            enqueueIntent(__assign(__assign({}, intent), { fee: totalFee }));
            return { ok: true };
        }, retireToPasture: function (horseId) {
            var s = get();
            var horse = (0, guards_1.requireHorse)(s.horses, horseId);
            if (!horse)
                return { ok: false, reason: "Horse not found." };
            var ownershipGuard = (0, guards_1.requireOwned)(horse);
            if (ownershipGuard)
                return ownershipGuard;
            if (horse.age < 3)
                return { ok: false, reason: "Horse must be at least 3 years old to retire." };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "pasture_retirement",
                horseId: horseId,
            });
            return { ok: true };
        }, setPregnancies: function (pregnancies) {
            set({ pregnancies: pregnancies });
        }, setTriplecrownHistory: function (history) {
            set({ triplecrownHistory: history });
        }, createSyndicate: function (stallionId, totalShares, sharePrice, initialShareholders) {
            var _a, _b;
            var s = get();
            var stallion = (0, guards_1.requireHorse)(s.horses, stallionId);
            if (!stallion)
                return { ok: false, reason: "Stallion not found." };
            var ownershipGuard = (0, guards_1.requireOwned)(stallion);
            if (ownershipGuard)
                return ownershipGuard;
            // Validate stallion is a G1 winner
            var g1Wins = ((_a = stallion.raceHistory) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return r.grade === "G1" && r.position === 1; }).length) || 0;
            if (g1Wins === 0)
                return { ok: false, reason: "Stallion must be a G1 winner to syndicate." };
            // Check if syndicate already exists
            if ((_b = s.syndicates) === null || _b === void 0 ? void 0 : _b[stallionId])
                return { ok: false, reason: "Stallion is already syndicated." };
            var intent = {
                id: (0, uuid_1.generateUUID)(),
                entityId: stallionId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "syndicate_creation",
                stallionId: stallionId,
                totalShares: totalShares,
                sharePrice: sharePrice,
                initialShareholders: initialShareholders,
            };
            enqueueIntent(intent);
            return { ok: true };
        }, purchaseShares: function (syndicateId, shares, pricePerShare) {
            var _a;
            var s = get();
            var syndicate = (_a = s.syndicates) === null || _a === void 0 ? void 0 : _a[syndicateId];
            if (!syndicate)
                return { ok: false, reason: "Syndicate not found." };
            var totalCost = shares * pricePerShare;
            if (s.cash < totalCost)
                return { ok: false, reason: "Insufficient cash to purchase shares." };
            var intent = {
                id: (0, uuid_1.generateUUID)(),
                entityId: syndicateId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "share_purchase",
                syndicateId: syndicateId,
                shares: shares,
                pricePerShare: pricePerShare,
            };
            enqueueIntent(intent);
            return { ok: true };
        }, sellShares: function (syndicateId, shares, pricePerShare) {
            var _a, _b;
            var s = get();
            var syndicate = (_a = s.syndicates) === null || _a === void 0 ? void 0 : _a[syndicateId];
            if (!syndicate)
                return { ok: false, reason: "Syndicate not found." };
            var playerShares = ((_b = syndicate.shareHolders) === null || _b === void 0 ? void 0 : _b["player"]) || 0;
            if (playerShares < shares)
                return { ok: false, reason: "You don't own enough shares." };
            var intent = {
                id: (0, uuid_1.generateUUID)(),
                entityId: syndicateId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "share_sale",
                syndicateId: syndicateId,
                shares: shares,
                pricePerShare: pricePerShare,
            };
            enqueueIntent(intent);
            return { ok: true };
        } });
}
