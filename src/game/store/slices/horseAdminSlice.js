"use strict";
/**
 * store/slices/horseAdminSlice.ts - Horse administration slice
 *
 * This file provides horse administration actions for stud fee updates, retirement to
 * stud, gelding, renaming, and horse name registration.
 *
 * Dependencies: @/game/uuid (generateUUID), ../guards (requireOwned, requireHorse), ../types (ActionResult, GameStateCreator)
 * Related files: store/index.ts (uses this slice), ../guards.ts (validation guards)
 */
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
exports.createHorseAdminSlice = void 0;
var uuid_1 = require("@/core/uuid");
var guards_1 = require("../guards");
var createHorseAdminSlice = function (set, get) { return ({
    updateStudFee: function (horseId, newFee) {
        var s = get();
        var horse = (0, guards_1.requireHorse)(s.horses, horseId);
        var ownershipGuard = (0, guards_1.requireOwned)(horse);
        if (ownershipGuard)
            return ownershipGuard;
        if (!horse.stud)
            return { ok: false, reason: "Horse is not standing at stud." };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: horseId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "update_stud_fee",
            horseId: horseId,
            newFee: newFee,
        });
        return { ok: true };
    },
    retireToStud: function (horseId) {
        var s = get();
        var horse = (0, guards_1.requireHorse)(s.horses, horseId);
        var ownershipGuard = (0, guards_1.requireOwned)(horse);
        if (ownershipGuard)
            return ownershipGuard;
        if (horse.gender !== "horse" && horse.gender !== "colt")
            return { ok: false, reason: "Only male horses can stand at stud." };
        if (horse.age < 4)
            return { ok: false, reason: "Horse must be at least 4 years old to stand at stud." };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: horseId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "stud_retirement",
            horseId: horseId,
            standingFee: 500,
            bookSize: 20,
        });
        return { ok: true };
    },
    geldingHorse: function (horseId) {
        var s = get();
        var horse = (0, guards_1.requireHorse)(s.horses, horseId);
        var ownershipGuard = (0, guards_1.requireOwned)(horse);
        if (ownershipGuard)
            return ownershipGuard;
        if (horse.gender === "horse" || horse.gender === "gelding")
            return { ok: false, reason: "Horse is already male." };
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: horseId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "gelding",
            horseId: horseId,
        });
        return { ok: true };
    },
    renameHorse: function (horseId, newName) {
        var s = get();
        var horse = (0, guards_1.requireHorse)(s.horses, horseId);
        var ownershipGuard = (0, guards_1.requireOwned)(horse);
        if (ownershipGuard)
            return ownershipGuard;
        var lowerNewName = newName.toLowerCase();
        if (s.usedHorseNames.includes(lowerNewName) && lowerNewName !== horse.name.toLowerCase()) {
            return { ok: false, reason: "Name is already in use." };
        }
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: horseId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "rename",
            horseId: horseId,
            newName: newName,
        });
        return { ok: true };
    },
    registerHorseName: function (name) {
        var lower = name.toLowerCase();
        set(function (s) { return ({
            usedHorseNames: s.usedHorseNames.includes(lower)
                ? s.usedHorseNames
                : __spreadArray(__spreadArray([], s.usedHorseNames, true), [lower], false),
        }); });
    },
    unregisterHorseName: function (name) {
        var lower = name.toLowerCase();
        set(function (s) { return ({
            usedHorseNames: s.usedHorseNames.filter(function (n) { return n !== lower; }),
        }); });
    },
}); };
exports.createHorseAdminSlice = createHorseAdminSlice;
