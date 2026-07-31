/**
 * pipeline.ts - Pipeline execution framework
 *
 * This file provides the pipeline execution framework for day advancement,
 * including PipelineContext, PipelinePhase, and executePipeline function.
 *
 * Dependencies: @/game/types (GameState), @/game/rng (Rng), @/core/resolver/intents (AnyIntent), @/core/resolver/impacts/index (AnyImpact), @/core/resolver/resolver (ImpactLogEntry)
 * Related files: advance.ts (uses pipeline), phases/index.ts (provides phases)
 */

import type { GameState } from "@/game/types";
import type { Horse } from "@/core/horse/types";
import type { Race } from "@/core/race/types";
import type { Stable } from "@/game/types";
import type { Jockey } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import type { AnyIntent } from "@/core/resolver/intents";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { ImpactLogEntry } from "@/core/resolver/resolver";
import type { WorldAssessment, EconomicTrend } from "@/core/ai/strategicCoordinator";

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
  /** Pre-built lookup maps — built once at pipeline entry, shared across all phases */
  horseMap: Map<string, Horse>;
  raceMap: Map<string, Race>;
  stableMap: Map<string, Stable>;
  jockeyMap: Map<string, Jockey>;
  /** Cached world assessment from worldAssessmentPhase (order 2) */
  worldAssessment?: WorldAssessment;
  /** Cached economic trend from economyPhase (order 48) */
  economicTrend?: EconomicTrend;
}

export interface PipelinePhase {
  name: string;
  order: number;
  execute: (context: PipelineContext) => PipelineContext;
  skipIf?: (context: PipelineContext) => boolean;
}

/**
 * Execute pipeline phases in order.
 *
 * Phases are sorted by order field before execution.
 *
 * @param phases - Array of phases to execute
 * @param context - Initial pipeline context
 * @returns Final pipeline context after all phases execute
 */
export function executePipeline(
  phases: PipelinePhase[],
  context: PipelineContext,
): PipelineContext {
  const sortedPhases = isSorted(phases) ? phases : [...phases].sort((a, b) => a.order - b.order);
  let currentContext = context;

  for (const phase of sortedPhases) {
    if (phase.skipIf && phase.skipIf(currentContext)) {
      continue;
    }

    currentContext = phase.execute(currentContext);
  }

  return currentContext;
}

function isSorted(phases: PipelinePhase[]): boolean {
  for (let i = 0; i < phases.length - 1; i++) {
    if (phases[i].order > phases[i + 1].order) return false;
  }
  return true;
}

/**
 * Create a pipeline phase from a function.
 *
 * @param name - Human-readable name of the phase
 * @param order - Execution order (lower runs first)
 * @param execute - The core execution function
 * @param skipIf - Optional predicate to skip this phase
 * @returns Complete PipelinePhase object
 */
export function createPhase(
  name: string,
  order: number,
  execute: (context: PipelineContext) => PipelineContext,
  skipIf?: (context: PipelineContext) => boolean,
): PipelinePhase {
  return { name, order, execute, skipIf };
}
