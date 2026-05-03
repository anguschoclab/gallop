/**
 * Pure UI helper functions for NPC stable components
 * Extracted from: npc-stables.tsx, npc-stables.$stableId.tsx
 */

import type { StableTier } from "@/game/types";

/**
 * Get Tailwind CSS color classes for stable tier badges
 */
export function getTierColor(tier: StableTier | string): string {
  switch (tier) {
    case "elite":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "mid":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "budget":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

/**
 * Get star representation of reputation score (0-100)
 */
export function getReputationStars(rep: number): string {
  const stars = Math.floor(rep / 20);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}
