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
      return "bg-fame/10 text-fame border-fame/30";
    case "mid":
      return "bg-info/10 text-info border-info/30";
    case "budget":
      return "bg-success/10 text-success border-success/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/**
 * Get star representation of reputation score (0-100)
 */
export function getReputationStars(rep: number): string {
  const stars = Math.floor(rep / 20);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}
