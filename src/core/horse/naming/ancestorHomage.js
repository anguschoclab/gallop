"use strict";
/**
 * ancestorHomage.ts - Ancestor homage naming logic
 *
 * This file provides functionality for generating horse names that pay homage
 * to notable ancestors in the pedigree. It looks up sire and dam ancestors
 * and applies homage patterns like "Legacy", "Spirit", "Jr.", etc.
 *
 * Dependencies: @/game/rng (Rng), @/core/data/pedigreeData (findHorseByName)
 * Related files: nameGenerator.ts (uses this for ancestor strategy), pedigreeData.ts (ancestor data)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAncestorHomage = generateAncestorHomage;
var pedigreeData_1 = require("@/core/data/pedigreeData");
var nameDatabase_1 = require("./nameDatabase");
/**
 * Extracts a significant key word from a horse name.
 * Filters out short words and prefers the last word or longest word.
 */
function extractKeyWord(name, rng) {
    var words = name.split(" ").filter(function (w) { return w.length > 2; });
    if (words.length === 0)
        return name;
    if (words.length === 1)
        return words[0];
    // Real-life names often use the last word (e.g., Seattle Slew -> Slew)
    // or the most unique one. We'll favor the last word or a random long word.
    return rng.next() < 0.7 ? words[words.length - 1] : words[rng.int(0, words.length - 1)];
}
/**
 * Generate a name based on a notable ancestor using real-life inspired patterns.
 *
 * This version extracts key words from both the sire and dam lines (or fallbacks)
 * and combines them using authentic homage patterns like "[Sire]'s [Dam]" or "[Sire] o' [Dam]".
 *
 * @param sireName - Name of the sire for ancestor lookup
 * @param damName - Name of the dam for ancestor lookup
 * @param rng - Random number generator for pattern selection
 * @returns Homage name string, or undefined if no context found
 *
 * @example
 * const name = generateAncestorHomage("Seattle Slew", "Gold Digger", rng);
 * // Returns e.g., "Slew's Gold" or "Slew o' Gold"
 */
function generateAncestorHomage(sireName, damName, rng) {
    var sireSide = [];
    var damSide = [];
    if (sireName) {
        sireSide.push(sireName);
        var sire = (0, pedigreeData_1.findHorseByName)(sireName);
        if (sire === null || sire === void 0 ? void 0 : sire.sire)
            sireSide.push(sire.sire);
        if (sire === null || sire === void 0 ? void 0 : sire.dam)
            sireSide.push(sire.dam);
    }
    if (damName) {
        damSide.push(damName);
        var dam = (0, pedigreeData_1.findHorseByName)(damName);
        if (dam === null || dam === void 0 ? void 0 : dam.sire)
            damSide.push(dam.sire);
        if (dam === null || dam === void 0 ? void 0 : dam.dam)
            damSide.push(dam.dam);
    }
    if (sireSide.length === 0 && damSide.length === 0)
        return undefined;
    var key1;
    var key2;
    if (sireSide.length > 0 && damSide.length > 0) {
        // Both sides known: Combine them
        key1 = extractKeyWord(sireSide[rng.int(0, sireSide.length - 1)], rng);
        key2 = extractKeyWord(damSide[rng.int(0, damSide.length - 1)], rng);
    }
    else {
        // Partial pedigree: Combine known side with dictionary
        var knownSide = sireSide.length > 0 ? sireSide : damSide;
        key1 = extractKeyWord(knownSide[rng.int(0, knownSide.length - 1)], rng);
        var pool = rng.next() < 0.5 ? nameDatabase_1.RACING_SPIRIT_NOUNS : nameDatabase_1.ABSTRACT_TERMS;
        key2 = pool[rng.int(0, pool.length - 1)];
    }
    var patterns = [
        function (k1, k2) { return "".concat(k1, "'s ").concat(k2); },
        function (k1, k2) { return "".concat(k1, " o' ").concat(k2); },
        function (k1, k2) { return "".concat(k1, " ").concat(k2); },
        function (k1, k2) { return "".concat(k2, " of ").concat(k1); },
        function (k1, k2) {
            var adj = nameDatabase_1.RACING_SPIRIT_ADJECTIVES[rng.int(0, nameDatabase_1.RACING_SPIRIT_ADJECTIVES.length - 1)];
            return "".concat(adj, " ").concat(k1);
        },
    ];
    var pattern = patterns[rng.int(0, patterns.length - 1)];
    var result = pattern(key1, key2);
    // Apply Jockey Club length limit (18 chars)
    return result.length > 18 ? result.slice(0, 18).trim() : result;
}
