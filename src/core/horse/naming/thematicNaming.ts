/**
 * Personality-based naming themes for stables.
 */

import type { Rng } from "@/game/rng";
import {
  CLASSICAL_NAMES,
  CELESTIAL_TERMS,
  ARISTOCRATIC_TITLES,
  RACING_TERMS,
  NATURE_TERMS,
  NATURE_TERMS,
  ABSTRACT_TERMS,
  RACING_SPIRIT_ADJECTIVES,
  RACING_SPIRIT_NOUNS
} from "./nameDatabase";

export type NamingTheme = "aggressive" | "conservative" | "developer" | "win-now" | "specialist" | "breeder" | "trader" | "prestige" | "generic";

interface ThemeDefinition {
  wordPools: string[][];
  patterns: string[];
}

const THEMES: Record<NamingTheme, ThemeDefinition> = {
  aggressive: {
    wordPools: [RACING_TERMS, ABSTRACT_TERMS],
    patterns: ["{W1} Surge", "Storm {W1}", "{W1} Force", "Bold {W1}"],
  },
  conservative: {
    wordPools: [CLASSICAL_NAMES, NATURE_TERMS],
    patterns: ["Noble {W1}", "{W1} Heritage", "Stable {W1}", "Classic {W1}"],
  },
  developer: {
    wordPools: [NATURE_TERMS, ABSTRACT_TERMS],
    patterns: ["{W1} Seed", "Future {W1}", "Young {W1}", "{W1} Potential"],
  },
  "win-now": {
    wordPools: [RACING_TERMS, ARISTOCRATIC_TITLES],
    patterns: ["{W1} Now", "Instant {W1}", "{W1} Victory", "Fast {W1}"],
  },
  specialist: {
    wordPools: [CELESTIAL_TERMS, RACING_TERMS],
    patterns: ["{W1} Expert", "Niche {W1}", "{W1} Focus", "Pure {W1}"],
  },
  breeder: {
    wordPools: [CLASSICAL_NAMES, ARISTOCRATIC_TITLES],
    patterns: ["{W1} Line", "Blood {W1}", "Legacy {W1}", "{W1} Heir"],
  },
  trader: {
    wordPools: [ABSTRACT_TERMS, RACING_TERMS],
    patterns: ["{W1} Deal", "Value {W1}", "Bargain {W1}", "Market {W1}"],
  },
    patterns: ["{W1} Elite", "Royal {W1}", "Grand {W1}", "{W1} Excellence"],
  },
  generic: {
    wordPools: [RACING_SPIRIT_ADJECTIVES, RACING_SPIRIT_NOUNS],
    patterns: ["{W1} {W2}", "{W1} {W1}", "{W2} of {W1}"],
  },
};

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
