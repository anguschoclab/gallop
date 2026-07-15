import { PHASE_ORDER_SEASON_STANDINGS } from "@/constants";
import { generateUUID } from "@/core/uuid";
import { computeSeasonStandings } from "@/core/standings/computeStandings";
import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { AnyImpact, InboxImpact } from "@/core/resolver/impacts/index";

export const seasonStandingsPhase: PipelinePhase = {
  name: "seasonStandings",
  order: PHASE_ORDER_SEASON_STANDINGS,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    const impacts: AnyImpact[] = [];

    const { standings, playerRank } = computeSeasonStandings(state, 30);

    const prevRank = state.lastTopTenRank;
    const currentTopTenRank = playerRank > 0 && playerRank <= 10 ? playerRank : 0;

    if (prevRank !== undefined && prevRank > 0) {
      if (currentTopTenRank > 0 && currentTopTenRank !== prevRank) {
        const direction = currentTopTenRank < prevRank ? "up" : "down";
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "seasonStandings",
          logLevel: "always",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "standings",
            priority: currentTopTenRank <= 3 ? "urgent" : "info",
            title: `Season Standings: Moved ${direction} to #${currentTopTenRank}`,
            body: `Your stable ${direction === "up" ? "climbed" : "dropped"} from #${prevRank} to #${currentTopTenRank} in the season standings.`,
            cta: {
              label: "View Standings",
              route: "/",
            },
          },
        } as InboxImpact);
      } else if (prevRank > 0 && currentTopTenRank === 0) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "seasonStandings",
          logLevel: "always",
          type: "inbox_message",
          message: {
            day: newDay,
            category: "standings",
            priority: "info",
            title: `Season Standings: Dropped out of Top 10`,
            body: `Your stable fell from #${prevRank} out of the top 10 in the season standings.`,
            cta: {
              label: "View Standings",
              route: "/",
            },
          },
        } as InboxImpact);
      }
    }

    const newState = { ...state, lastTopTenRank: currentTopTenRank };

    if (impacts.length === 0) {
      return { ...context, state: newState };
    }

    return {
      ...context,
      state: newState,
      impacts: [...context.impacts, ...impacts],
    };
  },
};
