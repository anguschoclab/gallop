/**
 * phases/dailySnapshotPhase.ts - End-of-day player snapshot phase
 *
 * Runs LAST in the pipeline (order 204, after impact application and exchange
 * settlement) so that end-of-day cash balances, post-trade ownership and the
 * day's race results are all captured. Records per-horse daily progress
 * snapshots for the player (`horseDailyProgress`) and fills pending Strategy
 * Journal outcomes from the day's race history (`strategyJournal`).
 *
 * Dependencies: ../pipeline (PipelineContext, PipelinePhase), @/core/horse/dailyProgress (recordDailyProgress), @/core/tactics/strategyJournal (fillJournalOutcomes), @/constants (PHASE_ORDER_DAILY_SNAPSHOT)
 * Related files: src/core/time/phases/cashPressureHistoryPhase.ts (NPC-side daily snapshot), phases/index.ts (registers phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import { recordDailyProgress } from "@/core/horse/dailyProgress";
import type { Horse } from "@/core/horse/types";
import { playerSyndicateValue } from "@/core/stable/portfolio";
import { fillJournalOutcomes } from "@/core/tactics/strategyJournal";
import { recordRankingsHistory } from "@/core/market/rankingsHistory";
import { recordStableRankingsHistory } from "@/core/stable/stableRankings";
import { PHASE_ORDER_DAILY_SNAPSHOT } from "@/constants";

/**
 * Phase: Daily Snapshot
 * Captures end-of-day player-horse progress and fills journal outcomes.
 */
export const dailySnapshotPhase: PipelinePhase = {
  name: "dailySnapshot",
  order: PHASE_ORDER_DAILY_SNAPSHOT,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const allHorses = Object.values(state.horses ?? {}) as Horse[];
    const horseDailyProgress = recordDailyProgress(state.horseDailyProgress, allHorses, newDay, {
      cash: state.cash ?? 0,
      syndicateValue: playerSyndicateValue(state.syndicates),
    });
    const strategyJournal = fillJournalOutcomes(
      state.strategyJournal,
      state.horses,
      state.cash,
      newDay,
    );
    const rankingsHistory = recordRankingsHistory(state.rankingsHistory, allHorses, newDay);
    const stableRankingsHistory = recordStableRankingsHistory(state.stableRankingsHistory, {
      horses: allHorses,
      npcStables: state.npcStables ?? [],
      playerReputationScore: state.reputation?.score ?? 0,
      playerProfile: state.playerProfile,
      day: newDay,
    });
    return {
      ...context,
      state: {
        ...state,
        horseDailyProgress,
        strategyJournal,
        rankingsHistory,
        stableRankingsHistory,
      },
    };
  },
};
