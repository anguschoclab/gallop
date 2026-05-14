"use strict";
/**
 * store/slices/campaignSlice.ts - Campaign state slice
 *
 * This file provides campaign planning and management state, including campaign
 * creation, slot management, flag dismissal, campaign deletion, auto-campaign
 * generation, and Triple Crown history tracking.
 *
 * Dependencies: @/game/types (HorseCampaign, TripleCrownProgress), @/core/resolver/intents (AnyIntent), @/game/uuid (generateUUID), ../types (StoreSet, StoreGet)
 * Related files: store/index.ts (uses this slice), @/game/campaignPlanner.ts (campaign planning logic)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCampaignSlice = createCampaignSlice;
var uuid_1 = require("@/core/uuid");
/**
 * Create the campaign state slice with campaign planning and management actions.
 *
 * Provides campaign creation, slot management, flag dismissal, campaign deletion,
 * auto-campaign generation, and Triple Crown history tracking. Uses intent-based
 * state updates for campaign actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Campaign slice with state and actions
 */
function createCampaignSlice(set, get, enqueueIntent) {
    return {
        campaigns: [],
        triplecrownHistory: [],
        setCampaign: function (campaign) {
            var s = get();
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: campaign.horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "campaign_creation",
                horseId: campaign.horseId,
                goalType: campaign.goalType,
                targetRaceKey: campaign.targetRaceKey,
            });
        },
        updateCampaignSlot: function (horseId, slotIndex, patch) {
            var s = get();
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "campaign_slot",
                horseId: horseId,
                slotIndex: slotIndex,
                slot: patch,
            });
        },
        dismissCampaignFlag: function (horseId, flagIndex) {
            var _a;
            var s = get();
            var campaign = (_a = s.campaigns) === null || _a === void 0 ? void 0 : _a.find(function (c) { return c.horseId === horseId; });
            if (!campaign)
                return;
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "campaign_flag_dismissal",
                horseId: horseId,
                flagIndex: flagIndex,
            });
        },
        deleteCampaign: function (horseId) {
            var s = get();
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "campaign_deletion",
                horseId: horseId,
            });
        },
        generateAutoCampaign: function (horseId, goalType, targetRaceKey) {
            var s = get();
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "campaign_creation",
                horseId: horseId,
                goalType: goalType,
                targetRaceKey: targetRaceKey,
            });
        },
        setCampaigns: function (campaigns) {
            set({ campaigns: campaigns });
        },
        setTriplecrownHistory: function (history) {
            set({ triplecrownHistory: history });
        },
    };
}
