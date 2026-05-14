/**
 * store/index.ts - Main Zustand store composition
 *
 * This file composes all state slices into the unified Zustand store, including
 * racing, market, breeding, campaign, core, jockey, facility, settings, breeding
 * program, horse admin, award, and utility slices. It also manages worker initialization
 * and storage operations.
 *
 * Dependencies: zustand (create, persist, shallow), ./types (StoreType, NewGameOptions), ./slices/* (all slice creators), ./storage (createOpfsStorage, hydrationComplete, createRehydrateStore), ./initialization (createInitialState), comlink (wrap, expose), @/workers/engine.worker (EngineWorkerApi), @/workers/storage.worker (StorageWorkerApi), @/workers/initialization.worker (InitializationWorkerApi), @/core/resolver/intents (AnyIntent)
 * Related files: All slice files in store/slices/, storage.ts (storage operations)
 */

/**
 * Main Store Index
 * Composes all slices into the unified Zustand store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState } from "@/game/types";
import { createRacingSlice, type RacingSlice } from "./slices/racingSlice";
import { createMarketSlice, type MarketSlice } from "./slices/marketSlice";
import { createScoutingSlice } from "./slices/scoutingSlice";
import { createAuctionSlice } from "./slices/auctionSlice";
import { createPrivateSaleSlice } from "./slices/privateSaleSlice";
import { createBreedingSlice, type BreedingSlice } from "./slices/breedingSlice";
import { createCampaignSlice, type CampaignSlice } from "./slices/campaignSlice";
import { createCoreSlice, type CoreSlice } from "./slices/coreSlice";
import { createJockeySlice } from "./slices/jockeySlice";
import { createFacilitySlice } from "./slices/facilitySlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { createBreedingProgramSlice } from "./slices/breedingProgramSlice";
import { createHorseAdminSlice } from "./slices/horseAdminSlice";
import { createAwardSlice } from "./slices/awardSlice";
import { createUtilitySlice } from "./slices/utilitySlice";
import { createWeatherSlice } from "./slices/weatherSlice";
import { createOpfsStorage, hydrationComplete, createRehydrateStore } from "./storage";
import { createInitialState } from "./initialization";
import type { CoreState } from "@/game/state/coreState";

import { shallow } from "zustand/shallow";
import { useShallow } from "zustand/react/shallow";
import { wrap, expose, type Remote } from "comlink";
import type { EngineWorkerApi } from "@/workers/engine.worker";
import type { StorageWorkerApi } from "@/workers/storage.worker";
import type { InitializationWorkerApi } from "@/workers/initialization.worker";
import type { StoreType, ActionResult, GameStateCreator } from "./types";
import type { NewGameOptions } from "@/game/state";
import type { AnyIntent } from "@/core/resolver/intents";

export type { StoreType, GameStateCreator } from "./types";

// List of state keys that should be persisted to storage.
// Any new game state fields should be added here to ensure they survive a refresh.
const PERSISTED_KEYS: (keyof GameState)[] = [
  "day",
  "cash",
  "horses",
  "market",
  "races",
  "trainingUsed",
  "log",
  "news",
  "archive",
  "pregnancies",
  "activeBreedingProgram",
  "triplecrownHistory",
  "paceSamples",
  "calibratedPars",
  "lastCalibrationDay",
  "npcStables",
  "npcAIManager",
  "scoutReports",
  "auctions",
  "jockeys",
  "awards",
  "campaigns",
  "expenses",
  "transactions",
  "replays",
  "reputation",
  "transports",
  "userSettings",
  "facilities",
  "npcFacilities",
  "playerProfile",
  "privateSaleOffers",
  "claims",
  "breedingPrograms",
  "usedHorseNames",
  "usedJockeyNames",
  "seasonRecords",
  "hallOfFame",
  "trackRecords",
  "horseLeaderboards",
  "founders",
  "lastFounderUpdateDay",
  "syndicates",
  "staffPool",
  "hiredStaff",
];

/**
 * Worker instances
 */
let engineWorker: Remote<EngineWorkerApi> | null = null;
let storageWorker: Remote<StorageWorkerApi> | null = null;
let initializationWorker: Remote<InitializationWorkerApi> | null = null;

/**
 * Initialize engine worker.
 *
 * Creates and wraps the engine worker for race simulation and other computations.
 * Only initializes in browser context where Worker API is available.
 *
 * @returns Promise that resolves when worker is initialized
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
 * Initialize storage worker.
 *
 * Creates and wraps the storage worker for persistence operations.
 * Only initializes in browser context where Worker API is available.
 *
 * @returns Promise that resolves when worker is initialized
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
 * Initialize initialization worker.
 *
 * Creates and wraps the initialization worker for game setup operations.
 * Only initializes in browser context where Worker API is available.
 *
 * @returns Promise that resolves when worker is initialized
 */
export async function initInitializationWorker(): Promise<void> {
  if (initializationWorker) return;

  // Only initialize workers in browser context where Worker API is available
  if (typeof Worker === "undefined") {
    console.warn("Worker API not available, skipping initialization worker initialization");
    return;
  }

  const worker = new Worker(new URL("@/workers/initialization.worker", import.meta.url), {
    type: "module",
  });
  initializationWorker = wrap<InitializationWorkerApi>(worker);
}

/**
 * Get engine worker instance.
 *
 * Returns the initialized engine worker. Throws error if not initialized.
 *
 * @returns Engine worker remote instance
 * @throws Error if engine worker not initialized
 */
export function getEngineWorker(): Remote<EngineWorkerApi> {
  if (!engineWorker) {
    throw new Error("Engine worker not initialized. Call initEngineWorker() first.");
  }
  return engineWorker;
}

/**
 * Get storage worker instance.
 *
 * Returns the initialized storage worker. Throws error if not initialized.
 *
 * @returns Storage worker remote instance
 * @throws Error if storage worker not initialized
 */
export function getStorageWorker(): Remote<StorageWorkerApi> {
  if (!storageWorker) {
    throw new Error("Storage worker not initialized. Call initStorageWorker() first.");
  }
  return storageWorker;
}

/**
 * Get initialization worker instance.
 *
 * Returns the initialized initialization worker. Throws error if not initialized.
 *
 * @returns Initialization worker remote instance
 * @throws Error if initialization worker not initialized
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
 * Main Zustand store composed from all slices
 */
export const useGame = create<StoreType>()(
  persist(
    (set, get) => ({
    // Systems state properties (required fields from SystemsState)
    npcStables: [],
    breedingPrograms: [],
    awards: [],
    usedHorseNames: [],
    usedJockeyNames: [],
    staffPool: [],
    hiredStaff: [],
    npcAIManager: { stableStates: {}, globalDay: 1, regionalKings: {} },

    // Core slice
    ...createCoreSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Racing slice
    ...createRacingSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Market slice
    ...createMarketSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Scouting slice
    ...createScoutingSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Auction slice
    ...createAuctionSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Private sale slice
    ...createPrivateSaleSlice(set as any, get, (intent: AnyIntent) =>
      get().enqueueIntent(intent),
    ),

    // Breeding slice
    ...createBreedingSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Campaign slice
    ...createCampaignSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Jockey slice
    ...createJockeySlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Facility slice
    ...createFacilitySlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Settings slice
    ...createSettingsSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Breeding program slice
    ...createBreedingProgramSlice(set as any, get, (intent: AnyIntent) =>
      get().enqueueIntent(intent),
    ),

    // Horse admin slice
    ...createHorseAdminSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Award slice
    ...createAwardSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Utility slice
    ...createUtilitySlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Weather slice (per-track Markov sim, populated by weatherPhase)
    ...createWeatherSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

    // Start new game action
    startNewGame: async (options: NewGameOptions) => {
      // Initialize workers if not already initialized
      await initEngineWorker();
      await initStorageWorker();
      await initInitializationWorker();

      // Clear OPFS storage when starting a new game
      await (await import("@/services/storageAdapter")).clearGameState();
      set({ ...createInitialState(options) } as any);
    },
  }),
  {
    name: "gallop-game-state",
    storage: createOpfsStorage(),
    onRehydrateStorage: () => (state) => {
      hydrationComplete.value = true;
    },
    partialize: (state) => {
      const partial: any = {};
      PERSISTED_KEYS.forEach((key) => {
        partial[key] = state[key];
      });
      return partial;
    },
  },
  ),
);

// Export rehydrate function
export const rehydrateStoreMain = createRehydrateStore(createInitialState, useGame);

// Export as rehydrateStore for backwards compatibility
export { rehydrateStoreMain as rehydrateStore };

// Export hydrationComplete for external consumers
export { hydrationComplete };

// Export shallow for use in components that need to compare object/array selectors
export { shallow };

export const useGameWithShallow = <T>(selector: (state: StoreType) => T): T =>
  useGame(useShallow(selector));

// Alias for backwards compatibility
export { useGame as useGallopStore };

// Export common types for external use
export type { ActionResult };
