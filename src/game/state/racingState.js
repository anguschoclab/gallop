"use strict";
/**
 * state/racingState.ts - Racing state management
 *
 * This file provides racing analytics state for performance tracking, including
 * pace samples, calibrated par times, last calibration day, and training usage
 * per horse.
 *
 * Dependencies: None (self-contained types)
 * Related files: store.ts (uses racing state), training.ts (uses training tracking)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultRacingState = createDefaultRacingState;
/**
 * Create default racing state for new games.
 *
 * @returns Default racing state with empty training usage
 */
function createDefaultRacingState() {
    return {
        trainingUsed: {},
    };
}
