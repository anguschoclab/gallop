/**
 * thematicNaming.ts - Personality-based naming themes for stables
 *
 * This file provides theme-based name generation tied to stable personalities.
 * Each theme has specific word pools and naming patterns that reflect the stable's
 * approach to racing (aggressive, conservative, breeder, etc.).
 *
 * Dependencies: @/game/rng (Rng), ./nameDatabase (word pools)
 * Related files: nameGenerator.ts (uses this for thematic strategy), stableConfig.ts (personality definitions)
 */

import type { Rng } from "@/core/common/rng";
import {
  CLASSICAL_NAMES,
  CELESTIAL_TERMS,
  ARISTOCRATIC_TITLES,
  RACING_TERMS,
  NATURE_TERMS,
  ABSTRACT_TERMS,
  RACING_SPIRIT_ADJECTIVES,
  RACING_SPIRIT_NOUNS,
} from "./nameDatabase";

/**
 * Naming themes corresponding to stable personalities.
 */
export type NamingTheme =
  | "aggressive"
  | "conservative"
  | "developer"
  | "win-now"
  | "specialist"
  | "breeder"
  | "trader"
  | "prestige"
  | "generic";

interface ThemeDefinition {
  wordPools: string[][];
  patterns: string[];
}

const THEMES: Record<NamingTheme, ThemeDefinition> = {
  aggressive: {
    wordPools: [RACING_TERMS, ABSTRACT_TERMS],
    patterns: [
      "{W1} Surge", "Storm {W1}", "{W1} Force", "Bold {W1}",
      "{W1} {W2}", "Fierce {W1}", "{W1} Strike", "{W2} of {W1}",
      "Unstoppable {W1}", "Wild {W2}", "{W1} Blast", "{W1} Attack",
      "Relentless {W2}", "{W2} Warning"
    ],
  },
  conservative: {
    wordPools: [CLASSICAL_NAMES, NATURE_TERMS],
    patterns: [
      "Noble {W1}", "{W1} Heritage", "Stable {W1}", "Classic {W1}",
      "{W1} {W2}", "The {W1} {W2}", "Mount {W1}", "{W2} of {W1}",
      "Classic {W2}", "Ancient {W2}", "{W1} Tradition", "Steady {W2}",
      "{W1} Legacy", "{W2} Echoes"
    ],
  },
  developer: {
    wordPools: [NATURE_TERMS, ABSTRACT_TERMS],
    patterns: [
      "{W1} Seed", "Future {W1}", "Young {W1}", "{W1} Potential",
      "{W1} {W2}", "Growing {W1}", "{W2} Rising", "Project {W1}",
      "{W1} Vision", "New {W2}", "{W1} Promise", "{W1} Evolution",
      "Spring {W2}", "Raw {W1}"
    ],
  },
  "win-now": {
    wordPools: [RACING_TERMS, ARISTOCRATIC_TITLES],
    patterns: [
      "{W1} Now", "Instant {W1}", "{W1} Victory", "Fast {W1}",
      "{W2} of {W1}", "Sudden {W1}", "{W1} {W2}", "Prime {W1}",
      "Immediate {W1}", "{W2} Glory", "Right Now {W2}", "Absolute {W1}",
      "Top {W2}", "{W2} Command"
    ],
  },
  specialist: {
    wordPools: [CELESTIAL_TERMS, RACING_TERMS],
    patterns: [
      "{W1} Expert", "Niche {W1}", "{W1} Focus", "Pure {W1}",
      "{W1} {W2}", "{W1} Target", "Precision {W2}", "{W1} Logic",
      "{W2} from {W1}", "{W1} Specialist", "Tactical {W1}", "Focus on {W2}",
      "{W1} Method", "Calculated {W2}"
    ],
  },
  breeder: {
    wordPools: [CLASSICAL_NAMES, ARISTOCRATIC_TITLES],
    patterns: [
      "{W1} Line", "Blood {W1}", "Legacy {W1}", "{W1} Heir",
      "{W2} {W1}", "{W1} Dynasty", "House of {W1}", "{W2} Lineage",
      "{W1} Heritage", "Royal {W1}", "{W2} Blood", "The {W1} Family",
      "Pure {W2}", "Crown of {W1}"
    ],
  },
  trader: {
    wordPools: [ABSTRACT_TERMS, RACING_TERMS],
    patterns: [
      "{W1} Deal", "Value {W1}", "Bargain {W1}", "Market {W1}",
      "{W1} {W2}", "Asset {W1}", "Prime {W2}", "{W1} Exchange",
      "Lucky {W2}", "{W1} Investment", "Golden {W2}", "{W1} Return",
      "Margin of {W2}", "Smart {W1}"
    ],
  },
  prestige: {
    wordPools: [ABSTRACT_TERMS],
    patterns: [
      "{W1} Elite", "Royal {W1}", "Grand {W1}", "{W1} Excellence",
      "Supreme {W1}", "Crown of {W1}", "Majestic {W1}", "{W1} Sovereign",
      "The {W1}", "Prime {W1}", "{W1} Dynasty", "{W1} Prestige",
      "True {W1}", "Honor of {W1}"
    ],
  },
  generic: {
    wordPools: [RACING_SPIRIT_ADJECTIVES, RACING_SPIRIT_NOUNS],
    patterns: [
      "{W1} {W2}", "{W1} {W1}", "{W2} of {W1}",
      "The {W1} {W2}", "{W2} {W2}", "Brave {W2}", "{W1} Heart",
      "{W1} Rider", "True {W2}", "{W1} Journey", "Spirit of {W2}",
      "{W2} Legend", "Fierce {W2}", "{W1} Magic"
    ],
  },
};

/**
 * Generate a name based on a naming theme.
 *
 * Selects a pattern from the theme and fills in placeholders with words from
 * the theme's word pools. Patterns use {W1} and {W2} placeholders for word insertion.
 *
 * @param theme - The naming theme to use
 * @param rng - Random number generator for pattern and word selection
 * @returns Generated name matching the theme's style
 *
 * @example
 * const name = generateThematicName("aggressive", rng);
 * // Returns e.g., "Storm Surge" or "Bold Victory"
 */
export function generateThematicName(theme: NamingTheme, rng: Rng): string {
  const def = THEMES[theme];
  const pool = def.wordPools[rng.int(0, def.wordPools.length - 1)];
  const word = pool[rng.int(0, pool.length - 1)];
  const pattern = def.patterns[rng.int(0, def.patterns.length - 1)];

  let name = pattern;
  if (pattern.includes("{W1}")) {
    const w1 = def.wordPools[0][rng.int(0, def.wordPools[0].length - 1)];
    name = name.replace("{W1}", w1);
  }
  if (pattern.includes("{W2}")) {
    const w2 = def.wordPools[1][rng.int(0, def.wordPools[1].length - 1)];
    name = name.replace("{W2}", w2);
  }

  return name.slice(0, 18);
}
