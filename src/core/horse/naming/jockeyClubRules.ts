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
export function validateHorseName(
  name: string,
  existingNames: Set<string>,
  deceasedNames?: Set<string>,
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

  // 2. Uniqueness check (allow reuse of deceased names)
  if (existingNames.has(lowerName)) {
    // Check if it's a deceased name that can be reused
    if (deceasedNames && deceasedNames.has(lowerName)) {
      // Allow reuse of deceased names
    } else {
      return { isValid: false, reason: "Name is already in use by an active horse." };
    }
  }

  // 3. Offensive words
  if (OFFENSIVE_WORDS.some((w) => lowerName.includes(w.toLowerCase()))) {
    return { isValid: false, reason: "Name contains offensive language." };
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

  // Debug logging
  console.log(`Validation passed for: ${trimmed}`);

  return { isValid: true };
}
