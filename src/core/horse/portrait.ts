import type { CoatColor } from "@/game/types";

export const COAT_TO_PORTRAIT: Record<CoatColor, string> = {
  // Direct mappings
  bay: "/assets/portraits/horse-portrait-bay.png",
  black: "/assets/portraits/horse-portrait-black.png",
  chestnut: "/assets/portraits/horse-portrait-chestnut.png",
  "dark-bay": "/assets/portraits/horse-portrait-dark-bay.png",
  gray: "/assets/portraits/horse-portrait-gray.png",
  roan: "/assets/portraits/horse-portrait-roan.png",
  palomino: "/assets/portraits/horse-portrait-palomino.png",
  white: "/assets/portraits/horse-portrait-white.png",
  buckskin: "/assets/portraits/horse-portrait-buckskin.png",
  // Fallback mappings
  "seal-brown": "/assets/portraits/horse-portrait-bay.png",
  "liver-chestnut": "/assets/portraits/horse-portrait-chestnut.png",
  dun: "/assets/portraits/horse-portrait-buckskin.png",
  grulla: "/assets/portraits/horse-portrait-gray.png",
  champagne: "/assets/portraits/horse-portrait-palomino.png",
};

export function getPortraitUrl(coatColor?: CoatColor): string {
  if (!coatColor) return COAT_TO_PORTRAIT.bay;
  return COAT_TO_PORTRAIT[coatColor] ?? COAT_TO_PORTRAIT.bay;
}

export function hasPortrait(coatColor?: CoatColor): boolean {
  if (!coatColor) return false;
  return coatColor in COAT_TO_PORTRAIT;
}
