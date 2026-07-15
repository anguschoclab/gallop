/**
 * damsireLeaderboard.ts - Broodmare sire (damsire) leaderboard computation
 *
 * Ranks stallions by their daughters' produce as broodmares. A damsire is the sire
 * of a dam — this leaderboard measures which sires produce the best broodmare daughters.
 *
 * Algorithm:
 * 1. Index all horses by their dam's sire ID (pedigree.damId → dam.pedigree.sireId)
 * 2. For each unique damsire, aggregate grandfoal stats (earnings, stakes wins, G1 wins)
 * 3. Rank by a composite score weighting total earnings, stakes foals, and G1 foals
 *
 * Dependencies: @/game/types (Horse), @/core/horse/stats (getCareerStats), ./leaderboardTypes (DamsireLeaderboard, DamsireRanking, DamsireAnalytics)
 */

import type { Horse } from "@/game/types";
import { getCareerStats } from "@/core/horse/stats";
import type { DamsireLeaderboard, DamsireAnalytics } from "./leaderboardTypes";

/**
 * Compute the damsire (broodmare sire) leaderboard.
 *
 * Ranks sires by their daughters' produce. Uses a pre-indexed map for O(N) performance.
 * Only includes damsires with at least 2 daughters who have produced foals.
 *
 * @param horses - All horses in the game state
 * @param currentDay - Current simulation day
 * @returns Damsire leaderboard with rankings
 */
export function computeDamsireLeaderboard(horses: Horse[], currentDay: number): DamsireLeaderboard {
  // Build a map from horse ID → horse for dam lookups
  const horseMap = new Map<string, Horse>();
  for (const h of horses) horseMap.set(h.id, h);

  // Index grandfoals by their damsire (dam's sire ID)
  // For each horse, find their dam, then find the dam's sire
  const grandfoalsByDamsire = new Map<string, Horse[]>();

  for (const h of horses) {
    const damId = h.pedigree?.damId;
    if (!damId) continue;
    const dam = horseMap.get(damId);
    if (!dam) continue;
    const damsireId = dam.pedigree?.sireId;
    if (!damsireId) continue;

    if (!grandfoalsByDamsire.has(damsireId)) grandfoalsByDamsire.set(damsireId, []);
    grandfoalsByDamsire.get(damsireId)!.push(h);
  }

  // Also track which daughters produced foals
  const daughtersByDamsire = new Map<string, Set<string>>();
  for (const h of horses) {
    const damId = h.pedigree?.damId;
    if (!damId) continue;
    const dam = horseMap.get(damId);
    if (!dam) continue;
    const damsireId = dam.pedigree?.sireId;
    if (!damsireId) continue;

    if (!daughtersByDamsire.has(damsireId)) daughtersByDamsire.set(damsireId, new Set());
    daughtersByDamsire.get(damsireId)!.add(damId);
  }

  // Get damsire horse objects (any horse that is a sire of a dam)
  const damsireIds = new Set(grandfoalsByDamsire.keys());

  const analytics: DamsireAnalytics[] = [];

  for (const damsireId of damsireIds) {
    const grandfoals = grandfoalsByDamsire.get(damsireId) || [];
    const daughters = daughtersByDamsire.get(damsireId) || new Set<string>();
    const daughtersBred = daughters.size;

    // Need at least 2 daughters bred to qualify
    if (daughtersBred < 2) continue;

    const damsire = horseMap.get(damsireId);
    const damsireName = damsire?.name || damsireId;

    let totalEarnings = 0;
    let stakesFoals = 0;
    let g1Foals = 0;
    let racingFoals = 0;

    for (const gf of grandfoals) {
      if (gf.age < 2) continue; // Only count racing-age grandfoals
      const cs = getCareerStats(gf);
      totalEarnings += gf.lifetimeEarnings || 0;
      racingFoals++;
      if (cs.stakesWins > 0 || cs.gradedWins > 0) stakesFoals++;
      if (cs.g1Wins > 0) g1Foals++;
    }

    const avgEarningsPerFoal = racingFoals > 0 ? totalEarnings / racingFoals : 0;

    // Blue hen score: weighted composite of daughters' produce
    // 40% earnings, 35% stakes, 25% G1
    const blueHenScore = Math.round(
      Math.min(totalEarnings / 1_000_000, 100) * 0.4 + stakesFoals * 7 * 0.35 + g1Foals * 15 * 0.25,
    );

    analytics.push({
      damsireId,
      damsireName,
      daughtersBred,
      totalFoals: grandfoals.length,
      stakesFoals,
      g1Foals,
      totalEarnings,
      avgEarningsPerFoal,
      blueHenScore,
    });
  }

  // Rank by blueHenScore descending
  const rankings = analytics
    .sort((a, b) => b.blueHenScore - a.blueHenScore)
    .slice(0, 50)
    .map((a, i) => ({
      damsireId: a.damsireId,
      damsireName: a.damsireName,
      rank: i + 1,
      value: a.blueHenScore,
      metrics: a,
    }));

  return {
    type: "damsire_rankings",
    title: "Broodmare Sires",
    description: "Sires ranked by their daughters' produce as broodmares",
    rankings,
    lastUpdated: currentDay,
  };
}
