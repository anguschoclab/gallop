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
export const RACECOURSE_FLOOR_PRESTIGE = 14;
/** Spread for racecourse prestige multiplier (0.2 = ±20% at extremes). */
export const RACECOURSE_PRESTIGE_SPREAD = 0.2;

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
    const normalized = max > 0 ? (value / max) * (100 - RACECOURSE_FLOOR_PRESTIGE) : 0;
    byTrackId.set(trackId, Math.round(RACECOURSE_FLOOR_PRESTIGE + normalized));
  }

  const byTrackName = new Map<string, number>();
  for (const track of TRACKS) {
    byTrackName.set(track.name, byTrackId.get(track.id) ?? RACECOURSE_FLOOR_PRESTIGE);
  }

  return { byTrackId, byTrackName };
}

function scores(): CourseScores {
  if (!cache) cache = build();
  return cache;
}

/** Prestige score (0-100) for a racecourse by track id. */
export function getRacecoursePrestige(trackId?: string): number {
  if (!trackId) return RACECOURSE_FLOOR_PRESTIGE;
  return scores().byTrackId.get(trackId) ?? RACECOURSE_FLOOR_PRESTIGE;
}

/** Prestige score (0-100) for a racecourse by display name. */
export function getRacecoursePrestigeByName(trackName?: string): number {
  if (!trackName) return RACECOURSE_FLOOR_PRESTIGE;
  return scores().byTrackName.get(trackName) ?? RACECOURSE_FLOOR_PRESTIGE;
}

/** Multiplier on fame/reputation earned at a racecourse. */
export function racecoursePrestigeMultiplier(trackId?: string, trackName?: string): number {
  const score = trackId
    ? getRacecoursePrestige(trackId)
    : getRacecoursePrestigeByName(trackName);
  return prestigeMultiplier(score, RACECOURSE_PRESTIGE_SPREAD);
}

/** Courses ranked by prestige, highest first. */
export function rankedRacecourses(): { id: string; name: string; country: string; prestige: number }[] {
  return TRACKS.map((t) => ({
    id: t.id,
    name: t.name,
    country: t.country,
    prestige: getRacecoursePrestige(t.id),
  })).sort((a, b) => b.prestige - a.prestige);
}
