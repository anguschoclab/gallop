"use strict";
/**
 * store/slices/marketSlice.ts - Market state slice
 *
 * This file provides market-related state and actions for direct horse purchasing
 * from the open market.
 *
 * Dependencies: @/game/types (Horse), @/game/state/marketState (MarketState, createDefaultMarketState), @/core/horse/pricing (horsePrice), @/game/uuid (generateUUID), ../types (StoreGet)
 * Related files: store/index.ts (uses this slice)
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMarketSlice = createMarketSlice;
var marketState_1 = require("@/game/state/marketState");
var pricing_1 = require("@/core/horse/pricing");
var uuid_1 = require("@/core/uuid");
/**
 * Create the market state slice with horse purchasing actions.
 *
 * Provides direct horse purchasing from the open market and market state management.
 * Uses intent-based state updates for purchases.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Market slice with state and actions
 */
function createMarketSlice(set, get, enqueueIntent) {
    return __assign(__assign({}, (0, marketState_1.createDefaultMarketState)()), { buyHorse: function (horseId) {
            var s = get();
            var h = s.market.find(function (m) { return m.id === horseId; });
            if (!h)
                return;
            var price = (0, pricing_1.horsePrice)(h);
            if (s.cash < price)
                return;
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "purchase",
                horseId: horseId,
                price: price,
            });
        }, setMarket: function (market) {
            set({ market: market });
        } });
}
