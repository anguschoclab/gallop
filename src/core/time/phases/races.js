"use strict";
/**
 * phases/races.ts - Race generation and pruning phase
 *
 * This file provides the race generation and pruning phase that pre-populates
 * graded stakes on year transition and generates upcoming track races daily.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/store/helpers/market (generateUpcomingRaces, pruneOldRaces), @/game/raceSchedule (generateAnnualCalendar, getCurrentYear)
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
exports.racesPhase = void 0;
var market_1 = require("@/game/store/helpers/market");
var raceSchedule_1 = require("@/game/raceSchedule");
var uuid_1 = require("@/core/uuid");
/**
 * Phase: Race Generation and Pruning
 * On year transition: pre-populates all graded stakes for the new year via generateAnnualCalendar.
 * Every day: generates upcoming track races (7 days ahead) and prunes old non-graded races.
 */
exports.racesPhase = {
    name: "races",
    order: 60,
    execute: function (context) {
        var _a;
        var state = context.state, previousDay = context.previousDay, newDay = context.newDay, dailyRng = context.dailyRng;
        var prevYear = (0, raceSchedule_1.getCurrentYear)(previousDay);
        var newYear = (0, raceSchedule_1.getCurrentYear)(newDay);
        var isYearTransition = newYear > prevYear;
        var races = state.races;
        if (isYearTransition) {
            races = (0, raceSchedule_1.generateAnnualCalendar)(newYear, races);
        }
        races = (0, market_1.generateUpcomingRaces)(races, newDay, dailyRng);
        var pruned = (0, market_1.pruneOldRaces)(races, newDay);
        // Push race deadline notifications for targeted races
        var newInboxMessages = __spreadArray([], ((_a = state.inbox) !== null && _a !== void 0 ? _a : []), true);
        if (state.campaigns) {
            var _loop_1 = function (campaign) {
                var _loop_2 = function (target) {
                    var race = pruned.find(function (r) { return r.key === target; });
                    if (race && race.day === newDay + 7) {
                        // Deadline is 7 days away
                        var horse = state.horses.find(function (h) { return h.id === campaign.horseId; });
                        newInboxMessages.push({
                            id: (0, uuid_1.generateUUID)(),
                            day: newDay,
                            category: "deadline",
                            priority: "action",
                            title: "Race Deadline: ".concat(race.name),
                            body: "The entry deadline for ".concat(race.name, " is in 7 days. ").concat((horse === null || horse === void 0 ? void 0 : horse.name) || "Your horse", " is targeted for this race."),
                            cta: {
                                label: "View Race",
                                route: "race.$raceId",
                                params: { raceId: race.id },
                            },
                        });
                    }
                };
                for (var _c = 0, _d = campaign.targetRaces; _c < _d.length; _c++) {
                    var target = _d[_c];
                    _loop_2(target);
                }
            };
            for (var _i = 0, _b = state.campaigns; _i < _b.length; _i++) {
                var campaign = _b[_i];
                _loop_1(campaign);
            }
        }
        return __assign(__assign({}, context), { state: __assign(__assign({}, state), { races: pruned, inbox: newInboxMessages }) });
    },
};
