import type { Horse, Race } from "@/game/types";

/**
 * Calculate track geometry score for a horse at a race
 * Large tracks (large radii, long straights) vs Tight tracks (small radii, short straights)
 */
export function calculateTrackGeometryScore(horse: Horse, race: Race): number {
  let score = 0;

  const trackId = race.graded?.trackId || race.trackId;
  const course = race.graded
    ? {
        sections: [],
        straightLength: race.distance > 2000 ? 500 : 350, // Fallback if no course data
      }
    : null; // In real use, we'd look up the track JSON here.

  // For this logic, we'll assume the sim has already resolved the course
  // If we can't find exact radii, we check the straightLength as a proxy for "Galloping" vs "Tight"
  const straight = race.graded ? 400 : 350; // Simplified for AI heuristic

  if (straight > 450) {
    // Galloping track: favors speed and long-striding horses
    if (horse.stats.speed > 70) score += 15;
    if (horse.corneringAptitude < 0.95) score += 10; // "Lumbering" speedsters are OK here
  } else if (straight < 350) {
    // Tight "Bullring": favors agility and cornering
    if (horse.corneringAptitude > 1.05) score += 20;
    if (horse.stats.acceleration > 70) score += 15;
    if (horse.corneringAptitude < 0.9) score -= 25; // Don't enter bad cornerers here
  }

  return score;
}

/**
 * Calculate gradient score for a horse at a race
 * If the race is at a known hilly track, check climbing aptitude
 */
export function calculateGradientScore(horse: Horse, race: Race): number {
  let score = 0;

  const isHilly =
    race.graded?.track.toLowerCase().includes("nakayama") ||
    race.graded?.track.toLowerCase().includes("ascot");

  if (isHilly) {
    if (horse.climbingAptitude > 1.05) score += 20;
    if (horse.climbingAptitude < 0.95) score -= 20;
  }

  return score;
}
