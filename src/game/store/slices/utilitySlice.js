"use strict";
/**
 * store/slices/utilitySlice.ts - Utility state slice
 *
 * This file provides utility state management functions for NPC stables,
 * user settings, expenses, transactions, replays, reputation, and player profile.
 *
 * Dependencies: @/game/types (Stable, PlayerProfile), @/core/reputation (ManagerReputation), @/game/state/systemsState (SystemsState), @/core/settings/settingsTypes (UserSettings), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice)
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUtilitySlice = void 0;
var saveManager_1 = require("@/services/saveManager");
var createUtilitySlice = function (set, get) { return ({
    setNpcStables: function (stables) {
        set({ npcStables: stables });
    },
    setUserSettings: function (settings) {
        set({ userSettings: settings });
    },
    setExpenses: function (expenses) {
        set({ expenses: expenses });
    },
    setTransactions: function (transactions) {
        set({ transactions: transactions });
    },
    setReplays: function (replays) {
        set({ replays: replays });
    },
    setReputation: function (reputation) {
        set({ reputation: reputation });
    },
    setPlayerProfile: function (profile) {
        set({ playerProfile: profile });
    },
    manualSave: function (slotId, name) { return __awaiter(void 0, void 0, void 0, function () {
        var state;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state = get();
                    return [4 /*yield*/, (0, saveManager_1.saveToSlot)(slotId, name, state, false)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    loadSlot: function (slotId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, saveManager_1.loadFromSlot)(slotId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
}); };
exports.createUtilitySlice = createUtilitySlice;
