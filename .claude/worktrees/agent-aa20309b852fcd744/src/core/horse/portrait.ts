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

export function getPortraitUrl(coatColor?: CoatColor): string {
  if (!coatColor) return COAT_TO_PORTRAIT.bay;
  return COAT_TO_PORTRAIT[coatColor] ?? COAT_TO_PORTRAIT.bay;
}

export function hasPortrait(coatColor?: CoatColor): boolean {
  if (!coatColor) return false;
  return coatColor in COAT_TO_PORTRAIT;
}
