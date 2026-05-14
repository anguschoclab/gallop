"use strict";
/**
 * store/slices/auctionSlice.ts - Auction state slice
 *
 * This file provides auction-related state management, including consignment,
 * bidding, and result processing.
 *
 * Dependencies: @/game/types (Horse, AuctionSale, AuctionLot), @/core/horse/pricing (horsePriceWithPedigree), @/game/uuid (generateUUID), @/game/auction (DEFAULT_PLAYER_RESERVE_RATIO), @/lib/formatting (formatCurrency), ../types (StoreGet), ../guards (requireHorse, requireOwned)
 * Related files: store/index.ts (uses this slice), @/game/auction.ts (auction logic)
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
exports.createAuctionSlice = createAuctionSlice;
var pricing_1 = require("@/core/horse/pricing");
var uuid_1 = require("@/core/uuid");
var auction_1 = require("@/game/auction");
var formatting_1 = require("@/lib/formatting");
var guards_1 = require("../guards");
/**
 * Create the auction state slice with consignment, bidding, and result processing actions.
 *
 * Provides horse consignment to sales, consignment withdrawal, book bidding, live bid
 * debiting, auction result commitment, and buy-now functionality. Uses intent-based
 * state updates for auction actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @param enqueueIntent - Function to enqueue intents for processing
 * @returns Auction slice with actions
 */
function createAuctionSlice(set, get, enqueueIntent) {
    return {
        consignHorse: function (horseId, saleId, reservePrice) {
            var _a;
            var s = get();
            var horse = (0, guards_1.requireHorse)(s.horses, horseId);
            var ownershipGuard = (0, guards_1.requireOwned)(horse);
            if (ownershipGuard)
                return ownershipGuard;
            if (horse.consignedSaleId)
                return { ok: false, reason: "Already consigned to a sale." };
            var sale = ((_a = s.auctions) !== null && _a !== void 0 ? _a : []).find(function (a) { return a.id === saleId; });
            if (!sale)
                return { ok: false, reason: "Sale not found." };
            if (sale.resolved)
                return { ok: false, reason: "Sale already resolved." };
            var baseValue = (0, pricing_1.horsePriceWithPedigree)(horse, s.horses);
            var finalReserve = Math.round(reservePrice !== null && reservePrice !== void 0 ? reservePrice : baseValue * auction_1.DEFAULT_PLAYER_RESERVE_RATIO);
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "consignment",
                horseId: horseId,
                saleId: saleId,
                reservePrice: finalReserve,
            });
            return { ok: true };
        },
        withdrawConsignment: function (horseId) {
            var _a;
            var s = get();
            var horse = s.horses.find(function (h) { return h.id === horseId; });
            if (!horse)
                return { ok: false, reason: "Horse not found." };
            if (!horse.consignedSaleId)
                return { ok: false, reason: "Horse not consigned." };
            var sale = ((_a = s.auctions) !== null && _a !== void 0 ? _a : []).find(function (a) { return a.id === horse.consignedSaleId; });
            if (!sale)
                return { ok: false, reason: "Sale not found." };
            if (sale.resolved)
                return { ok: false, reason: "Sale already resolved." };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "consignment_withdrawal",
                horseId: horseId,
                saleId: horse.consignedSaleId,
            });
            return { ok: true };
        },
        placeBookBid: function (saleId, lotId, amount) {
            var _a, _b;
            var s = get();
            var sale = ((_a = s.auctions) !== null && _a !== void 0 ? _a : []).find(function (a) { return a.id === saleId; });
            if (!sale)
                return { ok: false, reason: "Sale not found." };
            if (sale.resolved)
                return { ok: false, reason: "Sale already resolved." };
            var lot = sale.lots.find(function (l) { return l.id === lotId; });
            if (!lot)
                return { ok: false, reason: "Lot not found." };
            if (lot.withdrawn || lot.passed)
                return { ok: false, reason: "Lot not available." };
            if (s.cash < amount)
                return { ok: false, reason: "Insufficient funds." };
            set({
                cash: s.cash - amount,
                auctions: ((_b = s.auctions) !== null && _b !== void 0 ? _b : []).map(function (a) {
                    return a.id === saleId
                        ? __assign(__assign({}, a), { lots: a.lots.map(function (l) {
                                return l.id === lotId
                                    ? __assign(__assign({}, l), { bidHistory: __spreadArray(__spreadArray([], (l.bidHistory || []), true), [
                                            { bidderId: "player", amount: amount, day: s.day },
                                        ], false) }) : l;
                            }) }) : a;
                }),
                log: __spreadArray([
                    {
                        day: s.day,
                        text: "Book bid of ".concat((0, formatting_1.formatCurrency)(amount), " placed on lot ").concat(lotId, " in ").concat(sale.name, "."),
                    }
                ], s.log, true).slice(0, 50),
            });
            return { ok: true };
        },
        debitForLiveBid: function (amount) {
            var s = get();
            if (s.cash < amount)
                return { ok: false, reason: "Insufficient funds." };
            set({ cash: s.cash - amount });
            return { ok: true };
        },
        commitAuctionResult: function (saleId, finalLots, impacts) {
            var _a, _b;
            var s = get();
            var sale = ((_a = s.auctions) !== null && _a !== void 0 ? _a : []).find(function (a) { return a.id === saleId; });
            if (!sale)
                return { ok: false, reason: "Sale not found." };
            set({
                auctions: ((_b = s.auctions) !== null && _b !== void 0 ? _b : []).map(function (a) {
                    return a.id === saleId
                        ? __assign(__assign({}, a), { resolved: true, lots: a.lots.map(function (l) {
                                var finalLot = finalLots.find(function (fl) { return fl.id === l.id; });
                                if (!finalLot)
                                    return l;
                                return __assign(__assign({}, l), finalLot);
                            }) }) : a;
                }),
                log: __spreadArray([
                    {
                        day: s.day,
                        text: "Auction ".concat(sale.name, " resolved."),
                    }
                ], s.log, true).slice(0, 50),
            });
            return { ok: true };
        },
        buyNow: function (saleId, lotId) {
            var _a;
            var s = get();
            var sale = ((_a = s.auctions) !== null && _a !== void 0 ? _a : []).find(function (a) { return a.id === saleId; });
            if (!sale)
                return { ok: false, reason: "sale_not_found" };
            if (sale.resolved)
                return { ok: false, reason: "sale_resolved" };
            if (sale.kind === "broodmare")
                return { ok: false, reason: "buy_now_unavailable" };
            var lot = sale.lots.find(function (l) { return l.id === lotId; });
            if (!lot)
                return { ok: false, reason: "lot_not_found" };
            if (lot.buyNowPrice === undefined)
                return { ok: false, reason: "buy_now_unavailable" };
            var buyNowPrice = lot.buyNowPrice;
            if (s.cash < buyNowPrice)
                return { ok: false, reason: "insufficient_funds" };
            if (lot.withdrawn || lot.passed || lot.hammerPrice !== undefined)
                return { ok: false, reason: "lot_not_available" };
            enqueueIntent({
                id: (0, uuid_1.generateUUID)(),
                entityId: lot.horseId,
                source: "player",
                day: s.day,
                priority: 100,
                type: "purchase",
                horseId: lot.horseId,
                price: buyNowPrice,
            });
            return { ok: true };
        },
        setAuctions: function (auctions) {
            set({ auctions: auctions });
        },
    };
}
