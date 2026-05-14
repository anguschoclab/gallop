"use strict";
/**
 * store/slices/coreSlice.ts - Core game state slice
 *
 * This file provides the core game loop properties and essential state management,
 * including race entry/withdrawal, race tactics, race resolution, claiming,
 * and day advancement functions.
 *
 * Dependencies: immer (applyPatches), @/game/state/coreState (CoreState, createDefaultCoreState), @/game/types (Horse, Race, PlayerProfile), @/game/store (ActionResult), @/core/time/pipeline (executePipeline, PipelineContext), @/core/time/phases (GAME_PIPELINE_PHASES), @/game/rng (createRng, hashStr), @/game/raceSchedule (getCurrentYear), @/core/time/advance (computePlayerRaceDays), @/game/constants/gameConstants (UPKEEP_PER_HORSE, DAYS_PER_YEAR, DAYS_PER_MONTH, DAYS_PER_WEEK), ../guards (requireOwned, requireHorse), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/core/time/pipeline.ts (day advancement logic)
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.createCoreSlice = createCoreSlice;
/**
 * Core Slice
 * Core game loop properties and essential state management
 */
var immer_1 = require("immer");
var coreState_1 = require("@/game/state/coreState");
var pipeline_1 = require("@/core/time/pipeline");
var phases_1 = require("@/core/time/phases");
var rng_1 = require("@/game/rng");
var raceSchedule_1 = require("@/game/raceSchedule");
var advance_1 = require("@/core/time/advance");
var gameConstants_1 = require("@/game/constants/gameConstants");
var guards_1 = require("../guards");
var store_1 = require("@/game/store");
var uuid_1 = require("@/core/uuid");
/**
 * Create the core game state slice with all game loop actions.
 *
 * Provides race entry/withdrawal, race tactics, race resolution, claiming,
 * day advancement, and state setters. Uses intent-based state updates.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Core slice with state and actions
 */
function createCoreSlice(set, get, enqueueIntent) {
    var _this = this;
    /**
     * Helper to apply day advancement results to the store state.
     * This consolidates the state updates from both worker and synchronous paths.
     *
     * @param finalState - The final game state after pipeline processing
     * @param newLogs - New logs generated during the day advancement
     * @param playerUpkeep - The calculated upkeep cost for the player
     * @param newDay - The new day number
     */
    var applyDayResult = function (finalState, newLogs, playerUpkeep, newDay) {
        var s = get();
        // Keys that are managed via special logic instead of a direct copy from worker state
        var overrides = {
            day: newDay,
            pendingIntents: [],
            trainingUsed: {},
            log: __spreadArray(__spreadArray(__spreadArray([], newLogs, true), [
                { day: newDay, text: "Day ".concat(newDay, " begins. Upkeep: $").concat(playerUpkeep, ".") }
            ], false), s.log, true).slice(0, 1000), // Persist more history, but cap it
        };
        // Build the update by merging finalState and overrides
        var update = __assign(__assign({}, finalState), overrides);
        // Sync horseMap if horses changed
        if (finalState.horses) {
            update.horseMap = new Map(finalState.horses.map(function (h) { return [h.id, h]; }));
        }
        // Explicitly remove keys that shouldn't be in the store (e.g. worker-only metadata)
        delete update.lastFrameTime;
        delete update.isAdvancing;
        set(update);
    };
    return __assign(__assign({}, (0, coreState_1.createDefaultCoreState)()), { enqueueIntent: function (intent) {
            set(function (state) { return ({
                pendingIntents: __spreadArray(__spreadArray([], (state.pendingIntents || []), true), [intent], false),
            }); });
        }, enterRace: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return { ok: false, reason: "Race not found." };
            var horse = (0, guards_1.requireHorse)(s.horses, horseId);
            var ownershipGuard = (0, guards_1.requireOwned)(horse);
            if (ownershipGuard)
                return ownershipGuard;
            if (horse.energy < 50)
                return { ok: false, reason: "Horse lacks sufficient energy." };
            if (race.entries.some(function (e) { return e.horseId === horseId; }))
                return { ok: false, reason: "Horse already entered." };
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
        }, setRaceTactics: function (raceId, horseId, tactics) {
            var s = get();
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "tactics",
                raceId: raceId,
                horseId: horseId,
                tactics: tactics,
            });
        }, withdrawRace: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return { ok: false, reason: "Race not found." };
            var entry = race.entries.find(function (e) { return e.horseId === horseId; });
            if (!entry)
                return { ok: false, reason: "Horse not entered in this race." };
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
            return { ok: true };
        }, resolveRaceWithImpacts: function (raceId, result) {
            var s = get();
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: raceId,
                source: "system",
                day: s.day,
                priority: 10,
                type: "race_resolution",
                raceId: raceId,
                results: result,
            });
        }, submitClaim: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return { ok: false, reason: "Race not found." };
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse)
                return { ok: false, reason: "Horse not found." };
            if (horse.owned)
                return { ok: false, reason: "Cannot claim your own horse." };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "claiming",
                raceId: raceId,
                horseId: horseId,
                claimingPrice: race.claimingPrice || 0,
            });
            return { ok: true };
        }, withdrawClaim: function (raceId, horseId) {
            var s = get();
            var race = s.races.find(function (r) { return r.id === raceId; });
            if (!race)
                return { ok: false, reason: "Race not found." };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "withdraw_from_claiming",
                raceId: raceId,
                horseId: horseId,
            });
            return { ok: true };
        }, advanceDay: function (progressCallback) { return __awaiter(_this, void 0, void 0, function () {
            var s, newDay, currentYear, previousYear, horses, playerHorseCount, playerUpkeep, engineWorker, result, patches, newLogs, finalState, error_1, pipelineContext, updatedContext, finalState, newLogs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        s = get();
                        newDay = s.day + 1;
                        currentYear = (0, raceSchedule_1.getCurrentYear)(newDay);
                        previousYear = (0, raceSchedule_1.getCurrentYear)(s.day);
                        horses = s.horses;
                        if (currentYear > previousYear) {
                            horses = horses.map(function (h) {
                                if (h.winAndYouInQualified) {
                                    h.winAndYouInQualified = h.winAndYouInQualified.filter(function (q) { return q.year >= currentYear; });
                                }
                                return h;
                            });
                        }
                        playerHorseCount = horses.filter(function (h) { return !h.stableId; }).length;
                        playerUpkeep = playerHorseCount * gameConstants_1.UPKEEP_PER_HORSE;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        engineWorker = (0, store_1.getEngineWorker)();
                        return [4 /*yield*/, engineWorker.advanceDay({
                                state: __assign(__assign({}, s), { horses: horses }),
                                newDay: newDay,
                                progressCallback: progressCallback,
                            })];
                    case 2:
                        result = _a.sent();
                        patches = result.patches, newLogs = result.logs;
                        finalState = (0, immer_1.applyPatches)(s, patches);
                        applyDayResult(finalState, newLogs, playerUpkeep, newDay);
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        // Fallback: Worker not available (SSR context), use synchronous pipeline
                        if (!(error_1 instanceof Error && error_1.message.includes("Worker not available"))) {
                            // Only log if it's NOT just a missing worker
                            console.warn("Worker not available or failed to clone state, using synchronous pipeline execution");
                        }
                        pipelineContext = {
                            previousDay: s.day,
                            newDay: newDay,
                            state: __assign(__assign({}, s), { horses: horses, npcAIManager: s.npcAIManager
                                    ? __assign(__assign({}, s.npcAIManager), { stableStates: __assign({}, s.npcAIManager.stableStates) }) : undefined }),
                            logs: [],
                            dailyRng: (0, rng_1.createRng)((0, rng_1.hashStr)("daily_" + newDay)),
                            // Intent/impact resolver fields
                            intents: s.pendingIntents || [],
                            impacts: [],
                            impactLog: [],
                        };
                        updatedContext = (0, pipeline_1.executePipeline)(phases_1.GAME_PIPELINE_PHASES, pipelineContext);
                        finalState = updatedContext.state, newLogs = updatedContext.logs;
                        applyDayResult(finalState, newLogs, playerUpkeep, newDay);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); }, advanceMultipleDays: function (n, headless) { return __awaiter(_this, void 0, void 0, function () {
            var s, playerRaceDays, batchSize, _loop_1, i, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        s = get();
                        playerRaceDays = (0, advance_1.computePlayerRaceDays)(s.races, s.day + 1, s.day + n);
                        batchSize = 5;
                        _loop_1 = function (i) {
                            var currentS, nextDay, playerRace;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        currentS = get();
                                        nextDay = currentS.day + 1;
                                        // O(1) lookup instead of O(n) array.find
                                        if (playerRaceDays.has(nextDay) && !headless) {
                                            playerRace = currentS.races.find(function (r) { return !r.resolved && r.day === nextDay && r.entries.some(function (e) { return e.owned; }); });
                                            if (playerRace) {
                                                set({ pendingPlayerRaceId: playerRace.id });
                                                return [2 /*return*/, { value: void 0 }];
                                            }
                                        }
                                        return [4 /*yield*/, get().advanceDay()];
                                    case 1:
                                        _b.sent();
                                        if (!(i % batchSize === 0 && i > 0)) return [3 /*break*/, 3];
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 0); })];
                                    case 2:
                                        _b.sent();
                                        _b.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        };
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < n)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(i)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        }); }, advanceWeek: function (headless) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, get().advanceMultipleDays(gameConstants_1.DAYS_PER_WEEK, headless)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, advanceMonth: function (headless) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, get().advanceMultipleDays(gameConstants_1.DAYS_PER_MONTH, headless)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, advanceYear: function (headless) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, get().advanceMultipleDays(gameConstants_1.DAYS_PER_YEAR, headless)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, setDay: function (day) {
            set({ day: day });
        }, setCash: function (cash) {
            set({ cash: cash });
        }, setHorses: function (horses) {
            set({
                horses: horses,
                horseMap: new Map(horses.map(function (h) { return [h.id, h]; })),
            });
        }, setRaces: function (races) {
            set({ races: races });
        }, setLog: function (log) {
            set({ log: log });
        }, setPlayerProfile: function (profile) {
            set({ playerProfile: profile });
        }, addLogEntry: function (entry) {
            set(function (state) { return ({
                log: __spreadArray([entry], state.log, true).slice(0, 500),
            }); });
        } });
}
