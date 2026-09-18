/**
 * stableTrends.ts - Pure functions for deriving stable-wide racing insights.
 */

import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";

export interface SurfaceTrend {
  surface: string;
  starts: number;
  wins: number;
  winRate: number;
}

export interface DistanceTrend {
  distanceCategory: string;
  starts: number;
  wins: number;
  winRate: number;
}

export interface StableTrends {
  bestSurface: SurfaceTrend | null;
  bestDistance: DistanceTrend | null;
}

function getDistanceCategory(distance: number | undefined): string | null {
  if (distance == null) return null;
  if (distance < 1400) return "Sprint (<1400m)";
  if (distance <= 1799) return "Mile (1400-1799m)";
  return "Route (1800m+)";
}

/**
 * Analyzes the race histories of the provided horses (typically the player's active stable)
 * to identify the most successful surface and distance categories.
 *
 * Returns null for a trend if there isn't enough data (minimum 5 starts required to establish a trend).
 *
 * @param horses - Array of horses to analyze
 * @param minStarts - Minimum number of starts required to consider a trend valid (default 5)
 */
export function analyzeStableTrends(horses: Horse[], minStarts = 5): StableTrends {
  const surfaceStats = new Map<string, { starts: number; wins: number }>();
  const distanceStats = new Map<string, { starts: number; wins: number }>();

  for (const horse of horses) {
    for (const race of horse.raceHistory || []) {
      if (!race.position) continue;
      const isWin = race.position === 1;

      // Surface
      if (race.surface) {
        // Capitalize first letter to match typical naming (Turf, Dirt, Synthetic)
        const surface = race.surface.charAt(0).toUpperCase() + race.surface.slice(1).toLowerCase();
        const stats = surfaceStats.get(surface) || { starts: 0, wins: 0 };
        stats.starts++;
        if (isWin) stats.wins++;
        surfaceStats.set(surface, stats);
      }

      // Distance
      const distCategory = getDistanceCategory(race.distance);
      if (distCategory) {
        const stats = distanceStats.get(distCategory) || { starts: 0, wins: 0 };
        stats.starts++;
        if (isWin) stats.wins++;
        distanceStats.set(distCategory, stats);
      }
    }
  }

  let bestSurface: SurfaceTrend | null = null;
  for (const [surface, stats] of surfaceStats.entries()) {
    if (stats.starts >= minStarts) {
      const winRate = stats.wins / stats.starts;
      if (
        !bestSurface ||
        winRate > bestSurface.winRate ||
        (winRate === bestSurface.winRate && stats.starts > bestSurface.starts)
      ) {
        bestSurface = { surface, starts: stats.starts, wins: stats.wins, winRate };
      }
    }
  }

  let bestDistance: DistanceTrend | null = null;
  for (const [distanceCategory, stats] of distanceStats.entries()) {
    if (stats.starts >= minStarts) {
      const winRate = stats.wins / stats.starts;
      if (
        !bestDistance ||
        winRate > bestDistance.winRate ||
        (winRate === bestDistance.winRate && stats.starts > bestDistance.starts)
      ) {
        bestDistance = { distanceCategory, starts: stats.starts, wins: stats.wins, winRate };
      }
    }
  }

  return { bestSurface, bestDistance };
}
