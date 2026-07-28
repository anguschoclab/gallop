/**
 * Engine Worker
 * Executes the game pipeline in a Web Worker to offload CPU-intensive operations
 * from the main thread, keeping the UI responsive during day advancement.
 */

import { expose, proxy } from "comlink";
import { produceWithPatches, enablePatches, type Patch } from "immer";
import type { GameState } from "@/game/types";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { STAGE_PHASES, STAGE_RANGES } from "@/workers/pipelineStages";
import { createRng, hashStr } from "@/core/common/rng";
import { getCurrentYear } from "@/core/race/schedule";

enablePatches();

export type AdvanceDayInput = {
  state: GameState;
  newDay: number;
  progressCallback?: (stage: number, totalStages: number, stageName: string) => void;
};

export type AdvanceDayOutput = {
  patches: Patch[];
  logs: { day: number; text: string }[];
};

export type AdvanceDaysBatchInput = {
  state: GameState;
  count: number;
  headless?: boolean;
  playerRaceDays?: Set<number>;
  progressCallback?: (day: number, totalDays: number) => void;
};

export type AdvanceDaysBatchOutput = {
  patches: Patch[];
  logs: { day: number; text: string }[];
  daysAdvanced: number;
  encounteredPlayerRace: boolean;
  playerRaceId?: string;
};

/**
 * Execute a single day advancement in the worker
 * This offloads all CPU-intensive pipeline phases to the worker thread
 */
async function advanceDay(input: AdvanceDayInput): Promise<AdvanceDayOutput> {
  const { state, newDay, progressCallback } = input;
  const previousDay = state.day;
  const currentYear = getCurrentYear(newDay);
  const previousYear = getCurrentYear(previousDay);

  // Clean up expired Win and You're In qualifications at year boundary
  let horses = state.horses;
  if (currentYear > previousYear) {
    horses = Object.fromEntries(
      Object.values(horses).map((h) => {
        if (h.winAndYouInQualified) {
          return [
            h.id,
            {
              ...h,
              winAndYouInQualified: h.winAndYouInQualified.filter(
                (q: { year: number }) => q.year >= currentYear,
              ),
            },
          ];
        }
        return [h.id, h];
      }),
    );
  }

  // Setup initial state for produceWithPatches
  const initialState = { ...state, horses };

  const [_, patches] = produceWithPatches(initialState, (draft) => {
    const draftState = draft as GameState;
    // Build shared lookup maps once at pipeline entry — phases read from context
    const pipelineContext: PipelineContext = {
      previousDay,
      newDay,
      state: draftState,
      logs: [],
      dailyRng: createRng(hashStr("daily_" + newDay)),
      intents: draft.pendingIntents || [],
      impacts: [],
      impactLog: [],
      horseMap: new Map(Object.values(draftState.horses).map((h) => [h.id, h])),
      raceMap: new Map(Object.values(draftState.races).map((r) => [r.id, r])),
      stableMap: new Map((draftState.npcStables ?? []).map((s) => [s.id, s])),
      jockeyMap: new Map((draftState.jockeys ?? []).map((j) => [j.id, j])),
    };

    // Execute pipeline with progress callbacks
    let currentContext = pipelineContext;
    const totalStages = STAGE_PHASES.length;

    for (let i = 0; i < STAGE_PHASES.length; i++) {
      if (progressCallback) {
        progressCallback(i + 1, totalStages, STAGE_RANGES[i].name);
      }
      currentContext = executePipeline(STAGE_PHASES[i], currentContext);
    }

    // Sync the draft state with the final pipeline state
    Object.assign(draft, currentContext.state);

    // Return the logs through a side channel since patches don't include them
    return currentContext.logs as unknown as void;
  });

  // Extract logs from the produceWithPatches result (immer returns what the producer returns)
  const logs = _ as unknown as { day: number; text: string }[];

  return {
    patches,
    logs,
  };
}

/**
 * Execute multiple day advancements in the worker in a single call.
 * This eliminates N worker round-trips for multi-day advances.
 */
async function advanceDaysBatch(input: AdvanceDaysBatchInput): Promise<AdvanceDaysBatchOutput> {
  const { state, count, headless, playerRaceDays, progressCallback } = input;
  const allLogs: { day: number; text: string }[] = [];
  let daysAdvanced = 0;
  let encounteredPlayerRace = false;
  let playerRaceId: string | undefined;

  const [finalState, patches] = produceWithPatches(state, (draft) => {
    let currentState = draft as GameState;

    for (let i = 0; i < count; i++) {
      const nextDay = currentState.day + 1;

      // Check for player race (unless headless)
      if (!headless && playerRaceDays?.has(nextDay)) {
        const playerRace = Object.values(currentState.races).find(
          (r) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned),
        );
        if (playerRace) {
          encounteredPlayerRace = true;
          playerRaceId = playerRace.id;
          break;
        }
      }

      if (progressCallback) {
        progressCallback(i + 1, count);
      }

      // Run pipeline for this day
      const previousDay = currentState.day;
      const currentYear = getCurrentYear(nextDay);
      const previousYear = getCurrentYear(previousDay);

      // Clean up expired Win and You're In qualifications at year boundary
      let horses = currentState.horses;
      if (currentYear > previousYear) {
        horses = Object.fromEntries(
          Object.values(horses).map((h) => {
            if (h.winAndYouInQualified) {
              return [
                h.id,
                {
                  ...h,
                  winAndYouInQualified: h.winAndYouInQualified.filter(
                    (q: { year: number }) => q.year >= currentYear,
                  ),
                },
              ];
            }
            return [h.id, h];
          }),
        );
      }

      const pipelineContext: PipelineContext = {
        previousDay,
        newDay: nextDay,
        state: { ...currentState, horses },
        logs: [],
        dailyRng: createRng(hashStr("daily_" + nextDay)),
        intents: currentState.pendingIntents || [],
        impacts: [],
        impactLog: [],
        horseMap: new Map(Object.values(horses).map((h) => [h.id, h])),
        raceMap: new Map(Object.values(currentState.races).map((r) => [r.id, r])),
        stableMap: new Map((currentState.npcStables ?? []).map((s) => [s.id, s])),
        jockeyMap: new Map((currentState.jockeys ?? []).map((j) => [j.id, j])),
      };

      let currentContext = pipelineContext;
      for (const stagePhases of STAGE_PHASES) {
        currentContext = executePipeline(stagePhases, currentContext);
      }

      // Update state for next iteration
      currentState = {
        ...currentContext.state,
        day: nextDay,
        pendingIntents: [],
        trainingUsed: {},
      };
      allLogs.push(...currentContext.logs);
      daysAdvanced++;
    }

    // Sync the draft with the final state
    Object.assign(draft, currentState);
    return allLogs as unknown as void;
  });

  return {
    patches,
    logs: allLogs,
    daysAdvanced,
    encounteredPlayerRace,
    playerRaceId,
  };
}

/**
 * Engine worker API exposed via Comlink
 */
export type EngineWorkerApi = {
  advanceDay(input: AdvanceDayInput): Promise<AdvanceDayOutput>;
  advanceDaysBatch(input: AdvanceDaysBatchInput): Promise<AdvanceDaysBatchOutput>;
};

// Expose the worker API with Comlink
expose({
  advanceDay: (input: AdvanceDayInput) => {
    // Wrap progress callback in Comlink proxy for worker-main communication
    const proxiedCallback = input.progressCallback
      ? proxy((stage: number, total: number, name: string) => {
          if (input.progressCallback) {
            input.progressCallback(stage, total, name);
          }
        })
      : undefined;

    return advanceDay({ ...input, progressCallback: proxiedCallback });
  },

  advanceDaysBatch: (input: AdvanceDaysBatchInput) => {
    const proxiedCallback = input.progressCallback
      ? proxy((day: number, totalDays: number) => {
          if (input.progressCallback) {
            input.progressCallback(day, totalDays);
          }
        })
      : undefined;

    return advanceDaysBatch({ ...input, progressCallback: proxiedCallback });
  },
} as EngineWorkerApi);
