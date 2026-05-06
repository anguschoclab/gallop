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
      onRehydrateStorage: () => (state) => {
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

// Export hydrationComplete for external consumers
export { hydrationComplete };

// Export shallow for use in components that need to compare object/array selectors
export { shallow };

// Custom hook that supports shallow comparison for object/array selectors
export const useGameWithShallow = <T>(selector: (state: StoreType) => T): T =>
  (useGame as any)(selector, shallow);

// Re-export helper functions for external consumers
export { computePayoutSplits, sanitizeAndRankResults, detectPhotoFinish } from "./helpers/raceResolution";
export { ageHorses, refreshMarket, generateUpcomingRaces, pruneOldRaces } from "./helpers/market";
export { resolvePregnancies, type PregnancyResult } from "./helpers/pregnancy";
export { maybeRecalibratePars, recomputePars, type RecalibrationResult } from "./helpers/beyer";
