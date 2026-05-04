import type { PipelineContext } from "../pipeline";
import { refreshMarket } from "@/game/store";

/**
 * Phase: Market Refresh
 * Refresh the horse market
 */
export const marketPhase = {
  name: "market",
  order: 50,
  execute: (context: PipelineContext): PipelineContext => {
    const { state } = context;
    const market = refreshMarket(state.market);

    return {
      ...context,
      state: {
        ...state,
        market,
      },
    };
  },
};
