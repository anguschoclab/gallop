/**
 * progenyLeaderboards.ts - Progeny leaderboard computation
 *
 * This file provides functions for computing progeny leaderboards tracking top
 * performers by Beyer figures, earnings, and stakes wins.
 *
 * Dependencies: @/core/horse/stats (getCareerStats), @/game/types (Horse), ./lineage (foalLifetimeEarnings), ./leaderboardTypes (ProgenyLeaderboard, ProgenyLeaderboardType, ProgenyRanking)
 * Related files: leaderboardPhase.ts (uses for progeny rankings), leaderboardTypes.ts (type definitions)
 */

import { getCareerStats } from "@/core/horse/stats";
import type { Horse } from "@/game/types";
import { foalLifetimeEarnings } from "./lineage";
import type {
  ProgenyLeaderboard,
  ProgenyLeaderboardType,
  ProgenyRanking,
} from "./leaderboardTypes";

/**
 * Compute progeny leaderboards tracking top performers by various metrics.
 *
 * Generates three leaderboards for racing-age horses (age 2+ with race history):
 * - Beyer leaderboard: highest Beyer figures achieved
 * - Earnings leaderboard: highest lifetime earnings
 * - Stakes winners leaderboard: most stakes wins
 *
 * @param horses - All horses in the game
 * @param currentDay - Current game day
 * @returns Object with beyer, earnings, and stakes_winners leaderboards
 */
export function computeProgenyLeaderboards(
  horses: Horse[],
  currentDay: number,
): Record<ProgenyLeaderboardType, ProgenyLeaderboard> {
  const runners = horses.filter((h) => h.age >= 2 && h.raceHistory.length > 0);

  return {
    beyer: computeBeyerLeaderboard(runners, currentDay),
    earnings: computeEarningsLeaderboard(runners, currentDay),
    stakes_winners: computeStakesWinnersLeaderboard(runners, currentDay),
  };
}

/**
 * Beyer leaderboard - highest Beyer figures achieved.
 *
 * Computes the leaderboard ranking horses by their highest Beyer figures.
 *
 * @param runners - Racing-age horses with race history
 * @param currentDay - Current game day
 * @returns ProgenyLeaderboard with Beyer rankings
 */
function computeBeyerLeaderboard(runners: Horse[], currentDay: number): ProgenyLeaderboard {
  const rankings = runners
    .map((h) => ({
      horseId: h.id,
      horseName: h.name,
      sireId: h.pedigree?.sireId,
      sireName: h.sireName,
      value: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
      metrics: (() => {
        const stats = getCareerStats(h);
        return {
          age: h.age,
          starts: stats.starts,
          wins: stats.wins,
          earnings: stats.earnings,
          bestBeyer: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
          gradeWins: stats.gradedWins,
        };
      })(),
    }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((h, i) => ({ ...h, rank: i + 1 })) as ProgenyRanking[];

  return {
    type: "beyer",
    title: "Top Progeny by Beyer",
    description: "Highest Beyer figures achieved by progeny",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Earnings leaderboard - highest lifetime earnings.
 *
 * Computes the leaderboard ranking horses by their lifetime earnings.
 *
 * @param runners - Racing-age horses with race history
 * @param currentDay - Current game day
 * @returns ProgenyLeaderboard with earnings rankings
 */
function computeEarningsLeaderboard(runners: Horse[], currentDay: number): ProgenyLeaderboard {
  const rankings = runners
    .map((h) => ({
      horseId: h.id,
      horseName: h.name,
      sireId: h.pedigree?.sireId,
      sireName: h.sireName,
      value: h.lifetimeEarnings,
      metrics: (() => {
        const stats = getCareerStats(h);
        return {
          age: h.age,
          starts: stats.starts,
          wins: stats.wins,
          earnings: stats.earnings,
          bestBeyer: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
          gradeWins: stats.gradedWins,
        };
      })(),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((h, i) => ({ ...h, rank: i + 1 })) as ProgenyRanking[];

  return {
    type: "earnings",
    title: "Top Progeny by Earnings",
    description: "Highest lifetime earnings by progeny",
    rankings,
    lastUpdated: currentDay,
  };
}

/**
 * Stakes winners leaderboard - most stakes wins.
 *
 * Computes the leaderboard ranking horses by their number of stakes wins.
 *
 * @param runners - Racing-age horses with race history
 * @param currentDay - Current game day
 * @returns ProgenyLeaderboard with stakes winners rankings
 */
function computeStakesWinnersLeaderboard(runners: Horse[], currentDay: number): ProgenyLeaderboard {
  const rankings = runners
    .map((h) => ({
      horseId: h.id,
      horseName: h.name,
      sireId: h.pedigree?.sireId,
      sireName: h.sireName,
      value: getCareerStats(h).stakesWins,
      metrics: (() => {
        const stats = getCareerStats(h);
        return {
          age: h.age,
          starts: stats.starts,
          wins: stats.wins,
          earnings: stats.earnings,
          bestBeyer: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
          gradeWins: stats.gradedWins,
        };
      })(),
    }))
    .filter((h) => h.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map((h, i) => ({ ...h, rank: i + 1 })) as ProgenyRanking[];

  return {
    type: "stakes_winners",
    title: "Top Progeny by Stakes Wins",
    description: "Most stakes winners by progeny",
    rankings,
    lastUpdated: currentDay,
  };
}
