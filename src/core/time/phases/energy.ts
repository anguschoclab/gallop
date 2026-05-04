import type { PipelineContext } from "../pipeline";

/**
 * Phase: Energy Restoration
 * Restore energy for all horses (35 points, capped at 100)
 */
export const energyPhase = {
  name: "energy",
  order: 40,
  execute: (context: PipelineContext): PipelineContext => {
    const { state } = context;
    const horses = state.horses.map((h) => ({ ...h, energy: Math.min(100, h.energy + 35) }));

    return {
      ...context,
      state: {
        ...state,
        horses,
      },
    };
  },
};
