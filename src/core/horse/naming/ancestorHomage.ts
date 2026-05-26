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

import type { Rng } from "@/game/rng";
import { NAME_MIN_WORD_LENGTH } from "@/game/constants";
import { findHorseByName } from "@/core/data/pedigreeData";
import { ABSTRACT_TERMS, RACING_SPIRIT_NOUNS, RACING_SPIRIT_ADJECTIVES } from "./nameDatabase";

/**
 * Extracts a significant key word from a horse name.
 * Filters out short words and prefers the last word or longest word.
 *
 * @param name - The horse name to extract from
 * @param rng - Random number generator for selection
 * @returns A single significant word from the name
 */
function extractKeyWord(name: string, rng: Rng): string {
  const words = name.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return name;
  if (words.length === 1) return words[0];

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
export function generateAncestorHomage(
  sireName: string | undefined,
  damName: string | undefined,
  rng: Rng,
): string | undefined {
  const sireSide: string[] = [];
  const damSide: string[] = [];

  if (sireName) {
    sireSide.push(sireName);
    const sire = findHorseByName(sireName);
    if (sire?.sire) sireSide.push(sire.sire);
    if (sire?.dam) sireSide.push(sire.dam);
  }

  if (damName) {
    damSide.push(damName);
    const dam = findHorseByName(damName);
    if (dam?.sire) damSide.push(dam.sire);
    if (dam?.dam) damSide.push(dam.dam);
  }

  if (sireSide.length === 0 && damSide.length === 0) return undefined;

  let key1: string;
  let key2: string;

  if (sireSide.length > 0 && damSide.length > 0) {
    // Both sides known: Combine them
    key1 = extractKeyWord(sireSide[rng.int(0, sireSide.length - 1)], rng);
    key2 = extractKeyWord(damSide[rng.int(0, damSide.length - 1)], rng);
  } else {
    // Partial pedigree: Combine known side with dictionary
    const knownSide = sireSide.length > 0 ? sireSide : damSide;
    key1 = extractKeyWord(knownSide[rng.int(0, knownSide.length - 1)], rng);

    const pool = rng.next() < 0.5 ? RACING_SPIRIT_NOUNS : ABSTRACT_TERMS;
    key2 = pool[rng.int(0, pool.length - 1)];
  }

  const patterns = [
    (k1: string, k2: string) => `${k1}'s ${k2}`,
    (k1: string, k2: string) => `${k1} o' ${k2}`,
    (k1: string, k2: string) => `${k1} ${k2}`,
    (k1: string, k2: string) => `${k2} of ${k1}`,
    (k1: string, k2: string) => {
      const adj = RACING_SPIRIT_ADJECTIVES[rng.int(0, RACING_SPIRIT_ADJECTIVES.length - 1)];
      return `${adj} ${k1}`;
    },
  ];

  const pattern = patterns[rng.int(0, patterns.length - 1)];
  const result = pattern(key1, key2);

  // Apply Jockey Club length limit (18 chars)
  return result.length > 18 ? result.slice(0, 18).trim() : result;
}
