/**
 * bruceLowe.ts - Bruce Lowe Figure System for pedigree families
 *
 * This file implements Bruce Lowe's historical Figure System, which categorizes
 * thoroughbreds by tail-female lineage into ~43 numbered families based on
 * historical wins in the English Classics. While scientifically discredited,
 * it remains culturally embedded and expected by players.
 *
 * Dependencies: @/game/types (Horse, GameState), @/game/rng (Rng), @/core/data/pedigreeData (findHorseByName)
 * Related files: horseFactory.ts (uses resolveBruceLoweFamily for horse generation), populationGenetics.ts (uses family data)
 */

import type { Horse, GameState } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { nondeterministicRng } from "@/core/common/rng";
import { findHorseByName } from "@/data/pedigreeData";

// Bruce Lowe's "Figure System": every thoroughbred traces tail-female to one
// of ~43 root mares, each numbered by historical wins in the English Classics.
// Family 1 = most wins, Family 43 = fewest. Modern DNA research has discredited
// the system scientifically but it remains culturally embedded — players
// expect to see it on every pedigree.
//
// Roles per the historical literature:
//   "Running" families (1-5): produce winners of the Classics.
//   "Sire" families (3, 8, 11, 12, 14): produce influential stallions.
// Family 3 is in both lists by tradition.

export const RUNNING_FAMILIES = new Set([1, 2, 3, 4, 5]);
export const SIRE_FAMILIES = new Set([3, 8, 11, 12, 14]);

/**
 * Determine the role of a Bruce Lowe family.
 *
 * Returns whether a family is known for producing race winners, influential
 * stallions, both, or is a standard family.
 *
 * @param family - The Bruce Lowe family number
 * @returns Family role classification
 *
 * @example
 * const role = familyRole(3);
 * // Returns "Both" (Family 3 is both running and sire family)
 */
export function familyRole(
  family: number | undefined,
): "Running" | "Sire" | "Both" | "Standard" | "Unknown" {
  if (family === undefined) return "Unknown";
  const running = RUNNING_FAMILIES.has(family);
  const sire = SIRE_FAMILIES.has(family);
  if (running && sire) return "Both";
  if (running) return "Running";
  if (sire) return "Sire";
  return "Standard";
}

// Walk a horse's recorded pedigree (via Pedigree.damId chain in state.horses,
// and falling back to the curated pedigreeData findHorseByName for foundation
// stock) until we hit a mare with a known bruceLoweFamily number.
/**
 * Resolve the Bruce Lowe family number for a horse.
 *
 * Walks the horse's tail-female pedigree through both live horses and curated
 * foundation data until finding a mare with a known Bruce Lowe family number.
 *
 * @param horse - The horse to resolve the family for
 * @param state - Game state containing the horses array
 * @param depth - Current recursion depth (for internal use)
 * @returns Bruce Lowe family number, or undefined if not found
 *
 * @example
 * const family = resolveBruceLoweFamily(horse, gameState);
 */
export function resolveBruceLoweFamily(
  horse: Horse,
  state: Pick<GameState, "horses"> & { horseMap?: Map<string, Horse> },
  depth: number = 0,
): number | undefined {
  if (depth > 6) return undefined;
  if (horse.bruceLoweFamily !== undefined) return horse.bruceLoweFamily;

  // Step 1: walk dam line through live horses.
  const damId = horse.pedigree?.damId;
  const dam = damId
    ? state.horseMap
      ? state.horseMap.get(damId)
      : state.horses.find((h) => h.id === damId)
    : undefined;
  if (dam) {
    if (dam.bruceLoweFamily !== undefined) return dam.bruceLoweFamily;
    const recursive = resolveBruceLoweFamily(dam, state, depth + 1);
    if (recursive !== undefined) return recursive;
  }

  // Step 2: walk dam line through curated foundation data via name.
  let damName: string | undefined = horse.pedigree?.damName ?? horse.damName;
  let safety = 0;
  while (damName && safety++ < 6) {
    const found = findHorseByName(damName);
    if (!found) break;
    if (found.bruceLoweFamily !== undefined) return found.bruceLoweFamily;
    damName = found.dam;
  }

  return undefined;
}

// Resolve and cache Bruce Lowe family on each newly generated horse, sampled
// from a roughly empirical distribution. Earlier numbers are more common in
// the real-world stud book — Family 1 alone accounts for ~15% of modern
// thoroughbreds. This gives procedural mares (NPC + market) a family
// without needing a full fictitious pedigree tree.
const PROCEDURAL_FAMILIES = [
  // [familyNumber, weight] — weights chosen so 1-5 are common, 6-15 mid, rest rare.
  ...[1, 2, 3, 4, 5].map((f) => [f, 12] as const),
  ...[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((f) => [f, 5] as const),
  ...[16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((f) => [f, 2] as const),
];

/**
 * Roll a procedural Bruce Lowe family number.
 *
 * Samples from a weighted distribution that mirrors real-world stud book
 * frequencies (families 1-5 are most common). Used for NPC and market horses
 * that don't have full pedigrees.
 *
 * @param rng - Random number generator (optional, defaults to Math.random)
 * @returns Bruce Lowe family number
 *
 * @example
 * const family = rollProceduralFamily(rng);
 */
export function rollProceduralFamily(rng?: Rng): number {
  const _rng = rng || nondeterministicRng();
  const total = PROCEDURAL_FAMILIES.reduce((s, [, w]) => s + w, 0);
  let pick = _rng.next() * total;
  for (const [family, weight] of PROCEDURAL_FAMILIES) {
    pick -= weight;
    if (pick <= 0) return family;
  }
  return 1;
}
