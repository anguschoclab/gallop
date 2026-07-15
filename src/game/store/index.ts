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
import { createInboxSlice } from "./slices/inboxSlice";
import { createStaffSlice } from "./slices/staffSlice";
import { createInsuranceSlice } from "./slices/insuranceSlice";
import { createTransportSlice, type TransportSlice } from "./slices/transportSlice";
import { createOpfsStorage, hydrationComplete, saveExists, persistenceEnabled, createRehydrateStore } from "./storage";
import { createInitialState } from "./initialization";
import type { CoreState } from "@/game/store/state/coreState";

import { shallow } from "zustand/shallow";
import { useShallow } from "zustand/react/shallow";
import { wrap, expose, type Remote } from "comlink";
import type { EngineWorkerApi } from "@/workers/engine.worker";
import type { InitializationWorkerApi } from "@/workers/initialization.worker";
import { clearDatabase } from "@/services/storage/indexedDbService";
import type { StoreType, ActionResult, GameStateCreator } from "./types";
import type { NewGameOptions } from "@/game/store/state";
import type { AnyIntent } from "@/core/resolver/intents";

export type { StoreType, GameStateCreator } from "./types";

/**
 * Increment this when the persisted state shape changes in a way that is
 * incompatible with previously-stored data. On a version mismatch the store
 * resets to defaults, keeping only fields that are always safe to carry over
 * (playerNominations, syndicateInvestors).
 */
export const STORE_STATE_VERSION = 3;

// List of state keys that should be persisted to storage.
// NOTE: "horses" is handled specially by the storage adapter (split into
// player horses + NPC summaries). It remains here so partialize includes it
// in the state passed to setItem, where the splitting occurs.
const PERSISTED_KEYS: (keyof GameState | "storeVersion")[] = [
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
  "reservedHorseNames",
  "seasonRecords",
  "hallOfFame",
  "trackRecords",
  "horseLeaderboards",
  "founders",
  "lastFounderUpdateDay",
  "syndicates",
  "staffPool",
  "hiredStaff",
  // Phase 3 — dynamic weather sim per track
  "weather" as keyof GameState,
  // Inbox / Message Centre — must persist so unread counts survive reloads
  "inbox" as keyof GameState,
  // Stewards inquiry system
  "stewardsInquiries" as keyof GameState,
  // Stakes nomination system
  "playerNominations" as keyof GameState,
  // Player-facing syndication investors
  "syndicateInvestors" as keyof GameState,
  // Persisted state format version — used to detect incompatible stored data
  "storeVersion" as any,
  // Season standings — last top-10 rank for change detection
  "lastTopTenRank" as keyof GameState,
];

/**
 * Worker instances
 */
let engineWorker: Remote<EngineWorkerApi> | null = null;
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
      // Persisted state version — checked on rehydration to detect incompatible stored data
      storeVersion: STORE_STATE_VERSION,

      // Systems state properties (required fields from SystemsState)
      npcStables: [],
      breedingPrograms: [],
      awards: [],
      usedHorseNames: [],
      usedJockeyNames: [],
      reservedHorseNames: [],
      stewardsInquiries: [],
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

      // Inbox slice (Message Center)
      ...createInboxSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Staff negotiation slice
      ...createStaffSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Insurance slice
      ...createInsuranceSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Transport slice
      ...createTransportSlice(set as any, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Stewards inquiry action — used by the useStewardsInquiry hook after
      // the player watches a race complete in the UI.
      addStewardsInquiry: (inquiry: any) => {
        set((state: any) => ({
          stewardsInquiries: [...(state.stewardsInquiries ?? []), inquiry],
        }));
      },

      // Start new game action
      startNewGame: async (options: NewGameOptions) => {
        // Initialize workers if not already initialized
        await initEngineWorker();
        await initInitializationWorker();

        // Clear IndexedDB storage when starting a new game
        const { clearDatabase: clearIDB } = await import("@/services/storage/indexedDbService");
        await clearIDB();

        // Route through initialization worker if available, fall back to main thread
        let newState: GameState;
        try {
          const worker = getInitializationWorker();
          const result = await worker.createInitialState({ options });
          newState = result.state;
        } catch {
          // Worker not available (e.g. test environment) — use main thread
          newState = createInitialState(options);
        }
        set({ ...newState } as any);

        // Enable persistence before saving
        persistenceEnabled.value = true;

        // Force an immediate, awaited save so the state is on disk before navigation.
        // The persist middleware's setItem is async and not awaited by set(),
        // so we call saveGameState directly to guarantee persistence.
        const storeState = get() as any;
        const partial: any = {};
        PERSISTED_KEYS.forEach((key) => {
          partial[key] = storeState[key];
        });
        // Use the new IDB-based save path
        const { saveGameStateToIDB } = await import("./storage");
        await saveGameStateToIDB(partial);
        saveExists.value = true;
      },
    }),
    {
      name: "gallop-game-state",
      storage: createOpfsStorage(),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          hydrationComplete.value = true;
          return;
        }

        // Version mismatch: stored data was written by an older/incompatible schema.
        // No backward compatibility for v3 — wipe the save and reset.
        if ((state as any).storeVersion !== STORE_STATE_VERSION) {
          clearDatabase();
          saveExists.value = false;
          persistenceEnabled.value = false;
          hydrationComplete.value = true;
          return;
        }

        hydrationComplete.value = true;
      },
      partialize: (state) => {
        const partial: any = {};
        PERSISTED_KEYS.forEach((key) => {
          partial[key] = (state as any)[key];
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

// Export hydrationComplete and saveExists for external consumers
export { hydrationComplete, saveExists, persistenceEnabled };

// Export shallow for use in components that need to compare object/array selectors
export { shallow };

export const useGameWithShallow = <T>(selector: (state: StoreType) => T): T =>
  useGame(useShallow(selector));

// Alias for backwards compatibility
export { useGame as useGallopStore };

// Export common types for external use
export type { ActionResult };
