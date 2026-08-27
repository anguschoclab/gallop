/**
 * racecoursePrestige.ts - Derived prestige for racecourses
 *
 * A course's prestige is derived from the graded stakes it stages: G1s weigh
 * heaviest, then G2/G3, with a purse component so richer meetings rank above
 * thin ones with the same grade count. Scores are normalized to 0-100 once and
 * cached.
 *
 * Dependencies: @/data/gradedRaces (GRADED_RACES), @/data/tracks (TRACKS), ./prestigeTypes
 * Related files: src/core/npc/npcFame.ts (fame scaling by venue prestige)
 */

import { GRADED_RACES } from "@/data/gradedRaces";
import { TRACKS, TRACK_BY_NAME } from "@/data/tracks";
import { prestigeMultiplier } from "./prestigeTypes";

const GRADE_POINTS = { G1: 100, G2: 45, G3: 20 } as const;
const PURSE_DIVISOR = 250_000;
/** Baseline prestige for a course with no graded racing at all. */
const FLOOR = 14;

type CourseScores = {
  byTrackId: Map<string, number>;
  byTrackName: Map<string, number>;
};

let cache: CourseScores | null = null;

function build(): CourseScores {
  const raw = new Map<string, number>();

  for (const track of TRACKS) raw.set(track.id, 0);

  for (const race of GRADED_RACES) {
    const trackId = race.trackId ?? TRACK_BY_NAME[race.track]?.id;
    if (!trackId) continue;
    const points = GRADE_POINTS[race.grade] + race.purse / PURSE_DIVISOR;
    raw.set(trackId, (raw.get(trackId) ?? 0) + points);
  }

  // Compress with a log curve so a handful of huge venues don't flatten the rest.
  const curved = new Map<string, number>();
  let max = 0;
  for (const [trackId, points] of raw) {
    const value = points > 0 ? Math.log10(1 + points) : 0;
    curved.set(trackId, value);
    if (value > max) max = value;
  }

  const byTrackId = new Map<string, number>();
  for (const [trackId, value] of curved) {
    const normalized = max > 0 ? (value / max) * (100 - FLOOR) : 0;
    byTrackId.set(trackId, Math.round(FLOOR + normalized));
  }

  const byTrackName = new Map<string, number>();
  for (const track of TRACKS) {
    byTrackName.set(track.name, byTrackId.get(track.id) ?? FLOOR);
  }

  return { byTrackId, byTrackName };
}

function scores(): CourseScores {
  if (!cache) cache = build();
  return cache;
}

/**
 * Prestige score (0-100) for a racecourse by track id.
 * @param trackId
 */
export function getRacecoursePrestige(trackId?: string): number {
  if (!trackId) return FLOOR;
  return scores().byTrackId.get(trackId) ?? FLOOR;
}

/**
 * Prestige score (0-100) for a racecourse by display name.
 * @param trackName
 */
export function getRacecoursePrestigeByName(trackName?: string): number {
  if (!trackName) return FLOOR;
  return scores().byTrackName.get(trackName) ?? FLOOR;
}

/**
 * Multiplier on fame/reputation earned at a racecourse.
 * @param trackId
 * @param trackName
 */
export function racecoursePrestigeMultiplier(trackId?: string, trackName?: string): number {
  const score = trackId ? getRacecoursePrestige(trackId) : getRacecoursePrestigeByName(trackName);
  return prestigeMultiplier(score, 0.2);
}

/** Courses ranked by prestige, highest first. */
export function rankedRacecourses(): {
  id: string;
  name: string;
  country: string;
  prestige: number;
}[] {
  return TRACKS.map((t) => ({
    id: t.id,
    name: t.name,
    country: t.country,
    prestige: getRacecoursePrestige(t.id),
  })).sort((a, b) => b.prestige - a.prestige);
}
