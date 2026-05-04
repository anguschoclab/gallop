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
    const { state, newDay } = context;
    const rng = createRng(hashStr(`market_${newDay}`));
    const market = refreshMarket(state.market, rng);

    return {
      ...context,
      state: {
        ...state,
        market,
      },
    };
  },
};
