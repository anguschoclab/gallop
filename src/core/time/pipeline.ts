import type { GameState } from "@/game/types";
import type { Rng } from "@/game/rng";
import type { AnyIntent } from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { ImpactLogEntry } from "@/core/resolver/resolver";

export interface PipelineContext {
  previousDay: number;
  newDay: number;
  state: GameState;
  logs: { day: number; text: string }[];
  dailyRng: Rng;
  skipRaceResolution?: boolean;
  // Intent/impact resolver fields
  intents: AnyIntent[];
  impacts: AnyImpact[];
  impactLog: ImpactLogEntry[];
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
  context: PipelineContext,
): PipelineContext {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
  let currentContext = context;

  for (const phase of sortedPhases) {
    if (phase.skipIf && phase.skipIf(currentContext)) {
      continue;
    }

    const start = Date.now();
    console.log(`    - Starting phase: ${phase.name}`);
    currentContext = phase.execute(currentContext);
    const duration = Date.now() - start;
    if (duration >= 0) {
      console.log(`  [PERF] Phase ${phase.name} took ${duration}ms`);
    }











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
  skipIf?: (context: PipelineContext) => boolean,
): PipelinePhase {
  return { name, order, execute, skipIf };
}
