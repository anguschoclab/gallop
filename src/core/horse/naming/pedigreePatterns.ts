/**
 * Pedigree-based naming patterns for horse generation.
 */

import type { Rng } from "@/game/rng";

/**
 * Generate a portmanteau from sire and dam names.
 * Example: "Seattle Slew" + "Gold Digger" -> "Slew o' Gold"
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
 * Example: "Tapit" -> "Tapiture"
 */
export function generateSoundAlike(parent: string, rng: Rng): string {
  const suffixes = ["ure", "it", "ic", "al", "on", "er", "ly", "is"];
  const suffix = suffixes[rng.int(0, suffixes.length - 1)];

  if (parent.length > 10) {
    return parent.slice(0, 10) + suffix;
  }

  return parent + suffix;
}

/**
 * Generate a reverse homage (synonyms or related concepts).
 * Example: "Invasor" -> "Invincible"
 */
export function generateReverseHomage(parent: string, rng: Rng): string {
  // Simple implementation: prefix/suffix modification
  const prefixes = ["Sir ", "Lady ", "King ", "Queen ", "Noble ", "Wild ", "Swift "];
  const prefix = prefixes[rng.int(0, prefixes.length - 1)];

  return (prefix + parent).slice(0, 18);
}
