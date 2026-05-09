"use strict";
/**
 * pedigreePatterns.ts - Pedigree-based naming patterns for horse generation
 *
 * This file provides various strategies for combining sire and dam names into
 * new horse names: portmanteaus, word extraction, sound-alikes, and reverse homages.
 *
 * Dependencies: @/game/rng (Rng)
 * Related files: nameGenerator.ts (uses these patterns for pedigree strategy)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePortmanteau = generatePortmanteau;
exports.extractAndCombine = extractAndCombine;
exports.generateSoundAlike = generateSoundAlike;
exports.generateReverseHomage = generateReverseHomage;
/**
 * Generate a portmanteau from sire and dam names.
 *
 * Combines parts of the sire and dam names with connectors to create a blended name.
 * Example: "Seattle Slew" + "Gold Digger" -> "Slew o' Gold"
 *
 * @param sire - Sire's name
 * @param dam - Dam's name
 * @param rng - Random number generator for variation
 * @returns Portmanteau name combining both parents
 *
 * @example
 * const name = generatePortmanteau("Seattle Slew", "Gold Digger", rng);
 * // Returns e.g., "Slew o' Gold" or "Gold Slew"
 */
function generatePortmanteau(sire, dam, rng) {
    var sireParts = sire.split(" ");
    var damParts = dam.split(" ");
    var s = sireParts[rng.int(0, sireParts.length - 1)];
    var d = damParts[rng.int(0, damParts.length - 1)];
    var connectors = [" o' ", " and ", " ", " ", " "];
    var connector = connectors[rng.int(0, connectors.length - 1)];
    return rng.next() < 0.5 ? "".concat(s).concat(connector).concat(d) : "".concat(d).concat(connector).concat(s);
}
/**
 * Extract words from sire/dam names and combine them.
 *
 * Extracts meaningful words (length > 3) from both parent names and combines them.
 *
 * @param sire - Sire's name
 * @param dam - Dam's name
 * @param rng - Random number generator for word selection
 * @returns Combined name using words from both parents
 *
 * @example
 * const name = extractAndCombine("Northern Dancer", "Gold Digger", rng);
 * // Returns e.g., "Northern Gold" or "Dancer Digger"
 */
function extractAndCombine(sire, dam, rng) {
    var sireWords = sire.split(" ").filter(function (w) { return w.length > 3; });
    var damWords = dam.split(" ").filter(function (w) { return w.length > 3; });
    if (sireWords.length === 0 || damWords.length === 0) {
        return "".concat(sire, " ").concat(dam).slice(0, 18);
    }
    var s = sireWords[rng.int(0, sireWords.length - 1)];
    var d = damWords[rng.int(0, damWords.length - 1)];
    return "".concat(s, " ").concat(d).slice(0, 18);
}
/**
 * Generate a sound-alike name based on a parent.
 *
 * Adds a suffix to the parent name to create a phonetically similar name.
 * Example: "Tapit" -> "Tapiture"
 *
 * @param parent - Parent name to base the sound-alike on
 * @param rng - Random number generator for suffix selection
 * @returns Sound-alike name with added suffix
 *
 * @example
 * const name = generateSoundAlike("Tapit", rng);
 * // Returns e.g., "Tapiture", "Tapitic", "Tapital"
 */
function generateSoundAlike(parent, rng) {
    var suffixes = ["ure", "it", "ic", "al", "on", "er", "ly", "is"];
    var suffix = suffixes[rng.int(0, suffixes.length - 1)];
    if (parent.length > 10) {
        return parent.slice(0, 10) + suffix;
    }
    return parent + suffix;
}
/**
 * Generate a reverse homage (prefix-based homage).
 *
 * Adds a noble or racing-related prefix to the parent name.
 * Example: "Invasor" -> "Sir Invasor" or "Swift Invasor"
 *
 * @param parent - Parent name to pay homage to
 * @param rng - Random number generator for prefix selection
 * @returns Homage name with added prefix
 *
 * @example
 * const name = generateReverseHomage("Invasor", rng);
 * // Returns e.g., "Sir Invasor", "Lady Invasor", "Swift Invasor"
 */
function generateReverseHomage(parent, rng) {
    // Simple implementation: prefix/suffix modification
    var prefixes = ["Sir ", "Lady ", "King ", "Queen ", "Noble ", "Wild ", "Swift "];
    var prefix = prefixes[rng.int(0, prefixes.length - 1)];
    return (prefix + parent).slice(0, 18);
}
