import { SimulationExecutor } from "@/core/time/executor";
import { GAME_PHASE_DESCRIPTORS } from "@/core/time/phases/descriptors";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "@/core/resolver/impacts/index";

const executor = new SimulationExecutor(GAME_PHASE_DESCRIPTORS);

export interface PerDayResult {
  day: number;
  cashBefore: number;
  cashAfter: number;
  impacts: AnyImpact[];
  state: GameState;
}

/**
 * Run the production pipeline for a single day via SimulationExecutor — the
 * same code path the worker and store use, so tests exercise real behavior.
 * @param state - game state at the start of the day
 * @param newDay - the day number being simulated
 */
export function runPipelineForDay(
  state: GameState,
  newDay: number,
): { state: GameState; logs: { day: number; text: string }[]; impacts: AnyImpact[] } {
  const { state: dayState, logs, impacts } = executor.runDayDetailed(state, newDay);
  return { state: dayState, logs, impacts };
}

export function runPipelineForDays(
  state: GameState,
  count: number,
): { state: GameState; perDay: PerDayResult[] } {
  const perDay: PerDayResult[] = [];
  let currentState = state;

  for (let i = 0; i < count; i++) {
    if (currentState.runEnded) break;

    const newDay = currentState.day + 1;
    const cashBefore = currentState.cash;
    const result = runPipelineForDay(currentState, newDay);
    currentState = result.state;

    perDay.push({
      day: newDay,
      cashBefore,
      cashAfter: currentState.cash,
      impacts: result.impacts,
      state: currentState,
    });
  }

  return { state: currentState, perDay };
}
