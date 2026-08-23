import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { STAGE_PHASES } from "@/workers/pipelineStages";
import { createRng, hashStr } from "@/core/common/rng";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "@/core/resolver/impacts/index";

export interface PerDayResult {
  day: number;
  cashBefore: number;
  cashAfter: number;
  impacts: AnyImpact[];
  state: GameState;
}

export function runPipelineForDay(
  state: GameState,
  newDay: number,
): { state: GameState; logs: { day: number; text: string }[]; impacts: AnyImpact[] } {
  const pipelineContext: PipelineContext = {
    previousDay: state.day,
    newDay,
    state: { ...state },
    logs: [],
    dailyRng: createRng(hashStr("daily_" + newDay)),
    intents: state.pendingIntents || [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(Object.values(state.horses).map((h) => [h.id, h])),
    raceMap: new Map(Object.values(state.races).map((r) => [r.id, r])),
    stableMap: new Map((state.npcStables ?? []).map((s) => [s.id, s])),
    jockeyMap: new Map((state.jockeys ?? []).map((j) => [j.id, j])),
  };

  let currentContext = pipelineContext;
  for (const stagePhases of STAGE_PHASES) {
    currentContext = executePipeline(stagePhases, currentContext);
  }

  return {
    state: { ...currentContext.state, day: newDay },
    logs: currentContext.logs,
    impacts: currentContext.impacts,
  };
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
