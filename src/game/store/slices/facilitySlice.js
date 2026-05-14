"use strict";
/**
 * store/slices/facilitySlice.ts - Facility management slice
 *
 * This file provides facility-related state and actions for upgrading and managing
 * player facilities.
 *
 * Dependencies: @/core/facilities (PlayerFacilities), @/lib/formatting (formatCurrency), @/game/uuid (generateUUID), ../types (ActionResult, GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/core/facilities/facilityDefaults.ts (facility defaults)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFacilitySlice = void 0;
var formatting_1 = require("@/lib/formatting");
var uuid_1 = require("@/core/uuid");
var facilities_1 = require("@/core/facilities");
var createFacilitySlice = function (set, get) { return ({
    upgradeFacility: function (facilityType) {
        var s = get();
        if (!s.facilities)
            return { ok: false, reason: "Facilities not initialized." };
        var facility = s.facilities[facilityType];
        if (!facility)
            return { ok: false, reason: "Facility not found." };
        if (facility.level === "elite")
            return { ok: false, reason: "Facility already at maximum level." };
        var cost = (0, facilities_1.facilityUpgradeCost)(facility.level);
        if (s.cash < cost)
            return {
                ok: false,
                reason: "Insufficient cash. Upgrade costs ".concat((0, formatting_1.formatCurrency)(cost), "."),
            };
        var levelOrder = [
            "basic",
            "standard",
            "premium",
            "elite",
        ];
        var nextLevelIndex = levelOrder.indexOf(facility.level) + 1;
        var nextLevel = levelOrder[nextLevelIndex];
        get().enqueueIntent({
            id: (0, uuid_1.generateUUID)(),
            entityId: facilityType,
            source: "player",
            day: s.day,
            priority: 100,
            type: "facility_upgrade",
            facilityId: facilityType,
            nextLevel: nextLevel,
            cost: cost,
        });
        return { ok: true };
    },
    setFacilities: function (facilities) {
        set({ facilities: facilities });
    },
}); };
exports.createFacilitySlice = createFacilitySlice;
