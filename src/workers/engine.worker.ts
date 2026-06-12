/**
 * Engine Worker
 * Executes the game pipeline in a Web Worker to offload CPU-intensive operations
 * from the main thread, keeping the UI responsive during day advancement.
 */

import { expose, proxy } from "comlink";
import { produceWithPatches, enablePatches, type Patch } from "immer";
import type { GameState } from "@/game/types";
import { executePipeline, type PipelineContext } from "@/core/time/pipeline";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
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
    horses = horses.map((h) => {
      if (h.winAndYouInQualified) {
        h.winAndYouInQualified = h.winAndYouInQualified.filter(
          (q: { year: number }) => q.year >= currentYear,
        );
      }
      return h;
    });
  }

  // Setup initial state for produceWithPatches
  const initialState = { ...state, horses };

  const [_, patches] = produceWithPatches(initialState, (draft) => {
    // Setup pipeline context using the draft state
    const pipelineContext: PipelineContext = {
      previousDay,
      newDay,
      state: draft as GameState,
      logs: [],
      dailyRng: createRng(hashStr("daily_" + newDay)),
      intents: draft.pendingIntents || [],
      impacts: [],
      impactLog: [],
    };

    // Execute pipeline with progress callbacks
    let currentContext = pipelineContext;
    const totalStages = 5;

    // Stage 1: Intent processing + early expiry (phases 1-10)
    if (progressCallback) {
      progressCallback(1, totalStages, "Intent processing");
    }
    currentContext = executePipeline(
      GAME_PIPELINE_PHASES.filter((p) => p.order >= 1 && p.order <= 10),
      currentContext,
    );

    // Stage 2: Resolution intents (phases 15-45)
    if (progressCallback) {
      progressCallback(2, totalStages, "Resolution intents");
    }
    currentContext = executePipeline(
      GAME_PIPELINE_PHASES.filter((p) => p.order >= 15 && p.order <= 45),
      currentContext,
    );

    // Stage 3: Core simulation (phases 50-95)
    if (progressCallback) {
      progressCallback(3, totalStages, "Core simulation");
    }
    currentContext = executePipeline(
      GAME_PIPELINE_PHASES.filter((p) => p.order >= 50 && p.order <= 95),
      currentContext,
    );

    // Stage 4: Lifecycle (phases 100-160)
    if (progressCallback) {
      progressCallback(4, totalStages, "Lifecycle");
    }
    currentContext = executePipeline(
      GAME_PIPELINE_PHASES.filter((p) => p.order >= 100 && p.order <= 160),
      currentContext,
    );

    // Stage 5: Final resolution (phases 67-200)
    if (progressCallback) {
      progressCallback(5, totalStages, "Final resolution");
    }
    currentContext = executePipeline(
      GAME_PIPELINE_PHASES.filter((p) => p.order >= 67 && p.order <= 200),
      currentContext,
    );

    // Sync the draft state with the final pipeline state
    Object.assign(draft, currentContext.state);

    // Return the logs through a side channel since patches don't include them
    return currentContext.logs as any;
  });

  // Extract logs from the produceWithPatches result (immer returns what the producer returns)
  const logs = _ as any as { day: number; text: string }[];

  return {
    patches,
    logs,
  };
}

/**
 * Engine worker API exposed via Comlink
 */
export type EngineWorkerApi = {
  advanceDay(input: AdvanceDayInput): Promise<AdvanceDayOutput>;
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
} as EngineWorkerApi);
