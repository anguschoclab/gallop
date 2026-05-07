/**
 * Ancestor homage naming logic.
 */

import type { Rng } from "@/game/rng";
import { findHorseByName } from "@/core/data/pedigreeData";

/**
 * Generate a name based on a notable ancestor.
 */
export function generateAncestorHomage(
  sireName: string | undefined,
  damName: string | undefined,
  rng: Rng
): string | undefined {
  const ancestors: string[] = [];

  if (sireName) {
    ancestors.push(sireName);
    const sire = findHorseByName(sireName);
    if (sire?.sire) ancestors.push(sire.sire);
    if (sire?.dam) ancestors.push(sire.dam);
  }

  if (damName) {
    ancestors.push(damName);
    const dam = findHorseByName(damName);
    if (dam?.sire) ancestors.push(dam.sire);
    if (dam?.dam) ancestors.push(dam.dam);
  }

  if (ancestors.length === 0) return undefined;

  const notable = ancestors[rng.int(0, ancestors.length - 1)];
  const patterns = [
    (n: string) => `${n} Legacy`,
    (n: string) => `${n} Spirit`,
    (n: string) => `Son of ${n}`,
    (n: string) => `Lady ${n}`,
    (n: string) => `${n} Jr.`,
    (n: string) => `Pure ${n}`,
  ];

  const pattern = patterns[rng.int(0, patterns.length - 1)];
  return pattern(notable).slice(0, 18);
}
