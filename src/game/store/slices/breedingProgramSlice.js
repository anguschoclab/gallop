"use strict";
/**
 * store/slices/breedingProgramSlice.ts - Breeding program management slice
 *
 * Manages the player's single active multi-generation breeding program plus the
 * historical breedingPrograms list. Exposes the actions consumed by
 * BreedingProgramPanel: startBreedingProgram, cancelBreedingProgram,
 * enrollDamInProgram, unenrollDamFromProgram, plus low-level CRUD helpers.
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
exports.createBreedingProgramSlice = void 0;
var programs_1 = require("@/core/breeding/programs");
var createBreedingProgramSlice = function (set, get) { return ({
    startBreedingProgram: function (archetypeId) {
        var _a, _b, _c;
        var state = get();
        if (state.activeBreedingProgram) {
            return { ok: false, reason: "A breeding program is already active. Cancel it first." };
        }
        var stableId = (_b = (_a = state.stable) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "player";
        var day = (_c = state.currentDay) !== null && _c !== void 0 ? _c : 0;
        var program = (0, programs_1.createBreedingProgram)(stableId, archetypeId, day);
        set(function (s) {
            var _a;
            return ({
                activeBreedingProgram: program,
                breedingPrograms: __spreadArray(__spreadArray([], ((_a = s.breedingPrograms) !== null && _a !== void 0 ? _a : []), true), [program], false),
            });
        });
        return { ok: true };
    },
    cancelBreedingProgram: function () {
        set({ activeBreedingProgram: null });
    },
    enrollDamInProgram: function (damId) {
        var state = get();
        var program = state.activeBreedingProgram;
        if (!program)
            return { ok: false, reason: "No active breeding program." };
        if (program.enrolledDamIds.includes(damId)) {
            return { ok: false, reason: "Mare is already enrolled in this program." };
        }
        var updated = __assign(__assign({}, program), { enrolledDamIds: __spreadArray(__spreadArray([], program.enrolledDamIds, true), [damId], false) });
        set(function (s) {
            var _a;
            return ({
                activeBreedingProgram: updated,
                breedingPrograms: ((_a = s.breedingPrograms) !== null && _a !== void 0 ? _a : []).map(function (p) {
                    return p.id === updated.id ? updated : p;
                }),
            });
        });
        return { ok: true };
    },
    unenrollDamFromProgram: function (damId) {
        set(function (s) {
            var _a;
            var program = s.activeBreedingProgram;
            if (!program)
                return {};
            var updated = __assign(__assign({}, program), { enrolledDamIds: program.enrolledDamIds.filter(function (id) { return id !== damId; }) });
            return {
                activeBreedingProgram: updated,
                breedingPrograms: ((_a = s.breedingPrograms) !== null && _a !== void 0 ? _a : []).map(function (p) {
                    return p.id === updated.id ? updated : p;
                }),
            };
        });
    },
    createBreedingProgram: function (program) {
        set(function (s) {
            var _a;
            return ({
                breedingPrograms: __spreadArray(__spreadArray([], ((_a = s.breedingPrograms) !== null && _a !== void 0 ? _a : []), true), [program], false),
            });
        });
    },
    updateBreedingProgram: function (program) {
        set(function (s) {
            var _a, _b;
            return ({
                breedingPrograms: ((_a = s.breedingPrograms) !== null && _a !== void 0 ? _a : []).map(function (p) {
                    return p.id === program.id ? program : p;
                }),
                activeBreedingProgram: ((_b = s.activeBreedingProgram) === null || _b === void 0 ? void 0 : _b.id) === program.id ? program : s.activeBreedingProgram,
            });
        });
    },
    deleteBreedingProgram: function (programId) {
        set(function (s) {
            var _a, _b;
            return ({
                breedingPrograms: ((_a = s.breedingPrograms) !== null && _a !== void 0 ? _a : []).filter(function (p) { return p.id !== programId; }),
                activeBreedingProgram: ((_b = s.activeBreedingProgram) === null || _b === void 0 ? void 0 : _b.id) === programId ? null : s.activeBreedingProgram,
            });
        });
    },
}); };
exports.createBreedingProgramSlice = createBreedingProgramSlice;
