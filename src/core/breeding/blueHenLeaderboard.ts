/**
 * blueHenLeaderboard.ts - Blue Hen mare leaderboard computation
 *
 * Ranks broodmares by their produce record. A "Blue Hen" is a mare who has produced
 * exceptional offspring — multiple stakes winners and/or G1 winners.
 *
 * Algorithm:
 * 1. Index all horses by their dam ID (pedigree.damId)
 * 2. For each mare with foals, aggregate foal racing stats (earnings, stakes wins, G1 wins)
 * 3. Combine with the persisted blueHenStatus field if present
 * 4. Rank by a composite blueHenScore
 *
 * Dependencies: @/game/types (Horse), @/core/horse/stats (getCareerStats), ./leaderboardTypes (BlueHenLeaderboard, MareRanking, MareAnalytics)
 */

import type { Horse } from "@/game/types";
import { getCareerStats } from "@/core/horse/stats";
import type { BlueHenLeaderboard, MareAnalytics } from "./leaderboardTypes";

/**
 * Compute the Blue Hen mare leaderboard.
 *
 * Ranks mares by their produce record. Uses a pre-indexed map for O(N) performance.
 * Only includes mares with at least 1 racing-age foal.
 *
 * @param horses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Blue Hen leaderboard with mare rankings
 */
export function computeBlueHenLeaderboard(horses: Horse[], currentDay: number): BlueHenLeaderboard {
  // Index foals by dam ID
  const foalsByDam = new Map<string, Horse[]>();
  for (const h of horses) {
    const damId = h.pedigree?.damId;
    if (!damId) continue;
    if (!foalsByDam.has(damId)) foalsByDam.set(damId, []);
    foalsByDam.get(damId)!.push(h);
  }

  // Build horse map for mare lookups
  const horseMap = new Map<string, Horse>();
  for (const h of horses) horseMap.set(h.id, h);

  const analytics: MareAnalytics[] = [];

  for (const [mareId, foals] of foalsByDam) {
    const mare = horseMap.get(mareId);
    if (!mare) continue;

    let totalFoalEarnings = 0;
    let stakesWinnersProduced = 0;
    let g1WinnersProduced = 0;
    let racingFoals = 0;

    for (const foal of foals) {
      if (foal.age < 2) continue; // Only count racing-age foals
      const cs = getCareerStats(foal);
      totalFoalEarnings += foal.lifetimeEarnings || 0;
      racingFoals++;
      if (cs.stakesWins > 0 || cs.gradedWins > 0) stakesWinnersProduced++;
      if (cs.g1Wins > 0) g1WinnersProduced++;
    }

    if (racingFoals === 0) continue;

    const avgFoalEarnings = totalFoalEarnings / racingFoals;

    // Use persisted blueHenStatus if available, otherwise compute
    const persisted = mare.blueHenStatus;
    const isBlueHen = persisted?.isBlueHen ?? (stakesWinnersProduced >= 2 && racingFoals >= 3);

    // Blue hen score: weighted composite
    // 35% earnings, 35% stakes winners, 30% G1 winners
    const blueHenScore = Math.round(
      Math.min(totalFoalEarnings / 500_000, 100) * 0.35 +
        stakesWinnersProduced * 10 * 0.35 +
        g1WinnersProduced * 20 * 0.3,
    );

    analytics.push({
      mareId,
      mareName: mare.name,
      foalsProduced: foals.length,
      stakesWinnersProduced,
      g1WinnersProduced,
      totalFoalEarnings,
      avgFoalEarnings,
      blueHenScore,
      isBlueHen,
    });
  }

  // Rank by blueHenScore descending
  const rankings = analytics
    .sort((a, b) => b.blueHenScore - a.blueHenScore)
    .slice(0, 50)
    .map((a, i) => ({
      mareId: a.mareId,
      mareName: a.mareName,
      rank: i + 1,
      value: a.blueHenScore,
      metrics: a,
    }));

  return {
    type: "blue_hen",
    title: "Blue Hen Mares",
    description: "Broodmares ranked by their produce record",
    rankings,
    lastUpdated: currentDay,
  };
}
