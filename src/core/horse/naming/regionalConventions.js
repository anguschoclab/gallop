"use strict";
/**
 * regionalConventions.ts - Regional naming conventions for horses
 *
 * This file provides region-specific name generation using location and sponsor
 * word pools. Each region has its own cultural naming patterns.
 *
 * Dependencies: @/game/rng (Rng), @/game/types (RegionalSystem), @/core/race/naming/namePools (LOCATIONS, SPONSORS)
 * Related files: nameGenerator.ts (uses this for regional strategy), namePools.ts (regional word data)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRegionalName = generateRegionalName;
var namePools_1 = require("@/core/race/naming/namePools");
/**
 * Generate a name based on regional conventions.
 *
 * Uses location and sponsor word pools specific to the region to create
 * culturally appropriate names. Falls back to North America pools if region
 * is not available.
 *
 * @param region - The regional system to use for naming
 * @param rng - Random number generator for variation
 * @returns Regionally-appropriate horse name
 *
 * @example
 * const name = generateRegionalName("europe", rng);
 * // Returns e.g., "Epsom Star" or "Pride of Longchamp"
 */
function generateRegionalName(region, rng) {
    var locs = namePools_1.LOCATIONS[region] || namePools_1.LOCATIONS.north_america;
    var sponsors = namePools_1.SPONSORS[region] || namePools_1.SPONSORS.north_america;
    var patterns = [
        function (l, s) { return "".concat(l, " ").concat(s); },
        function (l, s) { return "".concat(s, " of ").concat(l); },
        function (l, s) { return "Pride of ".concat(l); },
        function (l, s) { return "".concat(l, " Star"); },
    ];
    var l = locs[rng.int(0, locs.length - 1)];
    var s = sponsors[rng.int(0, sponsors.length - 1)];
    var pattern = patterns[rng.int(0, patterns.length - 1)];
    return pattern(l, s).slice(0, 18);
}
