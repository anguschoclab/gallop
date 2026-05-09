"use strict";
/**
 * jockeyClubRules.ts - Jockey Club-style naming validation rules
 *
 * This file provides validation logic for horse names based on real-world
 * Jockey Club rules: length limits, uniqueness checks, prohibited words,
 * trade names, and character restrictions.
 *
 * Dependencies: ./prohibitedWords (OFFENSIVE_WORDS, TRADE_NAMES, RESERVED_NAMES, PROHIBITED_PATTERNS)
 * Related files: nameGenerator.ts (uses validation for name generation), prohibitedWords.ts (prohibited word lists)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHorseName = validateHorseName;
var prohibitedWords_1 = require("./prohibitedWords");
/**
 * Validates a horse name against Jockey Club-inspired rules.
 *
 * Performs the following checks:
 * 1. Length: max 18 characters
 * 2. Uniqueness: not used by active horses (deceased names can be reused)
 * 3. Offensive language: no offensive words
 * 4. Trade names: no commercial trade names
 * 5. Reserved names: no reserved/historical names
 * 6. Prohibited patterns: no numbers or special characters
 * 7. Character set: only letters, spaces, hyphens, and apostrophes
 *
 * @param name - The name to validate
 * @param existingNames - Set of active horse names in the current game
 * @param deceasedNames - Set of names in the Hall of Fame (can be reused)
 * @returns Validation result with isValid flag and optional reason
 *
 * @example
 * const validation = validateHorseName("Thunder", existingNames, deceasedNames);
 * if (validation.isValid) {
 *   console.log("Name is valid");
 * } else {
 *   console.log(validation.reason);
 * }
 */
function validateHorseName(name, existingNames, deceasedNames) {
    var trimmed = name.trim();
    // 1. Length rule (max 18 characters)
    if (trimmed.length === 0)
        return { isValid: false, reason: "Name cannot be empty." };
    if (trimmed.length > 18)
        return { isValid: false, reason: "Name cannot exceed 18 characters." };
    // 2. Uniqueness rule (against active horses)
    var lowerName = trimmed.toLowerCase();
    if (existingNames.has(lowerName)) {
        // If it's in deceasedNames, it can be reused (Jockey Club rule)
        if (!deceasedNames || !deceasedNames.has(lowerName)) {
            return { isValid: false, reason: "Name is already in use by an active horse." };
        }
    }
    // 3. Offensive words
    if (prohibitedWords_1.OFFENSIVE_WORDS.some(function (w) { return lowerName.includes(w.toLowerCase()); })) {
        return { isValid: false, reason: "Name contains offensive language." };
    }
    // 4. Trade names
    if (prohibitedWords_1.TRADE_NAMES.some(function (w) { return lowerName.includes(w.toLowerCase()); })) {
        return { isValid: false, reason: "Name cannot contain commercial trade names." };
    }
    // 5. Reserved names
    if (prohibitedWords_1.RESERVED_NAMES.some(function (w) { return lowerName === w.toLowerCase(); })) {
        return { isValid: false, reason: "Name is reserved and cannot be used." };
    }
    // 6. Prohibited patterns (numbers, special characters)
    if (prohibitedWords_1.PROHIBITED_PATTERNS.some(function (p) { return p.test(trimmed); })) {
        return { isValid: false, reason: "Name contains prohibited characters or numbers." };
    }
    // 7. Standard character check (allow only letters, spaces, hyphens, and apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
        return {
            isValid: false,
            reason: "Name can only contain letters, spaces, hyphens, and apostrophes.",
        };
    }
    return { isValid: true };
}
