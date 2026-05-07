import type { Horse } from "@/game/types";
import { foalLifetimeEarnings } from "./lineage";
import type {
  ProgenyLeaderboard,
  ProgenyLeaderboardType,
  ProgenyRanking,
} from "./leaderboardTypes";

/**
 * Compute progeny leaderboards tracking top performers by various metrics
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
 * Beyer leaderboard - highest Beyer figures achieved
 */
function computeBeyerLeaderboard(runners: Horse[], currentDay: number): ProgenyLeaderboard {
  const rankings = runners
    .map((h) => ({
      horseId: h.id,
      horseName: h.name,
      sireId: h.pedigree?.sireId,
      sireName: h.sireName,
      value: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
      metrics: {
        age: h.age,
        starts: h.careerStarts,
        wins: h.careerWins,
        earnings: h.lifetimeEarnings,
        bestBeyer: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
        gradeWins: h.raceHistory.filter((r) => r.grade && r.position === 1).length,
      },
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
 * Earnings leaderboard - highest lifetime earnings
 */
function computeEarningsLeaderboard(runners: Horse[], currentDay: number): ProgenyLeaderboard {
  const rankings = runners
    .map((h) => ({
      horseId: h.id,
      horseName: h.name,
      sireId: h.pedigree?.sireId,
      sireName: h.sireName,
      value: h.lifetimeEarnings,
      metrics: {
        age: h.age,
        starts: h.careerStarts,
        wins: h.careerWins,
        earnings: h.lifetimeEarnings,
        bestBeyer: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
        gradeWins: h.raceHistory.filter((r) => r.grade && r.position === 1).length,
      },
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
 * Stakes winners leaderboard - most stakes wins
 */
function computeStakesWinnersLeaderboard(runners: Horse[], currentDay: number): ProgenyLeaderboard {
  const rankings = runners
    .map((h) => ({
      horseId: h.id,
      horseName: h.name,
      sireId: h.pedigree?.sireId,
      sireName: h.sireName,
      value: h.raceHistory.filter(
        (r) => (r.grade || r.raceClass === "Stakes" || r.raceClass === "Group") && r.position === 1,
      ).length,
      metrics: {
        age: h.age,
        starts: h.careerStarts,
        wins: h.careerWins,
        earnings: h.lifetimeEarnings,
        bestBeyer: Math.max(...h.raceHistory.map((r) => r.beyer || 0)),
        gradeWins: h.raceHistory.filter((r) => r.grade && r.position === 1).length,
      },
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
