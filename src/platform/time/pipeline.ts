/**
 * pipeline.ts - Pipeline context and phase types
 *
 * This file provides the shared types for day advancement:
 * PipelineContext (the per-day transaction context) and PipelinePhase.
 * Execution is owned by SimulationExecutor — there is no standalone
 * pipeline runner; phases only run inside a compiled, cadence-gated
 * schedule.
 *
 * Dependencies: @/game/types (GameState), @/game/rng (Rng), @/core/resolver/intents (AnyIntent), @/core/resolver/impacts/index (AnyImpact), @/core/resolver/resolver (ImpactLogEntry)
 * Related files: executor.ts (executes phases), phases/index.ts (provides phases)
 */

import type { GameState } from "@/platform/game/types";
import type { Horse } from "@/domains/horse/simulation/types";
import type { Race } from "@/domains/race/simulation/types";
import type { Stable } from "@/platform/game/types";
import type { Jockey } from "@/platform/game/types";
import type { Rng } from "@/shared/common/rng";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { AnyImpact } from "@/platform/resolver/impacts";
import type { ImpactLogEntry } from "@/platform/resolver/resolver";
import type {
  WorldAssessment,
  EconomicTrend,
} from "@/domains/agents/simulation/strategicCoordinator";
import type { PipelinePorts } from "@/platform/time/pipelinePorts";

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
  /** True when the player is watching the live interactive race viewer */
  isInteractiveRaceView?: boolean;
  /** Injected port interfaces for testability and decoupling. When absent, phases use direct core imports. */
  ports?: PipelinePorts;
}

export interface PipelinePhase {
  name: string;
  order: number;
  execute: (context: PipelineContext) => PipelineContext;
  skipIf?: (context: PipelineContext) => boolean;
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
