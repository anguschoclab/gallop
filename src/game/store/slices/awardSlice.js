"use strict";
/**
 * store/slices/awardSlice.ts - Award management slice
 *
 * This file provides award-related state management for regional awards and
 * award ceremonies.
 *
 * Dependencies: @/game/awards/types (RegionalAward), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/game/awards/scoring.ts (award scoring logic)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAwardSlice = void 0;
var createAwardSlice = function (set) { return ({
    clearPendingCeremonies: function () {
        set({
            pendingAwardCeremonies: undefined,
            currentCeremonyIndex: undefined,
        });
    },
    setAwards: function (awards) {
        set({ awards: awards });
    },
}); };
exports.createAwardSlice = createAwardSlice;
