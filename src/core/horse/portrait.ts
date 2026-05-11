/**
 * portrait.ts - Static horse portrait asset mapping
 *
 * This file provides static portrait images for each coat color. These are pre-rendered
 * PNG assets used as fallbacks when procedural portrait generation is not desired.
 *
 * Dependencies: @/game/types (CoatColor), @/assets/portraits/* (portrait assets)
 * Related files: proceduralPortrait.ts (procedural generation), exportPortrait.ts (export functionality)
 */

import type { CoatColor } from "@/game/types";
import bayPortrait from "@/assets/portraits/horse-portrait-bay.png";
import blackPortrait from "@/assets/portraits/horse-portrait-black.png";
import chestnutPortrait from "@/assets/portraits/horse-portrait-chestnut.png";
import darkBayPortrait from "@/assets/portraits/horse-portrait-dark-bay.png";
import grayPortrait from "@/assets/portraits/horse-portrait-gray.png";
import roanPortrait from "@/assets/portraits/horse-portrait-roan.png";
import palominoPortrait from "@/assets/portraits/horse-portrait-palomino.png";
import whitePortrait from "@/assets/portraits/horse-portrait-white.png";
import buckskinPortrait from "@/assets/portraits/horse-portrait-buckskin.png";
import sealBrownPortrait from "@/assets/portraits/horse-portrait-seal-brown.png";
import liverChestnutPortrait from "@/assets/portraits/horse-portrait-liver-chestnut.png";
import dunPortrait from "@/assets/portraits/horse-portrait-dun.png";
import grullaPortrait from "@/assets/portraits/horse-portrait-grulla.png";
import champagnePortrait from "@/assets/portraits/horse-portrait-champagne.png";

/**
 * Mapping of coat colors to static portrait asset paths.
 * Used as fallbacks for procedural portrait generation.
 */
export const COAT_TO_PORTRAIT: Record<CoatColor, string> = {
  // Direct mappings
  bay: bayPortrait,
  black: blackPortrait,
  chestnut: chestnutPortrait,
  "dark-bay": darkBayPortrait,
  gray: grayPortrait,
  roan: roanPortrait,
  palomino: palominoPortrait,
  white: whitePortrait,
  buckskin: buckskinPortrait,
  // Dedicated mappings (generated variants)
  "seal-brown": sealBrownPortrait,
  "liver-chestnut": liverChestnutPortrait,
  dun: dunPortrait,
  grulla: grullaPortrait,
  champagne: champagnePortrait,
};

/**
 * Get the static portrait URL for a given coat color.
 *
 * Returns the path to the pre-rendered portrait asset for the specified coat color.
 * Falls back to bay if the coat color is not mapped or undefined.
 *
 * @param coatColor - The coat color to get the portrait for
 * @returns URL string to the portrait asset
 *
 * @example
 * const url = getPortraitUrl("chestnut");
 * const fallback = getPortraitUrl(); // returns bay
 */
export function getPortraitUrl(coatColor?: CoatColor): string {
  if (!coatColor) return COAT_TO_PORTRAIT.bay;
  return COAT_TO_PORTRAIT[coatColor] ?? COAT_TO_PORTRAIT.bay;
}

/**
 * Check if a static portrait exists for a given coat color.
 *
 * Determines whether a pre-rendered portrait asset is available for the
 * specified coat color.
 *
 * @param coatColor - The coat color to check
 * @returns True if a portrait exists, false otherwise
 *
 * @example
 * if (hasPortrait("gray")) {
 *   useStaticPortrait();
 * } else {
 *   generateProceduralPortrait();
 * }
 */
export function hasPortrait(coatColor?: CoatColor): boolean {
  if (!coatColor) return false;
  return coatColor in COAT_TO_PORTRAIT;
}
