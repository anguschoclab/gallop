"use strict";
/**
 * state/index.ts - State module exports
 *
 * This file exports all state types and creators from the state module, providing
 * the complete GameState type as an intersection of all domain states, and the
 * NewGameOptions interface for game initialization.
 *
 * Dependencies: ./coreState (CoreState, createDefaultCoreState), ./marketState (MarketState, createDefaultMarketState), ./breedingState (BreedingState, createDefaultBreedingState), ./racingState (RacingState, createDefaultRacingState), ./systemsState (SystemsState, createDefaultSystemsState), ../types (PlayerProfile), @/core/newGame/backstories (Backstory)
 * Related files: store.ts (uses GameState), index.ts (exports NewGameOptions)
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
exports.createDefaultSystemsState = exports.createDefaultRacingState = exports.createDefaultBreedingState = exports.createDefaultMarketState = exports.createDefaultCoreState = void 0;
exports.createDefaultGameState = createDefaultGameState;
// Import state creators for use in createDefaultGameState
var coreState_1 = require("./coreState");
Object.defineProperty(exports, "createDefaultCoreState", { enumerable: true, get: function () { return coreState_1.createDefaultCoreState; } });
var marketState_1 = require("./marketState");
Object.defineProperty(exports, "createDefaultMarketState", { enumerable: true, get: function () { return marketState_1.createDefaultMarketState; } });
var breedingState_1 = require("./breedingState");
Object.defineProperty(exports, "createDefaultBreedingState", { enumerable: true, get: function () { return breedingState_1.createDefaultBreedingState; } });
var racingState_1 = require("./racingState");
Object.defineProperty(exports, "createDefaultRacingState", { enumerable: true, get: function () { return racingState_1.createDefaultRacingState; } });
var systemsState_1 = require("./systemsState");
Object.defineProperty(exports, "createDefaultSystemsState", { enumerable: true, get: function () { return systemsState_1.createDefaultSystemsState; } });
/**
 * Create a complete default GameState for new games.
 *
 * Combines all domain state creators (core, market, breeding, racing, systems)
 * into a single game state object.
 *
 * @returns Complete default game state with all domain states initialized
 */
function createDefaultGameState() {
    return __assign(__assign(__assign(__assign(__assign({}, (0, coreState_1.createDefaultCoreState)()), (0, marketState_1.createDefaultMarketState)()), (0, breedingState_1.createDefaultBreedingState)()), (0, racingState_1.createDefaultRacingState)()), (0, systemsState_1.createDefaultSystemsState)());
}
