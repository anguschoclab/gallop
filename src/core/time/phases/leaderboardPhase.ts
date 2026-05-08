import type { PipelineContext } from "../pipeline";
import { computeAllLeaderboards } from "@/core/breeding/leaderboardService";
import type { SireTrendData } from "@/core/breeding/leaderboardTypes";

/**
 * Phase: Leaderboard Update
 * Update sire leaderboards every 7 days (weekly)
 * Records trend data for rising star detection
 */
export const leaderboardPhase = {
  name: "leaderboardUpdate",
  order: 72, // After races (60) and raceResolution (70), before awards (80)

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
        sireTrendHistory: trendHistory,
        leaderboardsUpdatedDay: newDay,
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
