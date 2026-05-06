/**
 * Main Store Index
 * Composes all slices into the unified Zustand store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState } from "@/game/types";
import { createRacingSlice, type RacingSlice } from "./slices/racingSlice";
import { createMarketSlice, type MarketSlice } from "./slices/marketSlice";
import { createBreedingSlice, type BreedingSlice } from "./slices/breedingSlice";
import { createSystemsSlice, type SystemsSlice } from "./slices/systemsSlice";
import { createCampaignSlice, type CampaignSlice } from "./slices/campaignSlice";
import { createCoreSlice, type CoreSlice } from "./slices/coreSlice";
import { createOpfsStorage, hydrationComplete, createRehydrateStore } from "./storage";
import { createInitialState } from "./initialization";
import type { CoreState } from "@/game/state/coreState";
import { shallow } from "zustand/shallow";
import { wrap, expose, type Remote } from "comlink";
import type { EngineWorkerApi } from "@/workers/engine.worker";
import type { StorageWorkerApi } from "@/workers/storage.worker";
import type { InitializationWorkerApi } from "@/workers/initialization.worker";

/**
 * Worker instances
 */
let engineWorker: Remote<EngineWorkerApi> | null = null;
let storageWorker: Remote<StorageWorkerApi> | null = null;
let initializationWorker: Remote<InitializationWorkerApi> | null = null;

/**
 * Initialize engine worker
 */
export async function initEngineWorker(): Promise<void> {
  if (engineWorker) return;

  // Only initialize workers in browser context where Worker API is available
  if (typeof Worker === "undefined") {
    console.warn("Worker API not available, skipping engine worker initialization");
    return;
  }

  const worker = new Worker(new URL("@/workers/engine.worker", import.meta.url), {
    type: "module",
  });
  engineWorker = wrap<EngineWorkerApi>(worker);
}

/**
 * Initialize storage worker
 */
export async function initStorageWorker(): Promise<void> {
  if (storageWorker) return;

  // Only initialize workers in browser context where Worker API is available
  if (typeof Worker === "undefined") {
    console.warn("Worker API not available, skipping storage worker initialization");
    return;
  }

  const worker = new Worker(new URL("@/workers/storage.worker", import.meta.url), {
    type: "module",
  });
  storageWorker = wrap<StorageWorkerApi>(worker);
}

/**
 * Initialize initialization worker
 */
export async function initInitializationWorker(): Promise<void> {
  if (initializationWorker) return;

  // Only initialize workers in browser context where Worker API is available
  if (typeof Worker === "undefined") {
    console.warn("Worker API not available, skipping initialization worker initialization");
    return;
  }

  const worker = new Worker(
    new URL("@/workers/initialization.worker", import.meta.url),
    { type: "module" },
  );
  initializationWorker = wrap<InitializationWorkerApi>(worker);
}

/**
 * Get engine worker instance
 */
export function getEngineWorker(): Remote<EngineWorkerApi> {
  if (!engineWorker) {
    throw new Error("Engine worker not initialized. Call initEngineWorker() first.");
  }
  return engineWorker;
}

/**
 * Get storage worker instance
 */
export function getStorageWorker(): Remote<StorageWorkerApi> {
  if (!storageWorker) {
    throw new Error("Storage worker not initialized. Call initStorageWorker() first.");
  }
  return storageWorker;
}

/**
 * Get initialization worker instance
 */
export function getInitializationWorker(): Remote<InitializationWorkerApi> {
  if (!initializationWorker) {
    throw new Error(
      "Initialization worker not initialized. Call initInitializationWorker() first.",
    );
  }
  return initializationWorker;
}

/**
 * Standard action result type for store actions
 */
export type ActionResult = { ok: true } | { ok: false; reason: string };

/**
 * Composed store type combining all slices
 */
export type StoreType = CoreState &
  RacingSlice &
  MarketSlice &
  BreedingSlice &
  SystemsSlice &
  CampaignSlice &
  CoreSlice & {
    startNewGame: (options: any) => Promise<void>;
  };

/**
 * Main Zustand store composed from all slices
 */
export const useGame = create<StoreType>()(
  persist(
    (set, get) => ({
      // Core slice
      ...createCoreSlice(set, get),

      // Racing slice
      ...createRacingSlice(set, get, (intent: any) => get().enqueueIntent(intent)),

      // Market slice
      ...createMarketSlice(set, get, (intent: any) => get().enqueueIntent(intent)),

      // Breeding slice
      ...createBreedingSlice(set, get, (intent: any) => get().enqueueIntent(intent)),

      // Systems slice
      ...createSystemsSlice(set, get),

      // Campaign slice
      ...createCampaignSlice(set, get),

      // Start new game action
      startNewGame: async (options: any) => {
        // Initialize workers if not already initialized
        await initEngineWorker();
        await initStorageWorker();
        await initInitializationWorker();

        // Clear OPFS storage when starting a new game
        await (await import("@/services/storageAdapter")).clearGameState();
        set({ ...createInitialState(options) });
      },
    }),
    {
      name: "gallop-game-state",
      storage: createOpfsStorage(),
      partialize: (state) => ({
        day: state.day,
        cash: state.cash,
        horses: state.horses,
        market: state.market,
        races: state.races,
        trainingUsed: state.trainingUsed,
        log: state.log,
        pregnancies: state.pregnancies,
        paceSamples: state.paceSamples,
        calibratedPars: state.calibratedPars,
        lastCalibrationDay: state.lastCalibrationDay,
        npcStables: state.npcStables,
        npcAIManager: state.npcAIManager,
        scoutReports: state.scoutReports,
        auctions: state.auctions,
        jockeys: state.jockeys,
        awards: state.awards,
        campaigns: state.campaigns,
        expenses: state.expenses,
        transactions: state.transactions,
        replays: state.replays,
        reputation: state.reputation,
        transports: state.transports,
        userSettings: state.userSettings,
        facilities: state.facilities,
        npcFacilities: state.npcFacilities,
        playerProfile: state.playerProfile,
      }),
      onRehydrateStorage: () => async (state) => {
        // Initialize workers on rehydration (app load or existing save load)
        await initEngineWorker();
        await initStorageWorker();
        await initInitializationWorker();

        hydrationComplete.value = true;
        if (state?.calibratedPars) {
          const { setCalibratedPars } = require("@/game/beyer");
          setCalibratedPars(state.calibratedPars);
        }
      },
    },
  ),
);

// Export rehydrate function
export const rehydrateStoreMain = createRehydrateStore(createInitialState);

// Export as rehydrateStore for backwards compatibility
export { rehydrateStoreMain as rehydrateStore };

// Export hydrationComplete for external consumers
export { hydrationComplete };

// Export shallow for use in components that need to compare object/array selectors
export { shallow };

// Custom hook that supports shallow comparison for object/array selectors
export const useGameWithShallow = <T>(selector: (state: StoreType) => T): T =>
  (useGame as any)(selector, shallow);
