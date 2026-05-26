/**
 * phases/leaderboardPhase.ts - Leaderboard update phase
 *
 * This file provides the leaderboard update phase that updates sire leaderboards
 * every 7 days (weekly) and records trend data for rising star detection.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/breeding/leaderboardService (computeAllLeaderboards), @/core/breeding/leaderboardTypes (SireTrendData)
 * Related files: ../pipeline.ts (uses phase)
 */

import type { PipelineContext } from "../pipeline";
import { computeAllLeaderboards } from "@/core/breeding/leaderboardService";
import { PHASE_ORDER_LEADERBOARD } from "@/game/constants";
import { computeProgenyLeaderboards } from "@/core/breeding/progenyLeaderboards";
import { identifyFounders, computeFounderInfluence } from "@/core/history/lineageCrawler";
import type { SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { FounderRecord } from "@/core/history/historyTypes";
import { SEASON_DAYS } from "@/game/constants";

/**
 * Phase: Leaderboard Update
 * Update sire leaderboards every 7 days (weekly)
 * Records trend data for rising star detection
 */
export const leaderboardPhase = {
  name: "leaderboard",
  order: PHASE_ORDER_LEADERBOARD, // After races (60) and raceResolution (70), before awards (80)

  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Update leaderboards every 7 days (weekly)
    const shouldUpdate =
      !state.leaderboardsUpdatedDay || newDay - state.leaderboardsUpdatedDay >= 7;

    if (!shouldUpdate) return context;

    const industryMean = state.industryMeanEarnings ?? 0;
    const leaderboards = computeAllLeaderboards(
      state.horses,
      industryMean,
      newDay,
      state.sireTrendHistory,
    );

    const horseLeaderboards = computeProgenyLeaderboards(state.horses, newDay);

    // Update founder records once a season (30 days) to save performance
    let updatedFounders = state.founders || {};
    const shouldUpdateFounders =
      !state.lastFounderUpdateDay || newDay - state.lastFounderUpdateDay >= SEASON_DAYS;

    if (shouldUpdateFounders) {
      const candidates = identifyFounders(state.horses);
      const newFounders: Record<string, FounderRecord> = {};
      for (const candidate of candidates) {
        newFounders[candidate.id] = computeFounderInfluence(candidate, state.horses, newDay);
      }
      updatedFounders = newFounders;
    }

    // Record trend data for all ranked stallions
    const trendEntry: SireTrendData[] = leaderboards.overall.rankings.map((r) => ({
      stallionId: r.stallionId,
      day: newDay,
      aei: r.metrics.aei,
      ci: r.metrics.ci,
      stakesFoals: r.metrics.lifetimeStakesFoals,
      g1Foals: r.metrics.lifetimeG1Foals,
      rank: r.rank,
    }));

    // Keep 1 year of trend history
    const trendHistory = [...(state.sireTrendHistory || []), ...trendEntry].filter(
      (t) => newDay - t.day <= 365,
    );

    return {
      ...context,
      state: {
        ...state,
        sireLeaderboards: leaderboards,
        horseLeaderboards,
        founders: updatedFounders,
        sireTrendHistory: trendHistory,
        leaderboardsUpdatedDay: newDay,
        lastFounderUpdateDay: shouldUpdateFounders ? newDay : state.lastFounderUpdateDay,
      },
      logs: [
        ...context.logs,
        {
          day: newDay,
          text: `Sire leaderboards updated. Top sire: ${leaderboards.overall.rankings[0]?.stallionName}`,
        },
      ],
    };
  },
};
