/**
 * phases/stateUpdate.ts - State update phase
 *
 * This file provides the state update phase that commits all state changes
 * and updates logs as the final phase in the pipeline.
 *
 * Dependencies: ../pipeline (PipelineContext)
 * Related files: ../pipeline.ts (uses phase), ../advance.ts (uses phase)
 */

import { PHASE_ORDER_STATE_UPDATE } from "@/constants/game";
import type { PipelineContext } from "../pipeline";

/**
 * Phase: State Update
 * Commit all state changes and update logs
 * This is the final phase that sets the new game state
 */
export const stateUpdatePhase = {
  name: "stateUpdate",
  order: PHASE_ORDER_STATE_UPDATE,
  execute: (context: PipelineContext): PipelineContext => {
    // This phase is a placeholder - the actual state update happens in store.ts
    // The pipeline phases modify the context, and the final set() call in advanceDay
    // commits the changes to the Zustand store
    return context;
  },
};
