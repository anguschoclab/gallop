"use strict";
/**
 * auctionRunner.ts - Deterministic auction simulation runner
 *
 * This file provides a deterministic, lot-by-lot auction simulation that powers
 * both the live AuctionTheater UI and the day-rollover phase, producing the same
 * final outcomes regardless of which path runs.
 *
 * Dependencies: ./uuid (generateUUID), ./types (AuctionSale, AuctionLot, Horse, Stable, AuctionBidRecord), ./auction (calculateNpcBid, netProceeds), ./rng (createRng, hashStr, Rng), @/core/resolver/impacts/index (AnyImpact), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: auction.ts (valuation logic), auctionData.ts (sale configuration)
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
exports.nextBidAmount = nextBidAmount;
exports.createAuctionRunner = createAuctionRunner;
// Deterministic, lot-by-lot auction simulation.
//
// Powers two paths from a single source of truth:
//   1. The live AuctionTheater UI — calls `step()` on a paced timer; the
//      player can interject bids between steps.
//   2. The day-rollover phase — calls `runToCompletion()` to produce the
//      same final outcomes when the player skips the sale.
//
// Same seeded RNG → same final lots, regardless of which path runs.
var uuid_1 = require("@/core/uuid");
var auction_1 = require("./auction");
var rng_1 = require("./rng");
/**
 * Compute the next minimum bid increment.
 *
 * Identical to the existing UI. Increments by 5% + $200, rounded up to nearest $100.
 *
 * @param currentBid - Current bid amount
 * @returns Next minimum bid amount
 */
function nextBidAmount(currentBid) {
    return Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
}
/**
 * Construct a deterministic auction runner.
 *
 * Seed makes outcomes reproducible. The existing resolveAuctionSale derives one from
 * lot/stable/bid identifiers — we do the same here, hashed once per (lot, scan) pair
 * so identical inputs yield identical outputs across paths.
 *
 * @param sale - The auction sale to simulate
 * @param stables - All NPC stables for bidding
 * @param horses - All horses in the game
 * @param baseSeed - Base seed for deterministic RNG (defaults to hash of sale ID)
 * @param options - Optional runner configuration including live mode, AI manager, and callbacks
 * @returns Auction runner interface
 */
function createAuctionRunner(sale, stables, horses, baseSeed, options) {
    if (baseSeed === void 0) { baseSeed = (0, rng_1.hashStr)(sale.id); }
    if (options === void 0) { options = {}; }
    var _a = options.liveMode, liveMode = _a === void 0 ? false : _a, npcAIManager = options.npcAIManager, currentDay = options.currentDay, onAutoRaise = options.onAutoRaise;
    var horseMap = new Map(horses.map(function (h) { return [h.id, h]; }));
    // Proxy bid cap — cleared per lot and on cancel.
    var playerMaxBid = undefined;
    var lots = sale.lots
        .filter(function (l) { return !l.withdrawn; })
        .map(function (l) {
        var _a;
        return ({
            lot: __assign({}, l),
            currentBid: (_a = l.hammerPrice) !== null && _a !== void 0 ? _a : 0,
            leadingBidder: l.soldToStableId,
            bidHistory: l.bidHistory ? __spreadArray([], l.bidHistory, true) : [],
            chant: "open",
            silentSteps: 0,
            consecutiveBidders: [],
        });
    });
    var bidderStables = stables.filter(function (s) { return s.isMajor; });
    var log = [];
    var lotIndex = 0;
    var tick = 0;
    var done = lots.length === 0;
    function rngFor(lot, scanIdx) {
        return (0, rng_1.createRng)(baseSeed ^ (0, rng_1.hashStr)(lot.id) ^ scanIdx);
    }
    function findEligibleBidders(state) {
        return bidderStables.filter(function (s) { return s.id !== state.lot.consignorStableId && s.id !== state.leadingBidder; });
    }
    function tryRecordPlayerBid(state, amount) {
        if (amount <= state.currentBid)
            return null;
        state.currentBid = amount;
        state.leadingBidder = undefined; // player
        state.bidHistory.push({ stableId: undefined, amount: amount, tick: tick });
        state.silentSteps = 0;
        state.consecutiveBidders = ["player"];
        return { type: "BID_RECEIVED", lotId: state.lot.id, stableId: undefined, amount: amount };
    }
    function tryNpcRaise(state) {
        var horse = horseMap.get(state.lot.horseId);
        if (!horse)
            return null;
        var eligible = findEligibleBidders(state);
        // First-eligible-wins keeps it deterministic; specifically interesting
        // bidders self-select via valuation/budget gates inside calculateNpcBid.
        for (var _i = 0, eligible_1 = eligible; _i < eligible_1.length; _i++) {
            var stable = eligible_1[_i];
            var rng = rngFor(state.lot, tick * 31 + bidderStables.indexOf(stable));
            var bid = (0, auction_1.calculateNpcBid)(stable, horse, state.currentBid, sale.kind, rng, horses, horseMap, npcAIManager, currentDay);
            if (bid !== null && bid > state.currentBid) {
                state.currentBid = bid;
                state.leadingBidder = stable.id;
                state.bidHistory.push({ stableId: stable.id, amount: bid, tick: tick });
                state.silentSteps = 0;
                state.consecutiveBidders.push(stable.id);
                return { type: "BID_RECEIVED", lotId: state.lot.id, stableId: stable.id, amount: bid };
            }
        }
        return null;
    }
    function finalizeCurrent(state) {
        var _a, _b, _c;
        var events = [];
        var horse = horseMap.get(state.lot.horseId);
        var horseName = (_a = horse === null || horse === void 0 ? void 0 : horse.name) !== null && _a !== void 0 ? _a : "Lot";
        if (state.currentBid <= 0 ||
            (state.leadingBidder === undefined && state.bidHistory.length === 0)) {
            // No bids at all
            state.chant = "passed";
            state.lot.passed = true;
            state.lot.bidHistory = state.bidHistory;
            events.push({ type: "PASSED", lotId: state.lot.id, reason: "no_bids" });
            log.push("".concat(horseName, " \u2014 passed (no bids)"));
            return events;
        }
        if (state.currentBid < state.lot.reservePrice) {
            state.chant = "passed";
            state.lot.passed = true;
            state.lot.hammerPrice = undefined;
            state.lot.soldToStableId = undefined;
            state.lot.bidHistory = state.bidHistory;
            events.push({
                type: "RESERVE_NOT_MET",
                lotId: state.lot.id,
                amount: state.currentBid,
                reserve: state.lot.reservePrice,
            });
            events.push({ type: "PASSED", lotId: state.lot.id, reason: "reserve_not_met" });
            log.push("".concat(horseName, " \u2014 passed (reserve not met)"));
            return events;
        }
        state.chant = "sold";
        state.lot.hammerPrice = state.currentBid;
        state.lot.soldToStableId = state.leadingBidder;
        state.lot.passed = false;
        state.lot.bidHistory = state.bidHistory;
        events.push({
            type: "SOLD",
            lotId: state.lot.id,
            amount: state.currentBid,
            toStableId: state.leadingBidder,
        });
        var winner = state.leadingBidder
            ? ((_c = (_b = stables.find(function (s) { return s.id === state.leadingBidder; })) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : "an NPC")
            : "you";
        log.push("".concat(horseName, " \u2014 sold to ").concat(winner, " for $").concat(state.currentBid.toLocaleString()));
        return events;
    }
    function step(playerBid) {
        if (done)
            return { events: [], done: true, currentLotIndex: lotIndex };
        var state = lots[lotIndex];
        var events = [];
        tick++;
        if (state.chant === "open") {
            events.push({ type: "LOT_OPEN", lotId: state.lot.id });
            state.chant = "bidding";
            return { events: events, done: false, currentLotIndex: lotIndex };
        }
        if (state.chant === "bidding" ||
            state.chant === "going_once" ||
            state.chant === "going_twice") {
            // Player bid first if provided.
            if (playerBid !== undefined) {
                var ev = tryRecordPlayerBid(state, playerBid);
                if (ev) {
                    events.push(ev);
                    state.chant = "bidding";
                }
            }
            // Then NPC scan.
            var npcEv = tryNpcRaise(state);
            if (npcEv) {
                // Auto-raise: if player has a proxy cap and NPC just outbid them,
                // attempt to re-raise on the player's behalf before advancing the chant.
                // tryNpcRaise always returns a BID_RECEIVED event which has `amount`.
                var npcAmount = "amount" in npcEv ? npcEv.amount : 0;
                var nextForPlayer = nextBidAmount(npcAmount);
                if (playerMaxBid !== undefined &&
                    nextForPlayer <= playerMaxBid &&
                    state.leadingBidder !== undefined // NPC is now leading
                ) {
                    // Debit cash via injected callback; cancel proxy if cash is insufficient.
                    var canRaise = onAutoRaise ? onAutoRaise(nextForPlayer) : true;
                    if (canRaise) {
                        var autoEv = tryRecordPlayerBid(state, nextForPlayer);
                        if (autoEv) {
                            events.push(npcEv); // NPC raise first
                            events.push(autoEv); // player re-raise immediately after
                            state.chant = "bidding";
                            return { events: events, done: done, currentLotIndex: lotIndex };
                        }
                    }
                    else {
                        // onAutoRaise returned false — proxy cancelled.
                        playerMaxBid = undefined;
                    }
                }
                events.push(npcEv);
                state.chant = "bidding";
                // Detect a bid-war: 4+ consecutive raises on this lot
                if (state.consecutiveBidders.length >= 4) {
                    var unique = Array.from(new Set(state.consecutiveBidders.slice(-4)));
                    if (unique.length >= 2) {
                        events.push({ type: "BID_WAR", lotId: state.lot.id, stableIds: unique });
                    }
                }
            }
            else {
                // No raise this step — advance hammer counter.
                state.silentSteps++;
                if (state.chant === "bidding") {
                    state.chant = "going_once";
                    events.push({ type: "GOING_ONCE", lotId: state.lot.id, amount: state.currentBid });
                }
                else if (state.chant === "going_once") {
                    state.chant = "going_twice";
                    events.push({ type: "GOING_TWICE", lotId: state.lot.id, amount: state.currentBid });
                }
                else if (state.chant === "going_twice") {
                    events.push.apply(events, finalizeCurrent(state));
                    // Move to next lot on the next call to step()
                    lotIndex++;
                    if (lotIndex >= lots.length)
                        done = true;
                }
            }
            return { events: events, done: done, currentLotIndex: lotIndex };
        }
        // Already sold/passed (shouldn't happen in normal flow) — advance.
        lotIndex++;
        if (lotIndex >= lots.length)
            done = true;
        return { events: events, done: done, currentLotIndex: lotIndex };
    }
    function runToCompletion() {
        var _a;
        var all = [];
        while (!done) {
            var r = step();
            all.push.apply(all, r.events);
            // Safety stop — if a step produced zero events 200 times, bail.
            if (r.events.length === 0) {
                if (((_a = lots[lotIndex]) === null || _a === void 0 ? void 0 : _a.chant) === "open")
                    continue;
                break;
            }
        }
        return all;
    }
    function currentLot() {
        if (done || lotIndex >= lots.length)
            return undefined;
        var state = lots[lotIndex];
        var horse = horseMap.get(state.lot.horseId);
        return {
            lot: state.lot,
            horse: horse,
            currentBid: state.currentBid,
            leadingBidder: state.leadingBidder,
            chant: state.chant,
            nextBid: nextBidAmount(state.currentBid),
            bidHistory: state.bidHistory,
        };
    }
    function finalImpacts(_a) {
        var day = _a.day, phase = _a.phase;
        var impacts = [];
        var _loop_1 = function (state) {
            var lot = state.lot;
            if (lot.withdrawn)
                return "continue";
            var isPlayerConsignment = !lot.consignorStableId;
            impacts.push({
                id: (0, uuid_1.generateUUID)(),
                intentId: "",
                day: day,
                phase: phase,
                logLevel: "always",
                type: "auction_resolution",
                saleId: sale.id,
                lotId: lot.id,
                hammerPrice: lot.hammerPrice,
                soldToStableId: lot.soldToStableId,
                passed: !!lot.passed,
                bidHistory: state.bidHistory,
                wasPlayerConsignment: isPlayerConsignment,
                reason: lot.passed ? "auction_passed" : "auction_sold",
            });
            if (lot.passed || !lot.hammerPrice)
                return "continue";
            var winnerStableId = lot.soldToStableId; // undefined = player won
            var consignorStableId = lot.consignorStableId; // undefined = player consigned
            // Debit the winner's cash (NPC winner only; player live-bid path debits via store action).
            if (winnerStableId) {
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "conditional",
                    type: "cash_change",
                    entityId: winnerStableId,
                    amount: -lot.hammerPrice,
                    reason: "auction_purchase",
                });
            }
            // Debit the buyer if the player won. The live Theater debits cash
            // atomically on each player bid (so the player can't double-spend
            // mid-sale), so in liveMode we skip emitting this final debit.
            // Push to Inbox for winner.
            if (!winnerStableId && !liveMode) {
                var horse = horses.find(function (h) { return h.id === lot.horseId; });
                var horseName = (horse === null || horse === void 0 ? void 0 : horse.name) || "Unknown Horse";
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "always",
                    type: "inbox_message",
                    message: {
                        day: day,
                        category: "auction",
                        priority: "info",
                        title: "Auction Won: ".concat(horseName),
                        body: "Congratulations! You purchased ".concat(horseName, " for $").concat(lot.hammerPrice.toLocaleString(), " at ").concat(sale.name, "."),
                        cta: {
                            label: "View Horse",
                            route: "stable.$horseId",
                            params: { horseId: lot.horseId },
                        },
                    },
                });
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "always",
                    type: "cash_change",
                    entityId: undefined,
                    amount: -lot.hammerPrice,
                    reason: "auction_purchase_player",
                });
            }
            // Credit the consignor (net of 6% sale-house commission).
            var proceeds = (0, auction_1.netProceeds)(lot.hammerPrice);
            if (consignorStableId) {
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "conditional",
                    type: "cash_change",
                    entityId: consignorStableId,
                    amount: proceeds,
                    reason: "auction_proceeds",
                });
            }
            else {
                // Player consignor.
                var horse = horses.find(function (h) { return h.id === lot.horseId; });
                var horseName = (horse === null || horse === void 0 ? void 0 : horse.name) || "Unknown Horse";
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "always",
                    type: "inbox_message",
                    message: {
                        day: day,
                        category: "auction",
                        priority: "info",
                        title: "Horse Sold: ".concat(horseName),
                        body: "".concat(horseName, " was sold for $").concat(lot.hammerPrice.toLocaleString(), " at ").concat(sale.name, ". Your net proceeds: $").concat(proceeds.toLocaleString(), "."),
                        cta: {
                            label: "View Sale",
                            route: "auction.$saleId",
                            params: { saleId: sale.id },
                        },
                    },
                });
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "always",
                    type: "cash_change",
                    entityId: undefined, // resolver treats undefined as player
                    amount: proceeds,
                    reason: "auction_proceeds_player",
                });
            }
            // Transfer horse ownership.
            impacts.push({
                id: (0, uuid_1.generateUUID)(),
                intentId: "",
                day: day,
                phase: phase,
                logLevel: "always",
                type: "horse_transfer",
                horseId: lot.horseId,
                fromStableId: consignorStableId,
                toStableId: winnerStableId,
                price: lot.hammerPrice,
                reason: "auction_transfer",
            });
        };
        for (var _i = 0, lots_1 = lots; _i < lots_1.length; _i++) {
            var state = lots_1[_i];
            _loop_1(state);
        }
        // Handle passed lots for player consignor.
        var resolvedLots = lots.map(function (l) { return l.lot; });
        var _loop_2 = function (lot) {
            if (lot.consignorStableId === "") {
                // Player's horse passed.
                var horse = horses.find(function (h) { return h.id === lot.horseId; });
                var horseName = (horse === null || horse === void 0 ? void 0 : horse.name) || "Unknown Horse";
                impacts.push({
                    id: (0, uuid_1.generateUUID)(),
                    intentId: "",
                    day: day,
                    phase: phase,
                    logLevel: "always",
                    type: "inbox_message",
                    message: {
                        day: day,
                        category: "auction",
                        priority: "info",
                        title: "Horse Passed: ".concat(horseName),
                        body: "".concat(horseName, " failed to meet its reserve price at ").concat(sale.name, " and has returned to your stable."),
                        cta: {
                            label: "View Horse",
                            route: "stable.$horseId",
                            params: { horseId: lot.horseId },
                        },
                    },
                });
            }
        };
        for (var _b = 0, _c = resolvedLots.filter(function (l) { return l.passed; }); _b < _c.length; _b++) {
            var lot = _c[_b];
            _loop_2(lot);
        }
        return impacts;
    }
    return {
        currentLotIndex: function () { return lotIndex; },
        currentLot: currentLot,
        step: step,
        runToCompletion: runToCompletion,
        finalLots: function () {
            return sale.lots.map(function (orig) {
                if (orig.withdrawn)
                    return orig;
                var state = lots.find(function (l) { return l.lot.id === orig.id; });
                return state ? state.lot : orig;
            });
        },
        log: function () { return log; },
        finalImpacts: finalImpacts,
        setPlayerMaxBid: function (cap) {
            playerMaxBid = cap;
        },
        skipLot: function () {
            // Mark current lot as passed and move to next
            var state = lots[lotIndex];
            if (state) {
                state.lot.passed = true;
                state.lot.hammerPrice = undefined;
                state.lot.soldToStableId = undefined;
                log.push("Lot ".concat(lotIndex + 1, " (").concat(state.lot.horseId, ") passed"));
                lotIndex++;
            }
        },
        finishSale: function () {
            // Mark remaining lots as passed and complete the sale
            for (var i = lotIndex; i < lots.length; i++) {
                lots[i].lot.passed = true;
                lots[i].lot.hammerPrice = undefined;
                lots[i].lot.soldToStableId = undefined;
                log.push("Lot ".concat(i + 1, " (").concat(lots[i].lot.horseId, ") passed (sale finished early)"));
            }
            lotIndex = lots.length;
        },
        getFinalState: function () {
            // Return all events that would be emitted by finalImpacts
            return runToCompletion();
        },
    };
}
