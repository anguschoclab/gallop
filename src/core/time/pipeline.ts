import type { GameState } from "@/game/types";
import type { Rng } from "@/game/rng";

export interface PipelineContext {
  previousDay: number;
  newDay: number;
  state: GameState;
  logs: { day: number; text: string }[];
  dailyRng: Rng;
  skipRaceResolution?: boolean;
}

export interface PipelinePhase {
  name: string;
  order: number;
  execute: (context: PipelineContext) => PipelineContext;
  skipIf?: (context: PipelineContext) => boolean;
}

/**
 * Execute pipeline phases in order
 * Phases are sorted by order field before execution
 */
export function executePipeline(
  phases: PipelinePhase[],
  context: PipelineContext
): PipelineContext {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
  let currentContext = context;

  for (const phase of sortedPhases) {
    if (phase.skipIf && phase.skipIf(currentContext)) {
      continue;
    }

    currentContext = phase.execute(currentContext);
  }

  return currentContext;
}

/**
 * Create a pipeline phase from a function
 */
export function createPhase(
  name: string,
  order: number,
  execute: (context: PipelineContext) => PipelineContext,
  skipIf?: (context: PipelineContext) => boolean
): PipelinePhase {
  return { name, order, execute, skipIf };
}
