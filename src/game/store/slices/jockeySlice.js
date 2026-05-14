"use strict";
/**
 * store/slices/jockeySlice.ts - Jockey management slice
 *
 * This file provides jockey-related state and actions for hiring, silk rerolling,
 * and jockey assignment to races.
 *
 * Dependencies: @/game/types (Jockey), @/lib/formatting (formatCurrency), @/game/uuid (generateUUID), ../types (ActionResult, GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/game/jockeyGen.ts (jockey generation)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJockeySlice = void 0;
var formatting_1 = require("@/lib/formatting");
var uuid_1 = require("@/core/uuid");
var guards_1 = require("../guards");
var gameConstants_1 = require("@/game/constants/gameConstants");
var createJockeySlice = function (set, get) { return ({
    hireJockey: function (jockeyId, contractType) {
        var _a;
        if (contractType === void 0) { contractType = "standard"; }
        var s = get();
        var jockey = (_a = s.jockeys) === null || _a === void 0 ? void 0 : _a.find(function (j) { return j.id === jockeyId; });
        if (!jockey)
            return { ok: false, reason: "Jockey not found." };
        if (jockey.stableId)
            return { ok: false, reason: "Jockey is already under contract." };
        var bonusMultiplier = contractType === "retainer" ? gameConstants_1.JOCKEY_RETAINER_BONUS_MULTIPLIER : gameConstants_1.JOCKEY_PER_RACE_BONUS_MULTIPLIER;
        var bonus = jockey.ridingFee * bonusMultiplier;
        if (s.cash < bonus)
            return {
                ok: false,
                reason: "Insufficient cash. Sign-on bonus is ".concat((0, formatting_1.formatCurrency)(bonus), "."),
            };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: jockeyId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "jockey_contract",
            jockeyId: jockeyId,
            stableId: "player",
            contractUntil: s.day + (contractType === "retainer" ? gameConstants_1.JOCKEY_RETAINER_DAYS : gameConstants_1.JOCKEY_CONTRACT_DAYS),
            bonus: bonus,
            stableAffinity: contractType === "retainer" ? 50 : 0, // Retainers start with 50 stable affinity
        });
        return { ok: true };
    },
    hireApprentice: function (jockeyId) {
        var _a;
        var s = get();
        var jockey = (_a = s.jockeys) === null || _a === void 0 ? void 0 : _a.find(function (j) { return j.id === jockeyId; });
        if (!jockey)
            return { ok: false, reason: "Jockey not found." };
        if (!jockey.isApprentice)
            return { ok: false, reason: "Jockey is not an apprentice." };
        if (jockey.stableId)
            return { ok: false, reason: "Jockey is already under contract." };
        // Apprentices are free to enroll but require academy facility (checked in intent validation)
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: jockeyId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "jockey_contract",
            jockeyId: jockeyId,
            stableId: "player",
            contractUntil: s.day + gameConstants_1.DAYS_PER_YEAR, // Year-long enrollment
            bonus: 0,
            stableAffinity: 20,
        });
        return { ok: true };
    },
    releaseJockey: function (jockeyId) {
        var _a;
        var s = get();
        var jockey = (_a = s.jockeys) === null || _a === void 0 ? void 0 : _a.find(function (j) { return j.id === jockeyId; });
        if (!jockey)
            return { ok: false, reason: "Jockey not found." };
        if (!jockey.stableId || jockey.stableId !== "player")
            return { ok: false, reason: "Jockey is not under contract with your stable." };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: jockeyId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "jockey_release",
            jockeyId: jockeyId,
        });
        return { ok: true };
    },
    rerollJockeySilk: function (jockeyId) {
        var _a;
        var s = get();
        var jockey = (_a = s.jockeys) === null || _a === void 0 ? void 0 : _a.find(function (j) { return j.id === jockeyId; });
        if (!jockey)
            return { ok: false, reason: "Jockey not found." };
        if (!jockey.stableId || (jockey.stableId !== "player" && jockey.stableId !== "player_academy"))
            return { ok: false, reason: "Can only reroll silk for your jockeys." };
        var rerollCost = 100;
        if (s.cash < rerollCost)
            return {
                ok: false,
                reason: "Insufficient cash. Silk reroll costs ".concat((0, formatting_1.formatCurrency)(rerollCost), "."),
            };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: jockeyId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "reroll_silk",
            jockeyId: jockeyId,
            cost: rerollCost,
        });
        return { ok: true };
    },
    assignJockey: function (raceId, horseId, jockeyId) {
        var _a;
        var s = get();
        var race = s.races.find(function (r) { return r.id === raceId; });
        if (!race)
            return { ok: false, reason: "Race not found." };
        var horse = (0, guards_1.requireHorse)(s.horses, horseId);
        var ownershipGuard = (0, guards_1.requireOwned)(horse);
        if (ownershipGuard)
            return ownershipGuard;
        var jockey = (_a = s.jockeys) === null || _a === void 0 ? void 0 : _a.find(function (j) { return j.id === jockeyId; });
        if (!jockey)
            return { ok: false, reason: "Jockey not found." };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: horseId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "jockey_assignment",
            raceId: raceId,
            horseId: horseId,
            jockeyId: jockeyId,
        });
        return { ok: true };
    },
    setJockeys: function (jockeys) {
        set({ jockeys: jockeys });
    },
}); };
exports.createJockeySlice = createJockeySlice;
