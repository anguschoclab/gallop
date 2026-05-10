/**
 * pedigreePatterns.ts - Pedigree-based naming patterns for horse generation
 *
 * This file provides various strategies for combining sire and dam names into
 * new horse names: portmanteaus, word extraction, sound-alikes, and reverse homages.
 *
 * Dependencies: @/game/rng (Rng)
 * Related files: nameGenerator.ts (uses these patterns for pedigree strategy)
 */

import type { Rng } from "@/game/rng";
import { PARENT_NAME_MAX_LENGTH } from "@/game/constants/gameConstants";

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
export function generatePortmanteau(sire: string, dam: string, rng: Rng): string {
  const sireParts = sire.split(" ");
  const damParts = dam.split(" ");

  const s = sireParts[rng.int(0, sireParts.length - 1)];
  const d = damParts[rng.int(0, damParts.length - 1)];

  const connectors = [" o' ", " and ", " ", " ", " "];
  const connector = connectors[rng.int(0, connectors.length - 1)];

  return rng.next() < 0.5 ? `${s}${connector}${d}` : `${d}${connector}${s}`;
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
export function extractAndCombine(sire: string, dam: string, rng: Rng): string {
  const sireWords = sire.split(" ").filter((w) => w.length > 3);
  const damWords = dam.split(" ").filter((w) => w.length > 3);

  if (sireWords.length === 0 || damWords.length === 0) {
    return `${sire} ${dam}`.slice(0, 18);
  }

  const s = sireWords[rng.int(0, sireWords.length - 1)];
  const d = damWords[rng.int(0, damWords.length - 1)];

  return `${s} ${d}`.slice(0, 18);
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
export function generateSoundAlike(parent: string, rng: Rng): string {
  const suffixes = ["ure", "it", "ic", "al", "on", "er", "ly", "is"];
  const suffix = suffixes[rng.int(0, suffixes.length - 1)];

  if (parent.length > PARENT_NAME_MAX_LENGTH) {
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
export function generateReverseHomage(parent: string, rng: Rng): string {
  // Simple implementation: prefix/suffix modification
  const prefixes = ["Sir ", "Lady ", "King ", "Queen ", "Noble ", "Wild ", "Swift "];
  const prefix = prefixes[rng.int(0, prefixes.length - 1)];

  return (prefix + parent).slice(0, 18);
}
