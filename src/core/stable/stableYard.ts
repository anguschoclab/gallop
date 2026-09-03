/**
 * stableYard.ts - Named training yards for every stable
 *
 * Each stable trains out of a physical yard: a named barn in a real-feeling
 * town, with a box (stall) capacity. Yards are derived deterministically from
 * the stable's identity, so existing saves gain yards without a migration and
 * a given stable always shows the same yard.
 *
 * Pure derivation only - no state mutation.
 *
 * Dependencies: @/core/stable/types
 * Related files: src/core/stable/portfolio.ts, src/components/market/ExchangePanel.tsx
 */

import type { Stable } from "@/core/stable/types";

export type StableYard = {
  /** Yard/barn name, e.g. "Ashcombe Yard". */
  name: string;
  /** Town the yard sits in. */
  town: string;
  /** Training country/region label. */
  region: string;
  /** Number of boxes (stalls) the yard holds. */
  boxes: number;
};

const YARD_QUALIFIERS = [
  "Yard",
  "Barn",
  "Stables",
  "Training Centre",
  "Paddocks",
  "Gallops",
  "Lodge",
  "Farm",
];

const YARD_ROOTS = [
  "Ashcombe",
  "Beckhollow",
  "Cairnwell",
  "Dunmarrow",
  "Elmsworth",
  "Fenmoor",
  "Glenarra",
  "Harrowdean",
  "Inverloch",
  "Kilbraden",
  "Langmere",
  "Mardenhill",
  "Northbrook",
  "Oakhanger",
  "Pentrewood",
  "Quarrybank",
  "Redlands",
  "Stonebridge",
  "Thornlea",
  "Ullswick",
  "Vinehill",
  "Westermoor",
  "Yarrowfield",
  "Ravensdown",
];

const TOWNS_BY_COUNTRY: Record<string, string[]> = {
  "United Kingdom": ["Newmarket", "Lambourn", "Malton", "Middleham", "Epsom"],
  Ireland: ["The Curragh", "Fethard", "Naas", "Gowran", "Tipperary"],
  France: ["Chantilly", "Deauville", "Pau", "Maisons-Laffitte", "Senonnes"],
  USA: ["Lexington", "Ocala", "Saratoga", "Del Mar", "Elmont"],
  "United States": ["Lexington", "Ocala", "Saratoga", "Del Mar", "Elmont"],
  Japan: ["Miho", "Ritto", "Hidaka", "Shizunai", "Urakawa"],
  Australia: ["Flemington", "Cranbourne", "Rosehill", "Ballarat", "Caulfield"],
  "New Zealand": ["Matamata", "Cambridge", "Riccarton", "Awapuni", "Te Rapa"],
  Germany: ["Cologne", "Iffezheim", "Mulheim", "Hoppegarten", "Dortmund"],
  Italy: ["Pisa", "Rome", "Milan", "Varese", "Grosseto"],
  "Hong Kong": ["Sha Tin", "Conghua", "Happy Valley", "Tuen Mun", "Yuen Long"],
  UAE: ["Al Quoz", "Zabeel", "Marmoom", "Sharjah", "Al Ain"],
};

const DEFAULT_TOWNS = ["Fairhaven", "Kingsmere", "Rosedale", "Aldermoor", "Highvale"];

/**
 * Stable, deterministic 32-bit hash of a string.
 *
 * @param input - String to hash
 */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length] as T;
}

/**
 * Box capacity band per stable tier.
 *
 * @param tier - Stable tier
 * @param seed - Deterministic seed
 */
function boxesForTier(tier: Stable["tier"], seed: number): number {
  const bands: Record<string, [number, number]> = {
    elite: [90, 180],
    mid: [45, 90],
    budget: [12, 40],
  };
  const [min, max] = bands[tier] ?? [12, 40];
  return min + (seed % (max - min + 1));
}

/**
 * Resolve the yard a stable trains from, using its stored yard when present.
 *
 * @param stable - Stable to resolve a yard for
 * @returns The stable's named yard
 */
export function resolveStableYard(stable: Stable): StableYard {
  if (stable.yard) return stable.yard;

  const seed = hash(`${stable.id}:${stable.name}`);
  const country = stable.country ?? "";
  const towns = TOWNS_BY_COUNTRY[country] ?? DEFAULT_TOWNS;

  // Elite yards are often named after the stable itself; others take a root name.
  const root =
    stable.tier === "elite" && stable.name.split(" ").length > 1
      ? (stable.name.split(" ")[0] as string)
      : pick(YARD_ROOTS, seed >>> 3);

  return {
    name: `${root} ${pick(YARD_QUALIFIERS, seed >>> 7)}`,
    town: pick(towns, seed >>> 11),
    region: country || "Home circuit",
    boxes: boxesForTier(stable.tier, seed >>> 13),
  };
}

/**
 * Short one-line yard label, e.g. "Ashcombe Yard, Newmarket".
 *
 * @param yard - Yard to format
 * @returns Human readable yard label
 */
export function formatYard(yard: StableYard): string {
  return `${yard.name}, ${yard.town}`;
}
