import type { Race, Horse } from "@/game/types";
import type { SeasonRecord, HallOfFameEntry, TrackRecord } from "@/core/history/historyTypes";
import { generateUUID } from "@/core/uuid";
import { getCareerStats } from "@/core/horse/stats";
import { DAYS_PER_YEAR } from "@/game/constants/gameConstants";
import type { Rng } from "@/game/rng";

/**
 * Records a race result in the seasonal history.
 * Only Grade 1 races are preserved in historical tracking.
 * 
 * @param {Race} race - The race being recorded.
 * @param {Array<{horseId: string, position: number, time: number}>} result - Final positions and times for all finishers.
 * @param {any[]} runners - Runner objects containing detailed race data.
 * @param {Horse[] | Map<string, Horse>} horses - The global horse collection for metadata lookup.
 * @param {number} day - The current simulation day.
 * @param {Rng} [rng] - Optional random number generator for deterministic ID generation.
 * @returns {SeasonRecord | null} A season record if the race is Grade 1, otherwise null.
 */
export function recordRaceHistory(
  race: Race,
  result: Array<{ horseId: string; position: number; time: number }>,
  runners: any[],
  horses: Horse[] | Map<string, Horse>,
  day: number,
  rng?: Rng,
): SeasonRecord | null {
  // Only record G1 races in season history
  if (!race.graded || race.graded.grade !== "G1") return null;

  const winner = result.find((r) => r.position === 1);
  if (!winner) return null;

  const winnerHorse =
    horses instanceof Map
      ? (horses as Map<string, Horse>).get(winner.horseId)
      : horses.find((h) => h.id === winner.horseId);
  const runner = runners.find((r) => r.horseId === winner.horseId);

  return {
    id: generateUUID(rng),
    year: Math.floor((day - 1) / DAYS_PER_YEAR) + 1,
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
 * Evaluates whether a horse qualifies for induction into the Hall of Fame based on its career achievements.
 * Induction typically requires multiple Grade 1 wins or significant lifetime earnings.
 * 
 * @param {Horse} horse - The horse to evaluate.
 * @param {number} day - The current simulation day.
 * @returns {HallOfFameEntry | null} A hall of fame entry if inducted, otherwise null.
 */
export function checkHallOfFameInduction(horse: Horse, day: number): HallOfFameEntry | null {
  // Induction criteria:
  // 1. At least 3 G1 wins
  // 2. OR at least $1,000,000 in earnings
  const stats = getCareerStats(horse);
  const g1Wins = stats.g1Wins;
  const earnings = Math.max(horse.lifetimeEarnings || 0, stats.earnings);
  const isInducted = g1Wins >= 3 || earnings >= 1000000;

  if (isInducted) {
    return {
      horseId: horse.id,
      name: horse.name,
      inductionDay: day,
      inductionYear: Math.floor((day - 1) / DAYS_PER_YEAR) + 1,
      achievements: [
        g1Wins >= 3 ? `${g1Wins} Grade 1 Victories` : "",
        earnings >= 1000000 ? `$${(earnings / 1000000).toFixed(1)}M in Lifetime Earnings` : "",
      ].filter(Boolean),
      lifetimeEarnings: earnings,
      lifetimeStarts: Math.max(horse.careerStarts || 0, stats.starts),
      lifetimeWins: Math.max(horse.careerWins || 0, stats.wins),
      g1Wins: stats.g1Wins,
      bestBeyer: stats.bestBeyer,
      silk: horse.silk,
      pedigree: {
        sireName: horse.sireName,
        damName: horse.damName,
      },
    };
  }

  return null;
}

/**
 * Determines if a race result sets a new track record for the specific distance and surface combination.
 * 
 * @param {Race} race - The race being evaluated.
 * @param {string} winnerId - Unique ID of the winning horse.
 * @param {string} winnerName - Name of the winning horse.
 * @param {number} time - Final winning time in seconds.
 * @param {number} day - The current simulation day.
 * @param {Record<string, TrackRecord>} [existingRecords={}] - The current map of track records.
 * @returns {TrackRecord | null} A new track record object if the time is a record, otherwise null.
 */
export function checkTrackRecord(
  race: Race,
  winnerId: string,
  winnerName: string,
  time: number,
  day: number,
  existingRecords: Record<string, TrackRecord> = {},
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
      year: Math.floor((day - 1) / DAYS_PER_YEAR) + 1,
    };
  }

  return null;
}
