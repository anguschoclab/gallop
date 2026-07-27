import type { Horse } from "./types";

export type HorseInsight = {
  label: string;
  value: string;
  context: string;
  type: "positive" | "neutral" | "negative";
};

export function getHorseInsight(horse: Horse): HorseInsight | null {
  const history = horse.raceHistory ?? [];
  if (history.length < 3) return null;

  // 1. Check for win streak
  let currentWinStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].position === 1) currentWinStreak++;
    else break;
  }
  if (currentWinStreak >= 3) {
    return {
      label: "Red Hot",
      value: `${currentWinStreak} Race Win Streak`,
      context: "Currently on an active winning streak",
      type: "positive",
    };
  }

  // 1.1 Check for Bridesmaid (2nd place streak)
  let currentPlaceStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].position === 2) currentPlaceStreak++;
    else break;
  }
  if (currentPlaceStreak >= 3) {
    return {
      label: "Bridesmaid",
      value: `${currentPlaceStreak} Consecutive 2nd Place Finishes`,
      context: "Consistently close but struggling to break through for a win",
      type: "neutral",
    };
  }

  // 1.5 Check for Improving Form (trending up in last 3 starts)
  const recentBeyers = history
    .slice(-3)
    .map((r) => r.beyer)
    .filter((b): b is number => typeof b === "number");

  if (recentBeyers.length === 3) {
    if (recentBeyers[2] > recentBeyers[1] && recentBeyers[1] > recentBeyers[0]) {
      const improvement = recentBeyers[2] - recentBeyers[0];
      if (improvement >= 5) {
        return {
          label: "Trending Up",
          value: "Improving Form",
          context: `Beyer figures have increased consistently over last 3 starts (+${improvement} pts)`,
          type: "positive",
        };
      }
    }
  }

  // 2. Check for distance sweet spot (best average beyer by distance, min 3 races)
  const distanceStats = new Map<number, { runs: number; totalBeyer: number; wins: number }>();
  for (const race of history) {
    if (race.distance != null && typeof race.beyer === "number") {
      const stats = distanceStats.get(race.distance) || { runs: 0, totalBeyer: 0, wins: 0 };
      stats.runs++;
      stats.totalBeyer += race.beyer;
      if (race.position === 1) stats.wins++;
      distanceStats.set(race.distance, stats);
    }
  }

  let bestDistance: number | null = null;
  let bestAvgBeyer = 0;
  let bestDistanceRuns = 0;

  for (const [distance, stats] of distanceStats.entries()) {
    if (stats.runs >= 3) {
      const avg = stats.totalBeyer / stats.runs;
      if (avg > bestAvgBeyer) {
        bestAvgBeyer = avg;
        bestDistance = distance;
        bestDistanceRuns = stats.runs;
      }
    }
  }

  if (bestDistance !== null && bestAvgBeyer > 0) {
    return {
      label: "Distance Specialist",
      value: `${bestDistance}m`,
      context: `Best performance average (Beyer ${Math.round(bestAvgBeyer)}) across ${bestDistanceRuns} starts`,
      type: "positive",
    };
  }

  // 3. Surface Affinity
  const surfaceStats = new Map<string, { runs: number; totalBeyer: number; wins: number }>();
  for (const race of history) {
    if (race.surface && typeof race.beyer === "number") {
      const stats = surfaceStats.get(race.surface) || { runs: 0, totalBeyer: 0, wins: 0 };
      stats.runs++;
      stats.totalBeyer += race.beyer;
      if (race.position === 1) stats.wins++;
      surfaceStats.set(race.surface, stats);
    }
  }

  let bestSurface: string | null = null;
  let bestSurfaceBeyer = 0;
  let bestSurfaceRuns = 0;

  for (const [surface, stats] of surfaceStats.entries()) {
    if (stats.runs >= 3) {
      const avg = stats.totalBeyer / stats.runs;
      if (avg > bestSurfaceBeyer) {
        bestSurfaceBeyer = avg;
        bestSurface = surface;
        bestSurfaceRuns = stats.runs;
      }
    }
  }

  if (bestSurface !== null && bestSurfaceBeyer > 0) {
    return {
      label: "Surface Affinity",
      value: bestSurface,
      context: `Best performance average (Beyer ${Math.round(bestSurfaceBeyer)}) across ${bestSurfaceRuns} starts`,
      type: "positive",
    };
  }

  return null;
}
