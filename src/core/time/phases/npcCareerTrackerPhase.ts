/**
 * phases/npcCareerTrackerPhase.ts - NPC career tracker phase
 *
 * Advances the off-screen racing careers of NPC horses that are not currently
 * campaigning in the visible race calendar, so their age, career record,
 * earnings and fame keep evolving instead of staying frozen.
 *
 * Dependencies: ../pipeline (PipelineContext), @/core/npc/careerTracker
 * Related files: src/core/npc/careerTracker.ts, phases/index.ts (registers phase)
 */

import type { PipelineContext, PipelinePhase } from "../pipeline";
import type { Horse } from "@/game/types";
import type { StableTier } from "@/core/stable/types";
import { isNpcOwned, getStableId } from "@/core/horse/ownership";
import { PHASE_ORDER_NPC_CAREER_TRACKER } from "@/constants";
import {
  isDueForOffscreenStart,
  simulateOffscreenStart,
  applyOffscreenStart,
} from "@/core/npc/careerTracker";

/**
 * Phase: NPC Career Tracker
 * Simulates off-screen starts for NPC horses so careers progress over time.
 */
export const npcCareerTrackerPhase: PipelinePhase = {
  name: "npcCareerTracker",
  order: PHASE_ORDER_NPC_CAREER_TRACKER,
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, dailyRng } = context;
    if (state.npcStables.length === 0) return context;

    const tierByStable = new Map<string, StableTier>(
      state.npcStables.map((s) => [String(s.id), s.tier]),
    );

    let changed = false;
    const horses: Record<string, Horse> = {};
    for (const [id, horse] of Object.entries(state.horses)) {
      horses[id] = horse;
      if (!isNpcOwned(horse) || horse.lifecycleStatus !== "active") continue;

      const tier = tierByStable.get(String(getStableId(horse) ?? "")) ?? "mid";
      if (!isDueForOffscreenStart(horse, newDay, tier, dailyRng)) continue;

      const outcome = simulateOffscreenStart(horse, newDay, tier, dailyRng);
      horses[id] = applyOffscreenStart(horse, outcome);
      changed = true;
    }

    if (!changed) return context;

    return { ...context, state: { ...state, horses } };
  },
};
