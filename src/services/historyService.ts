import type { Race, Horse } from "@/game/types";
import type { SeasonRecord, HallOfFameEntry, TrackRecord } from "@/core/history/historyTypes";
import { generateUUID } from "@/game/uuid";
import { getCareerStats } from "@/core/horse/stats";

/**
 * Record a race result in the seasonal history.
 * Only records Grade 1 races for historical tracking.
 *
 * @param race - The race that was run
 * @param result - Position and time data for all finishers
 * @param runners - Runner objects for the race
 * @param horses - Global horse collection for metadata lookup
 * @param day - Current game day
 * @returns SeasonRecord object if recorded, otherwise null
 */
export function recordRaceHistory(
  race: Race,
  result: Array<{ horseId: string; position: number; time: number }>,
  runners: any[],
  horses: Horse[],
  day: number
): SeasonRecord | null {
  // Only record G1 races in season history
  if (!race.graded || race.graded.grade !== "G1") return null;

  const winner = result.find(r => r.position === 1);
  if (!winner) return null;

  const winnerHorse = horses.find(h => h.id === winner.horseId);
  const runner = runners.find(r => r.horseId === winner.horseId);

  return {
    id: generateUUID(),
    year: Math.floor((day - 1) / 365) + 1,
    day,
    raceId: race.id,
    raceName: race.name,
    winnerId: winner.horseId,
    winnerName: winnerHorse?.name || "Unknown",
    winnerSilk: winnerHorse?.silk || "#666",
    time: winner.time,
    jockeyId: runner?.jockeyId || "unknown",
    jockeyName: runner?.jockeyName || "Unknown",
    grade: "G1",
    isPlayerOwned: winnerHorse?.owned || false,
  };
}

/**
 * Check if a horse qualifies for the Hall of Fame based on its career stats.
 *
 * @param horse - The horse to evaluate
 * @param day - Current game day
 * @returns HallOfFameEntry if inducted, otherwise null
 */
export function checkHallOfFameInduction(
  horse: Horse,
  day: number
): HallOfFameEntry | null {
  // Induction criteria:
  // 1. At least 3 G1 wins
  // 2. OR at least $1,000,000 in earnings
  const stats = getCareerStats(horse);
  const g1Wins = stats.g1Wins;
  const isInducted = g1Wins >= 3 || stats.earnings >= 1000000;

  if (isInducted) {
    return {
      horseId: horse.id,
      name: horse.name,
      inductionDay: day,
      inductionYear: Math.floor((day - 1) / 365) + 1,
      achievements: [
        g1Wins >= 3 ? `${g1Wins} Grade 1 Victories` : "",
        stats.earnings >= 1000000 ? `$${(stats.earnings / 1000000).toFixed(1)}M in Lifetime Earnings` : ""
      ].filter(Boolean),
      lifetimeEarnings: stats.earnings,
      lifetimeStarts: stats.starts,
      lifetimeWins: stats.wins,
    };
  }

  return null;
}

/**
 * Check if a race result sets a new track record for its distance and surface.
 *
 * @param race - The race that was run
 * @param winnerId - ID of the winning horse
 * @param winnerName - Name of the winning horse
 * @param time - Final winning time
 * @param day - Current game day
 * @param existingRecords - Current global track record collection
 * @returns New TrackRecord if a record was set, otherwise null
 */
export function checkTrackRecord(
  race: Race,
  winnerId: string,
  winnerName: string,
  time: number,
  day: number,
  existingRecords: Record<string, TrackRecord> = {}
): TrackRecord | null {
  const trackId = race.trackId || race.graded?.trackId;
  const surface = race.surface || race.graded?.surface;
  const distance = race.distance;

  if (!trackId || !surface) return null;

  const key = `${trackId}_${surface}_${distance}`;
  const existing = existingRecords[key];

  if (!existing || time < existing.time) {
    return {
      trackId,
      trackName: race.trackName || race.graded?.trackName || "Unknown Track",
      surface,
      distance,
      time,
      horseId: winnerId,
      horseName: winnerName,
      day,
      year: Math.floor((day - 1) / 365) + 1,
    };
  }

  return null;
}
