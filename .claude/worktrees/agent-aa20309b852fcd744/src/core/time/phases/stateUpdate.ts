import type { PipelineContext } from "../pipeline";

/**
 * Phase: State Update
 * Commit all state changes and update logs
 * This is the final phase that sets the new game state
 */
export const stateUpdatePhase = {
  name: "stateUpdate",
  order: 100,
  execute: (context: PipelineContext): PipelineContext => {
    // This phase is a placeholder - the actual state update happens in store.ts
    // The pipeline phases modify the context, and the final set() call in advanceDay
    // commits the changes to the Zustand store
    return context;
  },
};
