/**
 * store/storage.ts - Zustand persist storage adapter (IndexedDB v3)
 *
 * This file provides a custom IndexedDB-based storage adapter for Zustand persist
 * middleware, including hydration tracking and rehydration functions. NPC horses
 * are compressed to summaries before persistence and regenerated on load.
 *
 * Dependencies: @/game/types (GameState), @/services/storage/indexedDbService, @/core/persistence/npcCompression, @/core/persistence/pedigreePrune
 * Related files: store/index.ts (uses storage adapter), saveManager.ts (save slot management)
 */

/**
 * Storage Adapter for Zustand Persist
 * IndexedDB-based structured storage for game state persistence
 */

import type { GameState } from "@/game/types";
import type { Horse } from "@/core/horse/types";
import {
  saveBuckets,
  loadBuckets,
  clearDatabase,
  isIndexedDbAvailable,
  type AllBuckets,
} from "@/services/storage/indexedDbService";
import {
  splitHorsesForPersistence,
  mergeHorses,
  regenerateNpcHorses,
} from "@/core/persistence/npcCompression";
import { prunePedigree } from "@/core/persistence/pedigreePrune";
import { STORAGE_KEYS } from "@/services/storage/storageAdapter";
import { safeParseJson, bucketPayloadSchema } from "@/services/storage/schemas";

/**
 * Creates the IndexedDB storage adapter for Zustand persist.
 *
 * Provides custom storage implementation using IndexedDB for game state persistence.
 * Handles loading, saving, and removing game state.
 *
 * @returns Zustand persist storage adapter with getItem, setItem, and removeItem methods
 */
// Module-level cache for loadGameStateFromIDB result to avoid double-read
let cachedLoadResult: GameState | null | undefined = undefined;

export function createIdbStorage() {
  return {
    getItem: async (_name: string) => {
      if (cachedLoadResult !== undefined) {
        const cached = cachedLoadResult;
        cachedLoadResult = undefined;
        if (!cached) return null;
        return { state: cached, version: 0 };
      }
      const state = await loadGameStateFromIDB();
      if (!state) return null;
      return { state, version: 0 };
    },
    setItem: async (_name: string, value: { state: GameState }) => {
      if (!persistenceEnabled.value) return;
      try {
        await saveGameStateToIDB(value.state);
      } catch (error) {
        console.error("Failed to save game state to IndexedDB:", error);
      }
    },
    removeItem: async (_name: string): Promise<void> => {
      await clearDatabase();
    },
  };
}

// ─── IndexedDB save/load with NPC compression & pedigree pruning ────────────

/**
 * Keys that go into the "meta" bucket (everything except horses, races, npcStables).
 */
const META_KEYS: (keyof GameState)[] = [
  "day",
  "cash",
  "market",
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
  "weather",
  "inbox",
  "stewardsInquiries",
  "playerNominations",
  "syndicateInvestors",
  "lastTopTenRank",
  "shareTransactions",
  "shareActivityFeed",
  "outposts",
  "sireLeaderboards",
  "sireTrendHistory",
  "leaderboardsUpdatedDay",
  "damsireLeaderboard",
  "blueHenLeaderboard",
  "lastAwardYear",
  "pendingAwardCeremonies",
  "currentCeremonyIndex",
  "industryMeanEarnings",
  "industryEarningsUpdatedDay",
  "narrativeArcs",
];

export async function saveGameStateToIDB(state: GameState): Promise<void> {
  const stables = state.npcStables ?? [];

  // Split horses: player horses get full persist, NPC horses get summaries
  const { playerHorses, npcSummaries } = splitHorsesForPersistence(stables, state.horses ?? {});

  // Prune pedigrees on player horses to cap depth
  const prunedPlayerHorses: Record<string, Horse> = {};
  for (const [id, horse] of Object.entries(playerHorses)) {
    prunedPlayerHorses[id] = {
      ...horse,
      pedigree: prunePedigree(horse.pedigree) ?? horse.pedigree,
    };
  }

  // Build meta bucket (all non-horse/race/stable state)
  const meta: Record<string, unknown> = { storeVersion: (state as any).storeVersion };
  for (const key of META_KEYS) {
    meta[key as string] = (state as any)[key];
  }

  // Build npcStables bucket
  const npcStablesBucket: Record<string, any> = {};
  for (const s of stables) {
    npcStablesBucket[s.id] = s;
  }

  // Fallback to localStorage if IndexedDB is not available
  if (!isIndexedDbAvailable()) {
    try {
      const payload = {
        meta,
        horses: { playerHorses: prunedPlayerHorses, npcSummaries },
        races: state.races ?? {},
        npcStables: npcStablesBucket,
      };
      localStorage.setItem(STORAGE_KEYS.GAME_STATE_FALLBACK, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to save game state to localStorage:", e);
      throw e;
    }
    return;
  }

  await saveBuckets({
    meta,
    horses: { playerHorses: prunedPlayerHorses, npcSummaries },
    races: state.races ?? {},
    npcStables: npcStablesBucket,
  });
}

export async function loadGameStateFromIDB(): Promise<GameState | null> {
  // Try localStorage fallback first if IDB is not available
  if (!isIndexedDbAvailable()) {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAME_STATE_FALLBACK);
      if (!stored) return null;
      const payload = safeParseJson(stored, bucketPayloadSchema) as any;
      if (!payload) return null;
      return reassembleState(payload);
    } catch (e) {
      console.error("Failed to load game state from localStorage:", e);
      return null;
    }
  }

  const buckets = await loadBuckets();
  if (!buckets) return null;

  return reassembleState(buckets);
}

function reassembleState(payload: Partial<AllBuckets> & Record<string, any>): GameState {
  const meta = payload.meta ?? {};
  const horsesBucket = payload.horses ?? { playerHorses: {}, npcSummaries: [] };
  const npcStablesBucket = payload.npcStables ?? {};
  const stables = Object.values(npcStablesBucket) as any[];

  // Regenerate NPC horses from summaries
  const npcHorses = regenerateNpcHorses(horsesBucket.npcSummaries ?? [], stables);

  // Merge player + NPC horses
  const horses = mergeHorses(horsesBucket.playerHorses ?? {}, npcHorses);

  // Reconstruct state from meta + structured buckets
  const state: any = {};
  for (const [key, value] of Object.entries(meta)) {
    state[key] = value;
  }
  state.horses = horses;
  state.races = payload.races ?? {};
  state.npcStables = stables;

  return state as GameState;
}

/**
 * Mutable flag to track if hydration has completed
 * Exported as a getter/setter to allow mutation from store
 */
let _hydrationComplete = false;
export const hydrationComplete = {
  get value() {
    return _hydrationComplete;
  },
  set value(v: boolean) {
    _hydrationComplete = v;
  },
};

let _saveExists = false;
export const saveExists = {
  get value() {
    return _saveExists;
  },
  set value(v: boolean) {
    _saveExists = v;
  },
};

export function _resetSaveExists(): void {
  _saveExists = false;
}

let _persistenceEnabled = false;
export const persistenceEnabled = {
  get value() {
    return _persistenceEnabled;
  },
  set value(v: boolean) {
    _persistenceEnabled = v;
  },
};

export function _resetPersistenceEnabled(): void {
  _persistenceEnabled = false;
}

/**
 * Creates a rehydrate function that can be called with the store instance.
 *
 * Returns an async function that rehydrates the store from saved state or
 * does nothing if no save exists.
 *
 * @param useGameStore - Default store instance to use
 * @returns Async rehydrate function that takes an optional store instance
 */
export function createRehydrateStore(useGameStore: any) {
  return async function rehydrateStore(passedStore?: any): Promise<void> {
    const store = passedStore || useGameStore;

    if (!store) {
      console.warn("No store instance provided for rehydration");
      return;
    }

    const state = await loadGameStateFromIDB();
    saveExists.value = !!state;
    if (state) {
      // Cache the result so getItem doesn't re-read from IndexedDB
      cachedLoadResult = state;
      // Enable persistence before rehydrate so persist middleware can write
      persistenceEnabled.value = true;
      // Use the persist middleware's built-in rehydrate
      // This will call getItem from our custom storage
      if (store.persist) {
        await store.persist.rehydrate();
      } else {
        console.warn(
          "Store persist middleware not found during rehydration, using direct setState",
        );
        store.setState(state);
      }
      hydrationComplete.value = true;
    } else {
      // No saved state — do NOT call setState, do NOT enable persistence
      hydrationComplete.value = true;
    }
  };
}
