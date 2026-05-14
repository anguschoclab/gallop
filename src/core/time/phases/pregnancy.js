"use strict";
/**
 * phases/pregnancy.ts - Pregnancy resolution phase
 *
 * This file provides the pregnancy resolution phase that resolves pregnancies
 * and handles foaling events, including AI outcome recording for NPCs.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/types (Horse, Pregnancy), @/core/breeding/lineage (getFoalsBy), @/game/store/helpers/pregnancy (resolvePregnancies), @/core/reputation (createReputationEvent, calculateBreedingReputation, getReputationTier), @/core/ai/npcCycleAI (getOrCreateStableAIState), @/core/ai/breedingAI (recordBreedingOutcome), @/core/horse/stats (calculateOverallRating)
 * Related files: ../pipeline.ts (uses phase)
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
exports.pregnancyPhase = void 0;
var pregnancy_1 = require("@/game/store/helpers/pregnancy");
var uuid_1 = require("@/core/uuid");
var reputation_1 = require("@/core/reputation");
var npcCycleAI_1 = require("@/core/ai/npcCycleAI");
var breedingAI_1 = require("@/core/ai/breedingAI");
var stats_1 = require("@/core/horse/stats");
/**
 * Phase: Pregnancy Resolution
 * Resolve pregnancies and handle foaling events
 */
exports.pregnancyPhase = {
    name: "pregnancy",
    order: 70,
    execute: function (context) {
        var _a, _b, _c, _d;
        var state = context.state, newDay = context.newDay;
        var usedNamesSet = new Set(state.usedHorseNames);
        var pregResult = (0, pregnancy_1.resolvePregnancies)(state.pregnancies, state.horses, state.npcStables, usedNamesSet, newDay, { horses: state.horses });
        var pregnancies = pregResult.pregnancies, foals = pregResult.foals, cashAdjustment = pregResult.cashAdjustment;
        // Record breeding outcomes for NPC AI
        if (state.npcAIManager) {
            var _loop_1 = function (foal) {
                var pregnancy = pregnancies.find(function (p) { return p.foalId === foal.id; });
                if (pregnancy) {
                    // If sire is NPC-owned, record outcome for that stable's AI
                    var sire_1 = state.horses.find(function (h) { return h.id === pregnancy.sireId; });
                    if (sire_1 && sire_1.stableId) {
                        var stable = state.npcStables.find(function (s) { return s.id === sire_1.stableId; });
                        if (stable) {
                            var stableAI = (0, npcCycleAI_1.getOrCreateStableAIState)(state.npcAIManager, stable, newDay);
                            if (stableAI.breedingAI) {
                                var foalRating = (0, stats_1.calculateOverallRating)(foal);
                                stableAI.breedingAI = (0, breedingAI_1.recordBreedingOutcome)(stableAI.breedingAI, pregnancy.sireId, pregnancy.damId, foal.id, foalRating, true, // Successful foaling
                                newDay);
                                state.npcAIManager.stableStates[stable.id] = stableAI;
                            }
                        }
                    }
                }
            };
            for (var _i = 0, foals_1 = foals; _i < foals_1.length; _i++) {
                var foal = foals_1[_i];
                _loop_1(foal);
            }
        }
        // Add reputation events for player-owned foals born
        var newReputationEvents = (_b = (_a = state.reputation) === null || _a === void 0 ? void 0 : _a.events) !== null && _b !== void 0 ? _b : [];
        var newInboxMessages = __spreadArray([], ((_c = state.inbox) !== null && _c !== void 0 ? _c : []), true);
        var _loop_2 = function (foal) {
            // Find the pregnancy that produced this foal
            var pregnancy = pregnancies.find(function (p) { return p.foalId === foal.id; });
            if (pregnancy) {
                var dam = state.horses.find(function (h) { return h.id === pregnancy.damId; });
                // Only add reputation/inbox for player-owned dams
                if (dam && !dam.stableId) {
                    var foalQuality = foal.potential;
                    var reputationAmount = (0, reputation_1.calculateBreedingReputation)(foalQuality);
                    var reputationEvent = (0, reputation_1.createReputationEvent)("breeding_success", reputationAmount, "Foal born: ".concat(foal.name, " (potential ").concat(foalQuality, ")"), newDay, { horseId: foal.id });
                    newReputationEvents.push(reputationEvent);
                    // Push to Inbox
                    newInboxMessages.push({
                        id: (0, uuid_1.generateUUID)(),
                        day: newDay,
                        category: "foaling",
                        priority: "info",
                        title: "New Arrival: ".concat(foal.name),
                        body: "A healthy ".concat(foal.sex === "f" ? "filly" : "colt", " by ").concat(((_d = state.horses.find(function (h) { return h.id === pregnancy.sireId; })) === null || _d === void 0 ? void 0 : _d.name) || "Unknown", " out of ").concat(dam.name, " was born today."),
                        cta: {
                            label: "View Foal",
                            route: "stable.$horseId",
                            params: { horseId: foal.id },
                        },
                    });
                }
            }
        };
        for (var _e = 0, foals_2 = foals; _e < foals_2.length; _e++) {
            var foal = foals_2[_e];
            _loop_2(foal);
        }
        return __assign(__assign({}, context), { state: __assign(__assign({}, state), { horses: __spreadArray(__spreadArray([], state.horses, true), foals, true), pregnancies: pregnancies, cash: state.cash + cashAdjustment, usedHorseNames: Array.from(usedNamesSet), inbox: newInboxMessages, reputation: state.reputation
                    ? __assign(__assign({}, state.reputation), { events: newReputationEvents, score: state.reputation.score + newReputationEvents.reduce(function (sum, e) { return sum + e.amount; }, 0), tier: (0, reputation_1.getReputationTier)(state.reputation.score + newReputationEvents.reduce(function (sum, e) { return sum + e.amount; }, 0)) }) : state.reputation }), logs: __spreadArray(__spreadArray([], context.logs, true), pregResult.logs, true) });
    },
};
