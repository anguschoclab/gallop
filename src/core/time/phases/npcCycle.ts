import type { PipelineContext } from "../pipeline";
import { runNpcCycle } from "@/core/npc/npcCycle";

/**
 * Phase: NPC Cycle
 * Run NPC training, race entry, and fame updates
 */
export const npcCyclePhase = {
  name: "npcCycle",
  order: 80,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;
    
    // Skip if no NPC stables
    if (state.npcStables.length === 0) {
      return context;
    }

    const pregnantIds = new Set(state.pregnancies.filter(p => !p.resolved).map(p => p.damId));
    
    // Run the complete NPC cycle
    const { horses, races, jockeys } = runNpcCycle(
      state.npcStables,
      state.horses,
      state.jockeys ?? [],
      state.races,
      newDay,
      context.dailyRng,
      3,
      pregnantIds
    );

    return {
      ...context,
      state: {
        ...state,
        horses,
        races,
        jockeys,
      },
    };
  },
};
