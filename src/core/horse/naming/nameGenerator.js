"use strict";
/**
 * nameGenerator.ts - Main procedural horse name generator
 *
 * This file provides the primary interface for generating horse names using various
 * strategies: pedigree-based, thematic, ancestor homage, and regional. It coordinates
 * with sub-modules for specific naming patterns and validates names against Jockey Club rules.
 *
 * Dependencies: @/game/rng (Rng), @/game/types (RegionalSystem), ./pedigreePatterns, ./ancestorHomage, ./thematicNaming, ./regionalConventions, ./jockeyClubRules
 * Related files: horseFactory.ts (uses name generation for horse creation)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProceduralHorseName = generateProceduralHorseName;
var pedigreePatterns_1 = require("./pedigreePatterns");
var ancestorHomage_1 = require("./ancestorHomage");
var thematicNaming_1 = require("./thematicNaming");
var regionalConventions_1 = require("./regionalConventions");
var jockeyClubRules_1 = require("./jockeyClubRules");
/**
 * Generate a procedural horse name based on the provided context and strategy.
 *
 * This is the main entry point for horse name generation. It supports multiple strategies:
 * - pedigree: Combines sire and dam names (portmanteau or word extraction)
 * - ancestor: Pays homage to notable ancestors
 * - thematic: Uses stable personality-based naming themes
 * - regional: Applies regional naming conventions
 * - hybrid: Randomly selects from available strategies based on context
 *
 * @param context - Naming context with pedigree and preferences
 * @param rng - Random number generator for deterministic variation
 * @param options.strategy - Naming strategy to use (defaults to "hybrid")
 * @param options.maxAttempts - Maximum validation attempts (defaults to 20)
 * @returns Generated horse name that passes validation
 *
 * @example
 * const name = generateProceduralHorseName(
 *   { sireName: "Seattle Slew", damName: "Gold Digger", existingNames: new Set() },
 *   rng,
 *   { strategy: "pedigree" }
 * );
 */
function generateProceduralHorseName(context, rng, options) {
    if (options === void 0) { options = {}; }
    var _a = options.strategy, strategy = _a === void 0 ? "hybrid" : _a, _b = options.maxAttempts, maxAttempts = _b === void 0 ? 20 : _b;
    var existingNames = context.existingNames, deceasedNames = context.deceasedNames;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        var candidate = void 0;
        var currentStrategy = strategy === "hybrid" ? pickStrategy(context, rng) : strategy;
        switch (currentStrategy) {
            case "pedigree":
                if (context.sireName && context.damName) {
                    candidate =
                        rng.next() < 0.5
                            ? (0, pedigreePatterns_1.generatePortmanteau)(context.sireName, context.damName, rng)
                            : (0, pedigreePatterns_1.extractAndCombine)(context.sireName, context.damName, rng);
                }
                else if (context.sireName || context.damName) {
                    candidate = (0, pedigreePatterns_1.generateSoundAlike)(context.sireName || context.damName, rng);
                }
                break;
            case "ancestor":
                candidate = (0, ancestorHomage_1.generateAncestorHomage)(context.sireName, context.damName, rng);
                break;
            case "thematic":
                if (context.namingTheme) {
                    candidate = (0, thematicNaming_1.generateThematicName)(context.namingTheme, rng);
                }
                break;
            case "regional":
                if (context.region) {
                    candidate = (0, regionalConventions_1.generateRegionalName)(context.region, rng);
                }
                break;
        }
        // Fallback if strategy failed to produce a name
        if (!candidate) {
            candidate = (0, thematicNaming_1.generateThematicName)("generic", rng);
        }
        // Validate name
        var validation = (0, jockeyClubRules_1.validateHorseName)(candidate, existingNames, deceasedNames);
        if (validation.isValid) {
            return candidate;
        }
    }
    // Final fallback: append a number if all else fails (rare)
    var finalFallback = (0, thematicNaming_1.generateThematicName)("generic", rng);
    return "".concat(finalFallback.slice(0, 14), " ").concat(rng.int(10, 99));
}
function pickStrategy(context, rng) {
    var r = rng.next();
    if (context.sireName && context.damName && r < 0.4)
        return "pedigree";
    if ((context.sireName || context.damName) && r < 0.6)
        return "ancestor";
    if (context.namingTheme && r < 0.85)
        return "thematic";
    if (context.region)
        return "regional";
    return "thematic"; // Default to thematic if no region provided
}
