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

import {
  OFFENSIVE_WORDS,
  TRADE_NAMES,
  RESERVED_NAMES,
  PROHIBITED_PATTERNS,
} from "./prohibitedWords";
import type { ReservedNameEntry } from "./reservedNames";
import { isNameReserved } from "./reservedNames";

/**
 * Result of name validation with optional reason for failure.
 */
export interface NameValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates a horse name against Jockey Club-inspired rules.
 *
 * Performs the following checks:
 * 1. Length: max 18 characters
 * 2. Uniqueness: not used by active horses
 * 3. Reserved names: not reserved due to recent horse death (25-year reservation)
 * 4. Offensive language: no offensive words
 * 5. Trade names: no commercial trade names
 * 6. Historical reserved names: no reserved/historical names
 * 7. Prohibited patterns: no numbers or special characters
 * 8. Character set: only letters, spaces, hyphens, and apostrophes
 *
 * @param name - The name to validate
 * @param existingNames - Set of active horse names in the current game
 * @param reservedNames - Array of reserved name entries from deceased horses
 * @param currentDay - Current game day for checking reservation expiry
 * @returns Validation result with isValid flag and optional reason
 *
 * @example
 * const validation = validateHorseName("Thunder", existingNames, reservedNames, currentDay);
 * if (validation.isValid) {
 *   console.log("Name is valid");
 * } else {
 *   console.log(validation.reason);
 * }
 */
export function validateHorseName(
  name: string,
  existingNames: Set<string>,
  reservedNames?: ReservedNameEntry[],
  currentDay?: number,
): { isValid: boolean; reason?: string } {
  const trimmed = name.trim();
  const lowerName = trimmed.toLowerCase();

  // 1. Length check
  if (trimmed.length === 0) {
    return { isValid: false, reason: "Name cannot be empty." };
  }

  if (trimmed.length > 18) {
    return { isValid: false, reason: "Name cannot exceed 18 characters." };
  }

  // 2. Uniqueness check - name must not be in use by active horse
  if (existingNames.has(lowerName)) {
    return { isValid: false, reason: "Name is already in use by an active horse." };
  }

  // 3. Reserved name check - name must not be within 25-year reservation period
  if (reservedNames && currentDay !== undefined) {
    if (isNameReserved(name, reservedNames, currentDay)) {
      return { isValid: false, reason: "Name is reserved for 25 years after the horse's death." };
    }
  }

  // 3. Offensive words (check for whole words only, not substrings)
  for (const word of OFFENSIVE_WORDS) {
    const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, "i");
    if (regex.test(lowerName)) {
      return { isValid: false, reason: "Name contains offensive language." };
    }
  }

  // 4. Trade names
  if (TRADE_NAMES.some((w) => lowerName.includes(w.toLowerCase()))) {
    return { isValid: false, reason: "Name cannot contain commercial trade names." };
  }

  // 5. Reserved names
  if (RESERVED_NAMES.some((w) => lowerName === w.toLowerCase())) {
    return { isValid: false, reason: "Name is reserved and cannot be used." };
  }

  // 6. Prohibited patterns (numbers, special characters)
  if (PROHIBITED_PATTERNS.some((p) => p.test(trimmed))) {
    return { isValid: false, reason: "Name contains prohibited characters or numbers." };
  }

  return { isValid: true };
}
