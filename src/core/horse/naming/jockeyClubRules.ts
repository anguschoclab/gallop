/**
 * Jockey Club-style naming validation rules.
 */

import { OFFENSIVE_WORDS, TRADE_NAMES, RESERVED_NAMES, PROHIBITED_PATTERNS } from "./prohibitedWords";

export interface NameValidation {
  isValid: boolean;
  reason?: string;
}

/**
 * Validates a horse name against Jockey Club-inspired rules.
 * @param name The name to validate.
 * @param existingNames Set of active horse names in the current game.
 * @param deceasedNames Set of names in the Hall of Fame (can be reused).
 */
export function validateHorseName(
  name: string,
  existingNames: Set<string>,
  deceasedNames?: Set<string>
): NameValidation {
  const trimmed = name.trim();

  // 1. Length rule (max 18 characters)
  if (trimmed.length === 0) return { isValid: false, reason: "Name cannot be empty." };
  if (trimmed.length > 18) return { isValid: false, reason: "Name cannot exceed 18 characters." };

  // 2. Uniqueness rule (against active horses)
  const lowerName = trimmed.toLowerCase();
  if (existingNames.has(lowerName)) {
    // If it's in deceasedNames, it can be reused (Jockey Club rule)
    if (!deceasedNames || !deceasedNames.has(lowerName)) {
      return { isValid: false, reason: "Name is already in use by an active horse." };
    }
  }

  // 3. Offensive words
  if (OFFENSIVE_WORDS.some(w => lowerName.includes(w.toLowerCase()))) {
    return { isValid: false, reason: "Name contains offensive language." };
  }

  // 4. Trade names
  if (TRADE_NAMES.some(w => lowerName.includes(w.toLowerCase()))) {
    return { isValid: false, reason: "Name cannot contain commercial trade names." };
  }

  // 5. Reserved names
  if (RESERVED_NAMES.some(w => lowerName === w.toLowerCase())) {
    return { isValid: false, reason: "Name is reserved and cannot be used." };
  }

  // 6. Prohibited patterns (numbers, special characters)
  if (PROHIBITED_PATTERNS.some(p => p.test(trimmed))) {
    return { isValid: false, reason: "Name contains prohibited characters or numbers." };
  }

  // 7. Standard character check (allow only letters, spaces, hyphens, and apostrophes)
  if (!/^[a-zA-Z\s\-\']+$/.test(trimmed)) {
    return { isValid: false, reason: "Name can only contain letters, spaces, hyphens, and apostrophes." };
  }

  return { isValid: true };
}
