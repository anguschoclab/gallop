"use strict";
/**
 * state/coreState.ts - Core state management
 *
 * This file provides core game state that is always present and required for the game
 * to function, including day, cash, horses, races, log, news, season records, hall of
 * fame, and archive for historical data.
 *
 * Dependencies: ../types (Horse, Race), @/core/narrative/newsTypes (NewsItem), @/core/history/historyTypes (HallOfFameEntry, SeasonRecord), ../uuid (generateUUID), ../rng (createRng, hashStr)
 * Related files: store.ts (uses core state), types.ts (core types)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultCoreState = createDefaultCoreState;
var uuid_1 = require("@/core/uuid");
var rng_1 = require("@/game/rng");
var horseFactory_1 = require("@/core/horse/horseFactory");
/**
 * Create default core state for new games.
 *
 * When options are provided, uses the backstory to customize starting resources
 * including player horses, cash, and initial news items.
 *
 * @param options - Optional new game options including profile and backstory
 * @returns Core game state with day, cash, horses, races, log, news, season records, hall of fame, and archive
 */
function createDefaultCoreState(options) {
    if (options) {
        var profile = options.profile, backstory = options.backstory;
        var setupRng = (0, rng_1.createRng)((0, rng_1.hashStr)(profile.stableName));
        // Generate player horses from backstory spec
        var playerHorses = [];
        for (var _i = 0, _a = backstory.horses; _i < _a.length; _i++) {
            var spec = _a[_i];
            for (var i = 0; i < spec.count; i++) {
                var horse = (0, horseFactory_1.generateHorse)({ tier: spec.tier, owned: true }, setupRng);
                // Set horse silk to player's primary color for visual identification
                horse.silk = profile.silk.primary;
                playerHorses.push(horse);
            }
        }
        return {
            day: 1,
            cash: backstory.startingCash,
            horses: playerHorses,
            horseMap: new Map(playerHorses.map(function (h) { return [h.id, h]; })),
            races: [],
            log: [
                {
                    day: 1,
                    text: "".concat(profile.stableName, " opens its doors. Welcome, ").concat(profile.ownerName, "."),
                },
            ],
            news: [
                {
                    id: (0, uuid_1.generateUUID)(),
                    day: 1,
                    category: "milestone",
                    importance: "high",
                    headline: "".concat(profile.stableName, " Opens for Business!"),
                    body: "The local racing community is abuzz as ".concat(profile.ownerName, " officially registers ").concat(profile.stableName, ". \"We're here to make history,\" the new owner stated at the morning trials."),
                },
            ],
            inbox: [],
            seasonRecords: [],
            hallOfFame: [],
            archive: {
                horses: [],
                races: [],
                pregnancies: [],
                news: [],
            },
            transactions: [],
            expenses: [],
        };
    }
    // Default behavior when no options provided (backward compatibility)
    return {
        day: 1,
        cash: 50000,
        horses: [],
        horseMap: new Map(),
        races: [],
        log: [{ day: 1, text: "Welcome to Gallop! Your stable is now open for business." }],
        news: [
            {
                id: (0, uuid_1.generateUUID)(),
                day: 1,
                category: "milestone",
                importance: "high",
                headline: "Welcome to Gallop!",
                body: "Your stable is now open for business. Good luck on the road to the Triple Crown!",
            },
        ],
        inbox: [],
        seasonRecords: [],
        hallOfFame: [],
        archive: {
            horses: [],
            races: [],
            pregnancies: [],
            news: [],
        },
        transactions: [],
        expenses: [],
    };
}
