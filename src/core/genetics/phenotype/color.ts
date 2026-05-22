/**
 * phenotype/color.ts - Coat color resolution from color genotype
 *
 * Dependencies: ../types (ColorGenotype), @/core/horse/types (CoatColor)
 */

import type { ColorGenotype } from "../types";
import type { CoatColor } from "@/core/horse/types";

/**
 * Resolve coat color from color genotype.
 *
 * Returns the coat color based on extension, agouti, gray, and cream loci.
 *
 * @param color - Color genotype
 * @returns Coat color
 *
 * @example
 * const coatColor = resolveCoatColor(genotype.color);
 */
export function resolveCoatColor(color: ColorGenotype): CoatColor {
  const isGray = color.gray[0] === 1 || color.gray[1] === 1;
  if (isGray) return "gray";

  if (color.cream[0] >= 3 && color.cream[1] >= 3) return "white";

  const hasExtension = color.extension[0] >= 1 || color.extension[1] >= 1;
  const hasAgouti = color.agouti[0] >= 1 || color.agouti[1] >= 1;
  const isDilute = color.cream[0] === 1 || color.cream[1] === 1;
  const isChampagne = color.cream[0] === 2 || color.cream[1] === 2;
  const isGrulla = color.cream[0] === 3 || color.cream[1] === 3;
  const isRoan = color.extension[0] === 2 || color.extension[1] === 2;
  const isDun = color.extension[0] === 3 || color.extension[1] === 3;

  if (isRoan) return "roan";
  if (isDun) return "dun";
  if (isGrulla) return "grulla";
  if (isChampagne) return "champagne";

  if (!hasExtension) {
    if (isDilute) return "palomino";
    if (color.agouti[0] >= 2 || color.agouti[1] >= 2) return "liver-chestnut";
    return "chestnut";
  }

  if (hasAgouti) {
    if (isDilute) return "buckskin";
    if (color.agouti[0] >= 3 || color.agouti[1] >= 3) return "dark-bay";
    if (color.agouti[0] === 2 || color.agouti[1] === 2) return "seal-brown";
    return "bay";
  }

  return "black";
}
