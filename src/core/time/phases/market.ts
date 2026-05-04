import type { PipelineContext } from "../pipeline";
import { refreshMarket } from "@/game/store";
import { createRng, hashStr } from "@/game/rng";

/**
 * Phase: Market Refresh
 * Refresh the horse market
 */
export const marketPhase = {
  name: "market",
  order: 50,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, dailyRng } = context;
    const market = refreshMarket(state.market, dailyRng);

    return {
      ...context,
      state: {
        ...state,
        market,
      },
    };
  },
};
