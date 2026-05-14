"use strict";
/**
 * store/slices/scoutingSlice.ts - Scouting state slice
 *
 * This file provides scouting-related actions for evaluating horses in NPC stables.
 *
 * Dependencies: @/game/types (Horse, ScoutReport, Stable), @/game/scouting (scoutHorse, calculateScoutCost), @/game/uuid (generateUUID), @/lib/formatting (formatCurrency), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/scouting.ts (scouting logic)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScoutingSlice = createScoutingSlice;
var scouting_1 = require("@/game/scouting");
var uuid_1 = require("@/core/uuid");
var formatting_1 = require("@/lib/formatting");
/**
 * Create the scouting state slice with horse evaluation actions.
 *
 * Provides scouting actions for evaluating horses in NPC stables and scout report management.
 * Uses intent-based state updates for scouting actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Scouting slice with actions
 */
function createScoutingSlice(set, get, enqueueIntent) {
    return {
        scoutHorse: function (horseId) {
            var s = get();
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse) {
                return { success: false, cost: 0, message: "Horse not found." };
            }
            if (!horse.stableId) {
                return { success: false, cost: 0, message: "Cannot scout your own horses." };
            }
            var stable = s.npcStables.find(function (st) { return st.id === horse.stableId; });
            if (!stable) {
                return { success: false, cost: 0, message: "Stable not found." };
            }
            var cost = (0, scouting_1.calculateScoutCost)(horse, stable);
            if (s.cash < cost) {
                return {
                    success: false,
                    cost: 0,
                    message: "Insufficient funds. Scouting costs ".concat((0, formatting_1.formatCurrency)(cost), "."),
                };
            }
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "scout",
                horseId: horseId,
                stableId: horse.stableId,
            });
            return {
                success: true,
                cost: cost,
                message: "Scout dispatched to examine ".concat(horse.name, ". Report ready tomorrow."),
            };
        },
        setScoutReports: function (reports) {
            set({ scoutReports: reports });
        },
    };
}
