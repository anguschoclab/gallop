import type { PipelineContext } from "../pipeline";

const UPKEEP_PER_HORSE = 50;

/**
 * Phase: Upkeep
 * Player pays $50/horse/day. NPC stables pay the same on their own roster
 * (closes the asymmetric drain that would have bankrupted them once foals,
 * stud fees, and purses started circulating). Player horses are excluded
 * from each NPC stable's count via stableId.
 */
export const upkeepPhase = {
  name: "upkeep",
  order: 20,
  execute: (context: PipelineContext): PipelineContext => {
    const { state } = context;
    const playerHorseCount = state.horses.filter((h) => !h.stableId).length;
    const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

    // Charge each NPC stable for its own horses.
    const npcStables = state.npcStables.map((stable) => {
      const owned = state.horses.filter((h) => h.stableId === stable.id);
      const cost = owned.length * UPKEEP_PER_HORSE;
      return { ...stable, cash: stable.cash - cost };
    });

    return {
      ...context,
      state: {
        ...state,
        cash: state.cash - playerUpkeep,
        npcStables,
      },
      logs: [...context.logs],
    };
  },
};
