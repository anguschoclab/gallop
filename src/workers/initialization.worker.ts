/**
 * Initialization Worker
 * Handles game initialization in a Web Worker to offload CPU-intensive operations
 * like horse generation, race generation, and NPC setup from the main thread.
 *
 * This worker is a thin wrapper around the main-thread createInitialState function
 * from @/game/store/initialization. Keeping a single source of truth ensures
 * worker output and main-thread output always match.
 */

import { expose } from "comlink";
import type { GameState } from "@/game/types";
import type { NewGameOptions } from "@/game/store/state";
import { createInitialState as createInitialStateMain } from "@/game/store/initialization";

export type InitializeInput = {
  options?: NewGameOptions;
  progressCallback?: (stage: number, totalStages: number, stageName: string) => void;
};

export type InitializeOutput = {
  state: GameState;
};

/**
 * Creates the initial game state for a new game in the worker.
 * Delegates to the main-thread createInitialState to ensure output parity.
 */
async function createInitialState(input: InitializeInput): Promise<InitializeOutput> {
  const { options } = input;
  const state = createInitialStateMain(options);
  return { state };
}

/**
 * Initialization worker API exposed via Comlink
 */
export type InitializationWorkerApi = {
  createInitialState(input: InitializeInput): Promise<InitializeOutput>;
};

// Expose the worker API with Comlink
expose({
  createInitialState,
} as InitializationWorkerApi);
