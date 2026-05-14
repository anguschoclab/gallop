"use strict";
/**
 * store/slices/racingSlice.ts - Racing state slice
 *
 * This file provides racing-related state and actions for training and performance
 * analytics, including horse training, pace samples, calibrated pars, and training
 * usage tracking.
 *
 * Dependencies: @/game/types (Horse), @/game/state/racingState (RacingState, createDefaultRacingState), @/core/resolver/intents (TrainingIntent, AnyIntent), @/game/uuid (generateUUID), @/game/constants/gameConstants (TRAINING_COST), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/beyer.ts (Beyer calculation)
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
exports.createRacingSlice = createRacingSlice;
var racingState_1 = require("@/game/state/racingState");
var uuid_1 = require("@/core/uuid");
var gameConstants_1 = require("@/game/constants/gameConstants");
var TRAINING_SLOTS_PER_DAY = 2;
/**
 * Create the racing state slice with training and performance analytics actions.
 *
 * Provides horse training, pace samples, calibrated pars, and training usage tracking.
 * Uses intent-based state updates for training actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Racing slice with state and actions
 */
function createRacingSlice(set, get, enqueueIntent) {
    return __assign(__assign({}, (0, racingState_1.createDefaultRacingState)()), { trainHorse: function (horseId, kind) {
            var _a;
            var s = get();
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse)
                return;
            if (!horse.owned)
                return;
            if (s.pregnancies.some(function (p) { return !p.resolved && p.damId === horseId; }))
                return;
            // Check if horse has covering sickness or is recovering - prevent training
            if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering") {
                set({
                    log: __spreadArray([
                        {
                            day: s.day,
                            text: "Training blocked: ".concat(horse.name, " is ").concat(horse.healthStatus === "covering_sickness" ? "sick with covering sickness (dourine)" : "recovering from illness", ". Horse cannot be trained while recovering."),
                        }
                    ], s.log, true).slice(0, 50),
                });
                return;
            }
            var usedToday = s.trainingUsed[horseId] || 0;
            if (usedToday >= TRAINING_SLOTS_PER_DAY)
                return;
            if (horse.energy < 10)
                return;
            var isRest = kind === "rest";
            if (!isRest && s.cash < gameConstants_1.TRAINING_COST)
                return;
            if (!isRest && horse.energy < 15)
                return;
            // Enqueue TrainingIntent for next day advance
            var intent = {
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "training",
                horseId: horseId,
                trainingType: kind,
            };
            enqueueIntent(intent);
            set({
                trainingUsed: __assign(__assign({}, s.trainingUsed), (_a = {}, _a[horseId] = usedToday + 1, _a)),
            });
        }, setTrainingUsed: function (horseId, count) {
            set(function (state) {
                var _a;
                return ({
                    trainingUsed: __assign(__assign({}, state.trainingUsed), (_a = {}, _a[horseId] = count, _a)),
                });
            });
        }, resetTrainingUsed: function () {
            set({ trainingUsed: {} });
        }, setPaceSamples: function (samples) {
            set({ paceSamples: samples });
        }, setCalibratedPars: function (pars) {
            set({ calibratedPars: pars });
        }, setLastCalibrationDay: function (day) {
            set({ lastCalibrationDay: day });
        } });
}
