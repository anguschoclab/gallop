/**
 * store/index.ts - Main Zustand store composition
 *
 * This file composes all state slices into the unified Zustand store, including
 * racing, market, breeding, campaign, core, jockey, facility, settings, breeding
 * program, horse admin, award, and utility slices. It also manages worker initialization
 * and storage operations.
 *
 * Dependencies: zustand (create, persist, shallow), ./types (StoreType, NewGameOptions), ./slices/* (all slice creators), ./storage (createIdbStorage, hydrationComplete, createRehydrateStore), ./initialization (createInitialState), comlink (wrap, expose), @/workers/engine.worker (EngineWorkerApi), @/workers/initialization.worker (InitializationWorkerApi), @/core/resolver/intents (AnyIntent)
 * Related files: All slice files in store/slices/, storage.ts (storage operations)
 */

/**
 * Main Store Index
 * Composes all slices into the unified Zustand store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState } from "@/platform/game/types";
import { createRacingSlice } from "@/platform/game/store/slices/racingSlice";
import { createMarketSlice } from "@/platform/game/store/slices/marketSlice";
import { createExchangeSlice } from "@/platform/game/store/slices/exchangeSlice";
import { createPriceAlertSlice } from "@/platform/game/store/slices/priceAlertSlice";
import { createScoutingSlice } from "@/platform/game/store/slices/scoutingSlice";
import { createAuctionSlice } from "@/platform/game/store/slices/auctionSlice";
import { createPrivateSaleSlice } from "@/platform/game/store/slices/privateSaleSlice";
import { createBreedingSlice } from "@/platform/game/store/slices/breedingSlice";
import { createCampaignSlice } from "@/platform/game/store/slices/campaignSlice";
import { createCoreSlice } from "@/platform/game/store/slices/coreSlice";
import { createJockeySlice } from "@/platform/game/store/slices/jockeySlice";
import { createFacilitySlice } from "@/platform/game/store/slices/facilitySlice";
import { createSettingsSlice } from "@/platform/game/store/slices/settingsSlice";
import { createBreedingProgramSlice } from "@/platform/game/store/slices/breedingProgramSlice";
import { createHorseAdminSlice } from "@/platform/game/store/slices/horseAdminSlice";
import { createAwardSlice } from "@/platform/game/store/slices/awardSlice";
import { createUtilitySlice } from "@/platform/game/store/slices/utilitySlice";
import { createWeatherSlice } from "@/platform/game/store/slices/weatherSlice";
import { createInboxSlice } from "@/platform/game/store/slices/inboxSlice";
import { createStaffSlice } from "@/platform/game/store/slices/staffSlice";
import { createInsuranceSlice } from "@/platform/game/store/slices/insuranceSlice";
import { createTransportSlice } from "@/platform/game/store/slices/transportSlice";
import { createTutorialSlice } from "@/platform/game/store/slices/tutorialSlice";
import { createAutoSyndicateSlice } from "@/platform/game/store/slices/autoSyndicateSlice";
import {
  createIdbStorage,
  hydrationComplete,
  saveExists,
  saveCoordinator,
  createRehydrateStore,
} from "@/platform/game/store/storage";
import { createInitialState } from "@/platform/game/store/initialization";
import { PERSISTED_KEYS } from "@/platform/game/store/persistedKeys";

import { shallow } from "zustand/shallow";
import { useShallow } from "zustand/react/shallow";
import { wrap, type Remote } from "comlink";
import { initEngineClient, resetEngineClient, getEngineClient } from "@/platform/game/store/engineClient";
import type { InitializationWorkerApi } from "@/platform/workers/initialization.worker";
import { clearDatabase } from "@/platform/persistence/storage/indexedDbService";
import type { StoreType, ActionResult } from "@/platform/game/store/types";
import type { NewGameOptions } from "@/platform/game/store/state";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { StewardsInquiry } from "@/domains/stewards/model/stewardTypes";
import { formatInquiryType } from "@/domains/stewards/model/stewardTypes";
import { generateUUID } from "@/shared/uuid/uuid";

export type { StoreType, GameStateCreator } from "@/platform/game/store/types";

// STORE_STATE_VERSION lives in ./stateVersion (leaf module — e2e specs read
// it when seeding saves without importing the store).
export { STORE_STATE_VERSION } from "@/platform/game/store/stateVersion";
import { STORE_STATE_VERSION } from "@/platform/game/store/stateVersion";

// PERSISTED_KEYS lives in ./persistedKeys (single source of truth shared
// with storage.ts so partialize and the IDB meta bucket cannot drift).

/**
 * Worker instances
 */
let initializationWorker: Remote<InitializationWorkerApi> | null = null;
let initializationWorkerInitFailed = false;

/**
 * Initialize the engine (worker-backed if the Worker API is available,
 * in-process otherwise). Kept under the historical name for call sites.
 */
export async function initEngineWorker(): Promise<void> {
  await initEngineClient();
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

  // Reset failure flag when attempting a new initialization
  initializationWorkerInitFailed = false;

  const worker = new Worker(new URL("../../workers/initialization.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.addEventListener("error", (e) => {
    console.error("Initialization worker failed to load:", e.message, e.filename, e.lineno);
    initializationWorker = null;
    initializationWorkerInitFailed = true;
  });
  initializationWorker = wrap<InitializationWorkerApi>(worker);
}

/**
 * Get the engine client singleton. Creates an in-process engine lazily if
 * the worker has not been initialized — callers never see a null engine.
 */
export { getEngineClient, resetEngineClient };

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
      ...createCoreSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Racing slice
      ...createRacingSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Market slice
      ...createMarketSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Exchange slice
      ...createExchangeSlice(set, get),
      ...createPriceAlertSlice(set, get),

      // Scouting slice
      ...createScoutingSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Auction slice
      ...createAuctionSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Private sale slice
      ...createPrivateSaleSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Breeding slice
      ...createBreedingSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Campaign slice
      ...createCampaignSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Jockey slice
      ...createJockeySlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Facility slice
      ...createFacilitySlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Settings slice
      ...createSettingsSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Breeding program slice
      ...createBreedingProgramSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Horse admin slice
      ...createHorseAdminSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Award slice
      ...createAwardSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Utility slice
      ...createUtilitySlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Weather slice (per-track Markov sim, populated by weatherPhase)
      ...createWeatherSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Inbox slice (Message Center)
      ...createInboxSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Staff negotiation slice
      ...createStaffSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Insurance slice
      ...createInsuranceSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Transport slice
      ...createTransportSlice(set, get, (intent: AnyIntent) => get().enqueueIntent(intent)),

      // Tutorial slice (guided first-session coach)
      ...createTutorialSlice(set, get),

      // Automatic daily syndication of top stallions
      ...createAutoSyndicateSlice(set, get),

      // Stewards inquiry action — used by the useStewardsInquiry hook after
      // the player watches a race complete in the UI.
      addStewardsInquiry: (inquiry: StewardsInquiry) => {
        set((state) => {
          const race = state.races[inquiry.raceId];
          const races = race
            ? {
                ...state.races,
                [inquiry.raceId]: {
                  ...race,
                  inquiries: [...(race.inquiries ?? []), inquiry],
                },
              }
            : state.races;

          // Apply jockey suspension if the inquiry has a suspension outcome
          let jockeys = state.jockeys;
          if (
            inquiry.outcome === "suspension" &&
            inquiry.suspensionDays &&
            inquiry.accusedJockeyId
          ) {
            jockeys = state.jockeys?.map((j) =>
              j.id === inquiry.accusedJockeyId
                ? { ...j, suspendedUntil: state.day + inquiry.suspensionDays! }
                : j,
            );
          }

          return {
            stewardsInquiries: [...state.stewardsInquiries, inquiry],
            races,
            jockeys,
            inbox: [
              ...(state.inbox ?? []),
              {
                id: generateUUID(),
                day: inquiry.day,
                category: "stewards" as const,
                priority: "urgent" as const,
                title: `Stewards' Inquiry: ${race?.name ?? inquiry.raceId}`,
                body: `${formatInquiryType(inquiry.type)} — ${inquiry.description}`,
                cta: {
                  label: "View Race",
                  route: "race.$raceId",
                  params: { raceId: inquiry.raceId },
                },
              },
            ],
          };
        });
      },

      // Start new game action
      startNewGame: async (
        options: NewGameOptions,
        progressCallback?: (stage: number, total: number, name: string) => void,
      ) => {
        // Reset the engine authority and start a fresh client so revisions
        // restart cleanly for the new game generation.
        resetEngineClient();
        await initEngineWorker();
        await initInitializationWorker();

        // Clear IndexedDB storage when starting a new game
        const { clearDatabase: clearIDB } = await import("@/platform/persistence/storage/indexedDbService");
        await clearIDB();

        // Route through initialization worker if available, fall back to main thread
        let newState: GameState;
        try {
          const worker = getInitializationWorker();
          const result = await Promise.race([
            worker.createInitialState({ options, progressCallback }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Worker initialization timed out")), 15000),
            ),
          ]);
          newState = result.state;
        } catch {
          // Worker not available, timed out, or failed — use main thread
          console.warn("Falling back to main-thread state initialization");
          newState = createInitialState(options, progressCallback);
        }
        set({
          ...(newState as Partial<StoreType>),
          // New game = new generation + revision 0; in-flight results from a
          // previous game are stale and must be dropped by the CAS guard.
          engineRevision: 0,
          engineGeneration: (get().engineGeneration ?? 0) + 1,
        });

        // Arm a fresh persistence session (resets revision tracking) before saving
        saveCoordinator.disarm();
        saveCoordinator.arm();

        // Force an immediate, awaited save so the state is on disk before navigation.
        // Route through the coordinator chain: prior in-flight writes land
        // strictly before this snapshot, so a stale save can't clobber the
        // fresh game.
        const storeState = get();
        const partial = {} as GameState;
        PERSISTED_KEYS.forEach((key) => {
          (partial as unknown as Record<string, unknown>)[key] = storeState[key];
        });
        await saveCoordinator.enqueue(partial);
        saveExists.value = true;
      },
    }),
    {
      name: "gallop-game-state",
      storage: createIdbStorage(),
      onRehydrateStorage: () => async (state) => {
        if (!state) {
          hydrationComplete.value = true;
          return;
        }

        // Version mismatch: stored data was written by an older/incompatible schema.
        // No backward compatibility — wipe the save and reset.
        if (state?.storeVersion !== STORE_STATE_VERSION) {
          await clearDatabase();
          saveExists.value = false;
          saveCoordinator.disarm();
          hydrationComplete.value = true;
          return;
        }

        hydrationComplete.value = true;
      },
      partialize: (state) => {
        const partial = {} as GameState;
        PERSISTED_KEYS.forEach((key) => {
          (partial as unknown as Record<string, unknown>)[key] = state[key];
        });
        return partial;
      },
    },
  ),
);

// Export rehydrate function
export const rehydrateStoreMain = createRehydrateStore(useGame);

// Export as rehydrateStore for backwards compatibility
export { rehydrateStoreMain as rehydrateStore };

// Export hydrationComplete and saveExists for external consumers
export { hydrationComplete, saveExists, saveCoordinator };

// Export shallow for use in components that need to compare object/array selectors
export { shallow };

export const useGameWithShallow = <T>(selector: (state: StoreType) => T): T =>
  useGame(useShallow(selector));

// Alias for backwards compatibility
export { useGame as useGallopStore };

// Export common types for external use
export type { ActionResult };
