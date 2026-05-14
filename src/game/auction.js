"use strict";
/**
 * auction.ts - Auction lot valuation and bidding logic
 *
 * This file provides functions for calculating lot valuations, bidding values,
 * commission amounts, and net proceeds for auction sales.
 *
 * Dependencies: @/core/horse/gender (isMaleHorse, isFemaleHorse), ./types (Horse, Pregnancy, Stable, AuctionLot, AuctionSale, AuctionSaleKind), @/core/horse/horseFactory (generateNpcHorse), @/core/horse/pricing (calculateNpcHorseValue), @/core/stable/stableConfig (PERSONALITY_CONFIG), ./rng (createRng, hashStr, Rng), ./uuid (generateUUID), @/core/breeding/pedigreePricing (pedigreeMultiplier), @/core/ai/auctionAI (calculateBiddingValue, calculateMaxBid, shouldBidOnHorse, createAuctionAIState, recordBiddingDecision), @/core/ai/npcCycleAI (NpcAIManager), ./auctionData (SALE_TRIGGERS, KIND_LABELS)
 * Related files: auctionRunner.ts (uses valuation logic), auctionData.ts (sale triggers and labels)
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
exports.DEFAULT_PLAYER_RESERVE_RATIO = void 0;
exports.netProceeds = netProceeds;
exports.commissionAmount = commissionAmount;
exports.calculateLotValuation = calculateLotValuation;
exports.calculateNpcBid = calculateNpcBid;
exports.isLotEligible = isLotEligible;
exports.generateBreezeSeconds = generateBreezeSeconds;
exports.personalityConsignmentPolicy = personalityConsignmentPolicy;
exports.generateAuctionLots = generateAuctionLots;
exports.resolveAuctionSale = resolveAuctionSale;
var gender_1 = require("@/core/horse/gender");
var horseFactory_1 = require("@/core/horse/horseFactory");
var pricing_1 = require("@/core/horse/pricing");
var stableConfig_1 = require("@/core/stable/stableConfig");
var rng_1 = require("@/game/rng");
var uuid_1 = require("@/core/uuid");
var pedigreePricing_1 = require("@/core/breeding/pedigreePricing");
var auctionAI_1 = require("@/core/ai/auctionAI");
var gameConstants_1 = require("@/game/constants/gameConstants");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default reserve as a fraction of base value when the player consigns. */
exports.DEFAULT_PLAYER_RESERVE_RATIO = 0.7;
/** Compute net proceeds the player receives after commission. */
/**
 * Calculate net proceeds from hammer price after commission.
 *
 * @param hammerPrice - The hammer price of the lot
 * @returns Net proceeds after consignment commission
 */
function netProceeds(hammerPrice) {
    return Math.round(hammerPrice * (1 - gameConstants_1.CONSIGNMENT_COMMISSION));
}
/**
 * Compute the commission taken from a hammer price.
 *
 * @param hammerPrice - The hammer price of the lot
 * @returns Commission amount
 */
function commissionAmount(hammerPrice) {
    return hammerPrice - netProceeds(hammerPrice);
}
/**
 * Aggressive valuation strategy.
 *
 * Aggressive stables bid 30% above base value, with an additional 25% premium for 2yo training.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function aggressiveValuation(ctx) {
    var mod = 1.0 + gameConstants_1.AUCTION_AGGRESSIVE_PREMIUM;
    if (ctx.is2yoTraining)
        mod *= 1.0 + gameConstants_1.AUCTION_2YO_TRAINING_PREMIUM;
    return mod;
}
/**
 * Conservative valuation strategy.
 *
 * Conservative stables bid 25% below base value.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function conservativeValuation(ctx) {
    return 1.0 - gameConstants_1.AUCTION_CONSERVATIVE_DISCOUNT;
}
/**
 * Developer valuation strategy.
 *
 * Developers pay premiums for yearlings (40%) and weanlings (20%), but discount racing age horses (30%).
 * They also value broodmares (10% premium) but discount 2yo training (10% discount).
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function developerValuation(ctx) {
    var mod = ctx.isYearling
        ? 1.0 + gameConstants_1.AUCTION_YEARLING_PREMIUM
        : ctx.isWeanling
            ? 1.0 + gameConstants_1.AUCTION_WEANLING_PREMIUM
            : 1.0 - gameConstants_1.AUCTION_RACING_AGE_DISCOUNT;
    if (ctx.is2yoTraining)
        mod *= 0.9;
    if (ctx.isBroodmare)
        mod *= 1.1;
    if (ctx.isRacingAge)
        mod *= 1.0 - gameConstants_1.AUCTION_RACING_AGE_DISCOUNT;
    return mod;
}
/**
 * Win-now valuation strategy.
 *
 * Win-now stables focus on racing age horses (30% premium) and 2yo training (25% premium).
 * They discount weanlings (40% discount) and broodmares (60% discount).
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function winNowValuation(ctx) {
    var mod = ctx.isWeanling
        ? 1.0 - gameConstants_1.AUCTION_WEANLING_DISCOUNT
        : ctx.isYearling
            ? 0.9
            : 1.0;
    if (ctx.is2yoTraining)
        mod *= 1.0 + gameConstants_1.AUCTION_2YO_TRAINING_PREMIUM;
    if (ctx.isBroodmare)
        mod *= 1.0 - gameConstants_1.AUCTION_BROODMARE_DISCOUNT;
    if (ctx.isRacingAge)
        mod *= 1.0 + gameConstants_1.AUCTION_RACING_AGE_PREMIUM;
    return mod;
}
/**
 * Specialist valuation strategy.
 *
 * Specialists pay a 50% premium if the horse matches their preferred distance, otherwise a 50% discount.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function specialistValuation(ctx) {
    var _a;
    var distanceMatch = ctx.stable.preferredDistance !== undefined &&
        Math.abs(((_a = ctx.stable.preferredDistance) !== null && _a !== void 0 ? _a : 1600) - 1600) < 400;
    return distanceMatch ? 1.5 : 0.5;
}
/**
 * Breeder valuation strategy.
 *
 * Breeders pay a 60% premium for fillies and a 50% premium for broodmares.
 * They also pay an additional 20% premium for Blue Hen dams.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function breederValuation(ctx) {
    var _a;
    var mod = ctx.isFilly ? 1.0 + gameConstants_1.AUCTION_FILLY_PREMIUM : 0.7;
    if (ctx.horse.damName && ((_a = ctx.horse.blueHenStatus) === null || _a === void 0 ? void 0 : _a.isBlueHen))
        mod *= 1.2;
    if (ctx.isBroodmare)
        mod *= 1.0 + gameConstants_1.AUCTION_BROODMARE_PREMIUM;
    return mod;
}
/**
 * Trader valuation strategy.
 *
 * Traders bid 15% below base value, looking for bargains they can flip.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function traderValuation(ctx) {
    return 0.85;
}
/**
 * Prestige valuation strategy.
 *
 * Prestige stables pay premiums based on horse fame (0.5% per fame point), with a base 20% premium.
 * They only bid on horses valued over $5,000 and pay an additional 30% premium for racing age horses.
 *
 * @param ctx - Valuation context
 * @returns Valuation multiplier
 */
function prestigeValuation(ctx) {
    var mod = 1.2 + ctx.horse.fame / 200;
    if (ctx.base < 5000)
        mod = 0;
    if (ctx.isRacingAge)
        mod *= 1.0 + gameConstants_1.AUCTION_RACING_AGE_PREMIUM;
    return mod;
}
var VALUATION_STRATEGIES = {
    aggressive: aggressiveValuation,
    conservative: conservativeValuation,
    developer: developerValuation,
    "win-now": winNowValuation,
    specialist: specialistValuation,
    breeder: breederValuation,
    trader: traderValuation,
    prestige: prestigeValuation,
};
/**
 * Calculate how much a stable values a given auction lot.
 *
 * Returns a dollar figure representing their ceiling bid. Considers pedigree multiplier,
 * stable personality, sale kind, horse attributes, and various premiums.
 *
 * @param horse - The horse being valued
 * @param stable - The stable making the valuation
 * @param saleKind - Type of auction sale
 * @param allHorses - All horses in the game (for pedigree calculations)
 * @param horseMap - Map of horse IDs to horses
 * @returns Ceiling bid amount
 */
function calculateLotValuation(horse, stable, saleKind, allHorses, horseMap) {
    var _a;
    var pedigreeMul = allHorses ? (0, pedigreePricing_1.pedigreeMultiplier)(horse, { horses: allHorses }, horseMap) : 1;
    var base = Math.round((0, pricing_1.calculateNpcHorseValue)(horse, stable.tier) * pedigreeMul);
    var p = stable.personality;
    var cfg = stableConfig_1.PERSONALITY_CONFIG[p];
    var isYearling = saleKind === "yearling" || saleKind === "yearling_south";
    var isWeanling = saleKind === "weanling" || saleKind === "weanling_south";
    var isFilly = (0, gender_1.isFemaleHorse)(horse.gender);
    var is2yoTraining = saleKind === "2yo_training";
    var isBroodmare = saleKind === "broodmare";
    var isRacingAge = saleKind === "racing_age";
    var ctx = {
        horse: horse,
        stable: stable,
        saleKind: saleKind,
        base: base,
        isYearling: isYearling,
        isWeanling: isWeanling,
        isFilly: isFilly,
        is2yoTraining: is2yoTraining,
        isBroodmare: isBroodmare,
        isRacingAge: isRacingAge,
    };
    var strategy = VALUATION_STRATEGIES[p] || (function () { return 1.0; });
    var mod = strategy(ctx);
    // Common premiums applied to all personalities
    if (horse.conformation === "excellent")
        mod *= 1.1;
    if (horse.temperament === "excellent")
        mod *= 1.05;
    // Youth preference from cfg modulates the yearling/weanling bonus
    if ((isYearling || isWeanling) && cfg.youthPreference > 0.5) {
        mod *= 1 + (cfg.youthPreference - 0.5) * 0.3;
    }
    // Broodmare specific common premium
    if (isBroodmare && ((_a = horse.blueHenStatus) === null || _a === void 0 ? void 0 : _a.isBlueHen)) {
        mod *= 1.3;
    }
    // Racing age fame premium
    if (isRacingAge && horse.fame > 30) {
        mod *= 1.0 + horse.fame / 200;
    }
    return Math.max(0, Math.round(base * mod));
}
// ---------------------------------------------------------------------------
// NPC bidding
// ---------------------------------------------------------------------------
var BUDGET_CAPS = {
    aggressive: gameConstants_1.AUCTION_RESERVE_AGGRESSIVE,
    conservative: 0.15,
    developer: 0.3,
    "win-now": 0.2,
    specialist: gameConstants_1.AUCTION_RESERVE_SPECIALIST_LOW,
    breeder: gameConstants_1.AUCTION_RESERVE_BREEDER,
    trader: 0.2,
    prestige: gameConstants_1.AUCTION_RESERVE_ELITE,
};
/**
 * Returns the next NPC bid amount, or null if the stable passes.
 * AI-driven decisions when npcAIManager is provided.
 */
/**
 * Calculate NPC bid for an auction lot.
 *
 * Uses AI-driven bidding if AI manager is available, otherwise falls back to
 * original valuation logic. Returns null if the stable should not bid.
 *
 * @param stable - The stable making the bid
 * @param horse - The horse being bid on
 * @param currentBid - Current bid amount
 * @param saleKind - Type of auction sale
 * @param rng - Random number generator
 * @param allHorses - All horses in the game (for pedigree calculations)
 * @param horseMap - Map of horse IDs to horses
 * @param npcAIManager - Optional AI manager for advanced bidding logic
 * @param currentDay - Current game day
 * @returns Bid amount or null if should not bid
 */
function calculateNpcBid(stable, horse, currentBid, saleKind, rng, allHorses, horseMap, npcAIManager, currentDay) {
    var _a;
    // Use AI-driven bidding if AI manager is available
    if (npcAIManager && currentDay !== undefined) {
        var aiState = npcAIManager.stableStates[stable.id];
        if (aiState === null || aiState === void 0 ? void 0 : aiState.auctionAI) {
            // Create a temporary lot object for AI evaluation
            var tempLot = {
                id: "temp_".concat(horse.id),
                horseId: horse.id,
                consignorStableId: undefined,
                saleId: "temp",
                reservePrice: 0,
                hammerPrice: currentBid || undefined,
                soldToStableId: undefined,
                passed: false,
                withdrawn: false,
                bidHistory: [],
            };
            // Check if stable should bid using AI
            var shouldBid = (0, auctionAI_1.shouldBidOnHorse)(aiState.auctionAI, horse, tempLot, stable, currentDay);
            if (!shouldBid)
                return null;
            // Calculate max bid using AI with friction consideration
            var friction = (_a = aiState.friction) !== null && _a !== void 0 ? _a : 0;
            var maxBid_1 = (0, auctionAI_1.calculateMaxBid)(aiState.auctionAI, horse, tempLot, stable, currentDay, friction);
            var nextBid_1 = Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
            if (nextBid_1 > maxBid_1)
                return null;
            return nextBid_1;
        }
    }
    // Fall back to original logic if AI not available
    var ceiling = calculateLotValuation(horse, stable, saleKind, allHorses, horseMap);
    if (ceiling <= 0)
        return null;
    var budgetCap = stable.cash * BUDGET_CAPS[stable.personality];
    var maxBid = Math.min(ceiling, budgetCap);
    var nextBid = Math.ceil((currentBid * 1.05 + 200) / 100) * 100;
    if (nextBid > maxBid)
        return null;
    // Aggressive/prestige personalities bid near ceiling immediately
    if (stable.personality === "aggressive" || stable.personality === "prestige") {
        var aggressiveBid = Math.min(Math.round(ceiling * (gameConstants_1.AUCTION_AGGRESSIVE_BID_MIN_PERCENT + rng.range(0, gameConstants_1.AUCTION_AGGRESSIVE_BID_VARIANCE))), maxBid);
        return aggressiveBid > currentBid ? Math.ceil(aggressiveBid / 100) * 100 : nextBid;
    }
    // Conservative stops at 80% of valuation
    if (stable.personality === "conservative" && nextBid > ceiling * 0.8)
        return null;
    // Trader drops out if price exceeds resale margin (valuation * 0.7)
    if (stable.personality === "trader" && nextBid > ceiling * 0.7)
        return null;
    return nextBid;
}
// ---------------------------------------------------------------------------
// Lot generation
// ---------------------------------------------------------------------------
var ELIGIBLE_AGES_BY_KIND = {
    weanling: [0],
    yearling: [1, 2],
    weanling_south: [0],
    yearling_south: [1, 2],
    mixed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    broodmare: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    "2yo_training": [2],
    racing_age: [3, 4, 5, 6, 7],
};
// Some sales are hemisphere-specific; others (mixed/broodmare/2yo/racing-age)
// sample from any region. Returning undefined means "no hemisphere filter".
var HEMISPHERE_BY_KIND = {
    weanling: "Northern",
    yearling: "Northern",
    weanling_south: "Southern",
    yearling_south: "Southern",
    mixed: undefined,
    broodmare: undefined,
    "2yo_training": undefined,
    racing_age: undefined,
};
/**
 * Sale-kind eligibility filter. Returns true when this horse is appropriate
 * stock for this kind of sale. Layered on top of the age filter.
 */
/**
 * Check if a horse is eligible for a specific auction sale kind.
 *
 * @param horse - The horse to check
 * @param kind - Type of auction sale
 * @param pregnancies - Optional pregnancy data for broodmare checks
 * @returns True if horse is eligible for this sale kind
 */
function isLotEligible(horse, kind, pregnancies) {
    if (!ELIGIBLE_AGES_BY_KIND[kind].includes(horse.age))
        return false;
    var hemi = HEMISPHERE_BY_KIND[kind];
    if (hemi && horse.hemisphere !== hemi)
        return false;
    if (kind === "broodmare") {
        if (horse.gender !== "mare" && horse.gender !== "filly")
            return false;
    }
    if (kind === "racing_age") {
        if (horse.gender === "mare")
            return false; // mares 4+ go to broodmare
        if (!horse.racingViable)
            return false;
    }
    if (kind === "2yo_training") {
        if (!horse.racingViable)
            return false;
    }
    return true;
}
/**
 * Generate a "breeze time" for a 2YO-in-training lot.
 *
 * Expressed in seconds for a 1/8-mile (≈202m) burst. Real OBS works range ~9.6s (elite)
 * to ~11.0s (slow). Faster horses get faster breezes; small RNG noise on top.
 *
 * @param horse - The horse to generate breeze time for
 * @param rng - Random number generator
 * @returns Breeze time in seconds
 */
function generateBreezeSeconds(horse, rng) {
    var speed = horse.stats.speed; // 0-100
    var accel = horse.stats.acceleration;
    var ovr = (speed * 0.6 + accel * 0.4) / 100; // 0..1
    var base = 11.0 - ovr * 1.4; // 9.6 (elite) → 11.0 (slow)
    var noise = (rng.range(0, 1) - 0.5) * 0.3;
    return Math.round((base + noise) * 100) / 100;
}
var CONSIGNMENT_STRATEGIES = {
    aggressive: function (ctx) { return ({
        consign: ctx.owned.filter(function (h) { return h.age === 0; }).slice(0, 3),
        freshCount: ctx.kind === "weanling" || ctx.kind === "weanling_south"
            ? ctx.rng.int(1, 3)
            : ctx.rng.int(0, 2),
        reserveMultiplier: 0.5,
    }); },
    conservative: function (ctx) { return ({
        consign: ctx.owned.length > 8 ? ctx.owned.slice(8, 10) : [],
        freshCount: ctx.rng.int(0, 1),
        reserveMultiplier: gameConstants_1.AUCTION_RESERVE_CONSERVATIVE,
    }); },
    developer: function (ctx) { return ({
        consign: ctx.kind === "yearling" || ctx.kind === "yearling_south"
            ? ctx.owned.slice(0, 4)
            : ctx.kind === "weanling" || ctx.kind === "weanling_south"
                ? ctx.owned.slice(0, 2)
                : ctx.owned.slice(0, 1),
        freshCount: ctx.rng.int(1, 3),
        reserveMultiplier: 0.5,
    }); },
    "win-now": function (ctx) {
        var consign = [];
        if (ctx.kind === "broodmare")
            consign = ctx.fading.filter(function (h) { return h.gender === "mare"; }).slice(0, 3);
        else if (ctx.kind === "racing_age")
            consign = ctx.fading.filter(function (h) { return h.gender !== "mare"; }).slice(0, 3);
        else if (ctx.kind === "2yo_training")
            consign = ctx.unraced.filter(function (h) { return h.age === 2; }).slice(0, 3);
        else if (ctx.kind === "mixed")
            consign = ctx.fading.slice(0, 2);
        return {
            consign: consign,
            reserveMultiplier: 0.4,
            freshCount: ctx.rng.int(0, 2),
        };
    },
    specialist: function (ctx) {
        var offNiche = ctx.owned.filter(function (h) {
            if (ctx.stable.preferredDistance &&
                Math.abs(h.distanceAptitude - ctx.stable.preferredDistance) > 600)
                return true;
            if (ctx.stable.preferredSurface) {
                var apts = h.surfaceAptitude;
                var best = Object.entries(apts).sort(function (a, b) { return b[1] - a[1]; })[0];
                if (best[0] !== ctx.stable.preferredSurface)
                    return true;
            }
            return false;
        });
        return {
            consign: offNiche.slice(0, 3),
            freshCount: ctx.rng.int(0, 2),
            reserveMultiplier: gameConstants_1.AUCTION_RESERVE_SPECIALIST,
        };
    },
    breeder: function (ctx) { return ({
        consign: ctx.kind === "broodmare"
            ? ctx.fading.filter(function (h) { return h.gender === "mare"; }).slice(0, 4)
            : ctx.colts.slice(0, 4),
        freshCount: ctx.rng.int(2, 4),
        reserveMultiplier: gameConstants_1.AUCTION_RESERVE_BREEDER,
    }); },
    trader: function (ctx) { return ({
        consign: ctx.owned.slice(0, 5),
        freshCount: ctx.rng.int(1, 3),
        reserveMultiplier: 0.55,
    }); },
    prestige: function (ctx) { return ({
        consign: ctx.top.filter(function (h) { return h.fame >= 25 || h.potential >= 85; }).slice(0, 2),
        freshCount: ctx.rng.int(0, 1),
        reserveMultiplier: gameConstants_1.AUCTION_RESERVE_ELITE,
    }); },
};
/**
 * High-level consignment policy for NPC stables.
 *
 * Each personality type decides what horses to list based on age, gender, and
 * performance. Returns an object describing the horses to consign from their
 * own roster + how many "fresh" NPC horses to generate for that sale.
 *
 * @param stable - The NPC stable
 * @param kind - Type of auction sale
 * @param allHorses - All horses in the game
 * @param rng - Random number generator
 * @returns Object with consign array, freshCount, and reserveMultiplier
 */
function personalityConsignmentPolicy(stable, kind, allHorses, rng) {
    var owned = allHorses.filter(function (h) { return h.stableId === stable.id && isLotEligible(h, kind); });
    var p = stable.personality;
    // Helper picks
    var fillies = owned.filter(function (h) { return (0, gender_1.isFemaleHorse)(h.gender); });
    var colts = owned.filter(function (h) { return (0, gender_1.isMaleHorse)(h.gender) || h.gender === "gelding"; });
    var unraced = owned.filter(function (h) { return h.careerStarts === 0; });
    var fading = owned.filter(function (h) { return h.age >= h.peakAge + 2; });
    var top = __spreadArray([], owned, true).sort(function (a, b) { return b.fame + b.potential - (a.fame + a.potential); });
    var ctx = {
        stable: stable,
        kind: kind,
        allHorses: allHorses,
        rng: rng,
        owned: owned,
        fillies: fillies,
        colts: colts,
        unraced: unraced,
        fading: fading,
        top: top,
    };
    var strategy = CONSIGNMENT_STRATEGIES[p] ||
        (function () { return ({
            consign: [],
            freshCount: 0,
            reserveMultiplier: 0.5,
        }); });
    var result = strategy(ctx);
    // Filter out anything already consigned to a different sale.
    result.consign = result.consign.filter(function (h) { return !h.consignedSaleId; });
    return result;
}
/**
 * Generate a new AuctionSale with lots from NPC consignors + player-eligible horses.
 *
 * Player horses must be consigned separately via consignHorse().
 *
 * @param day - Day the sale occurs
 * @param stables - All NPC stables
 * @param allHorses - All horses in the game
 * @param kind - Type of auction sale
 * @param name - Display name of the sale
 * @param rng - Random number generator
 * @returns Generated auction sale with lots
 */
function generateAuctionLots(day, stables, allHorses, kind, name, rng) {
    var saleId = (0, uuid_1.generateUUID)(rng);
    var hemisphere = HEMISPHERE_BY_KIND[kind];
    var eligibleAges = ELIGIBLE_AGES_BY_KIND[kind];
    var lots = [];
    // Every major stable gets a chance to consign — per-personality policy
    // decides what (if anything) they actually list.
    var consignors = stables.filter(function (s) { return s.isMajor; });
    for (var _i = 0, consignors_1 = consignors; _i < consignors_1.length; _i++) {
        var stable = consignors_1[_i];
        var policy = personalityConsignmentPolicy(stable, kind, allHorses, rng);
        for (var _a = 0, _b = policy.consign; _a < _b.length; _a++) {
            var horse = _b[_a];
            var pedigreeMul = (0, pedigreePricing_1.pedigreeMultiplier)(horse, { horses: allHorses });
            var baseValue = (0, pricing_1.calculateNpcHorseValue)(horse, stable.tier) * pedigreeMul;
            var breezeSeconds = kind === "2yo_training" ? generateBreezeSeconds(horse, rng) : undefined;
            lots.push({
                id: (0, uuid_1.generateUUID)(rng),
                horseId: horse.id,
                consignorStableId: stable.id,
                saleId: saleId,
                reservePrice: Math.round(baseValue * policy.reserveMultiplier),
                passed: false,
                withdrawn: false,
                breezeSeconds: breezeSeconds,
            });
        }
        for (var i = 0; i < policy.freshCount; i++) {
            // Fresh NPC horse — pick an age the sale will accept.
            var targetAge = eligibleAges[rng.int(0, eligibleAges.length - 1)];
            var freshHorse = (0, horseFactory_1.generateNpcHorse)(stable, rng, undefined, 1, {
                forcedAge: targetAge,
                hemisphere: hemisphere !== null && hemisphere !== void 0 ? hemisphere : (rng.next() < 0.5 ? "Northern" : "Southern"),
            });
            // Re-check eligibility after generation (e.g. broodmare wants only mares).
            if (!isLotEligible(freshHorse, kind))
                continue;
            allHorses.push(freshHorse);
            var pedigreeMul = (0, pedigreePricing_1.pedigreeMultiplier)(freshHorse, { horses: allHorses });
            var baseValue = (0, pricing_1.calculateNpcHorseValue)(freshHorse, stable.tier) * pedigreeMul;
            var breezeSeconds = kind === "2yo_training" ? generateBreezeSeconds(freshHorse, rng) : undefined;
            lots.push({
                id: (0, uuid_1.generateUUID)(rng),
                horseId: freshHorse.id,
                consignorStableId: stable.id,
                saleId: saleId,
                reservePrice: Math.round(baseValue * policy.reserveMultiplier),
                passed: false,
                withdrawn: false,
                breezeSeconds: breezeSeconds,
            });
        }
    }
    return {
        id: saleId,
        name: name,
        day: day,
        kind: kind,
        lots: lots,
        resolved: false,
    };
}
/**
 * Run the full NPC-vs-NPC auction resolution.
 *
 * Processes all lots, resolves bids, and returns updated lots with hammerPrice,
 * soldToStableId, and passed status set. Player bids are already recorded.
 *
 * @param sale - The auction sale to resolve
 * @param stables - All NPC stables for bidding
 * @param allHorses - All horses in the game
 * @returns Resolved sale with updated lots and log
 */
function resolveAuctionSale(sale, stables, allHorses) {
    var _a, _b;
    var log = [];
    var updatedLots = [];
    // Bidders: all major stables (not the consignor for their own lot)
    var bidderStables = stables.filter(function (s) { return s.isMajor; });
    var horseMap = new Map(allHorses.map(function (h) { return [h.id, h]; }));
    var _loop_1 = function (lot) {
        if (lot.withdrawn) {
            updatedLots.push(lot);
            return "continue";
        }
        var horse = horseMap.get(lot.horseId);
        if (!horse) {
            updatedLots.push(__assign(__assign({}, lot), { passed: true }));
            return "continue";
        }
        if (horse.lifecycleStatus === "deceased") {
            updatedLots.push(__assign(__assign({}, lot), { withdrawn: true }));
            log.push("".concat(horse.name, " \u2014 withdrawn (deceased)"));
            return "continue";
        }
        // Start from existing hammer price (player may have placed a book bid)
        var currentBid = (_a = lot.hammerPrice) !== null && _a !== void 0 ? _a : 0;
        var currentWinner = lot.soldToStableId;
        // Determine bidder list (exclude consignor)
        var eligibleBidders = bidderStables.filter(function (s) { return s.id !== lot.consignorStableId; });
        // Run multiple rounds until no one raises
        var raised = true;
        while (raised) {
            raised = false;
            for (var _d = 0, eligibleBidders_1 = eligibleBidders; _d < eligibleBidders_1.length; _d++) {
                var stable = eligibleBidders_1[_d];
                if (stable.id === currentWinner)
                    continue;
                var rng = (0, rng_1.createRng)((0, rng_1.hashStr)(lot.id + stable.id + String(currentBid)));
                var bid = calculateNpcBid(stable, horse, currentBid, sale.kind, rng, allHorses, horseMap);
                if (bid !== null && bid > currentBid) {
                    currentBid = bid;
                    currentWinner = stable.id;
                    raised = true;
                }
            }
        }
        // Check reserve
        if (currentBid < lot.reservePrice || currentWinner === undefined) {
            updatedLots.push(__assign(__assign({}, lot), { passed: true, hammerPrice: undefined, soldToStableId: undefined }));
            log.push("".concat(horse.name, " \u2014 passed (reserve not met)"));
        }
        else {
            updatedLots.push(__assign(__assign({}, lot), { hammerPrice: currentBid, soldToStableId: currentWinner, passed: false }));
            var winner = stables.find(function (s) { return s.id === currentWinner; });
            log.push("".concat(horse.name, " \u2014 sold to ").concat((_b = winner === null || winner === void 0 ? void 0 : winner.name) !== null && _b !== void 0 ? _b : "Unknown", " for $").concat(currentBid.toLocaleString()));
        }
    };
    for (var _i = 0, _c = sale.lots; _i < _c.length; _i++) {
        var lot = _c[_i];
        _loop_1(lot);
    }
    return { lots: updatedLots, log: log };
}
