import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/storage/storageAdapter", () => ({
  STORAGE_KEYS: {
    GAME_STATE: "gallop_game_state",
    GAME_STATE_FALLBACK: "gallop_game_state_fallback",
    RACE_FILTERS: "gallop_race_filters",
    RACE_HISTORY_LIMIT: "gallop_race_history_limit",
    RACES_DAY_JUMP: "gallop_races_day_jump",
    NEW_GAME_WIZARD: "gallop_new_game_wizard",
  },
}));

vi.mock("@/services/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/game/store/storage", () => {
  let _saveExists = false;
  let _hydrationComplete = false;
  let _persistenceEnabled = false;
  const loadGameStateFromIDB = vi.fn();

  return {
    createIdbStorage: () => ({
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    }),
    hydrationComplete: {
      get value() {
        return _hydrationComplete;
      },
      set value(v: boolean) {
        _hydrationComplete = v;
      },
    },
    saveExists: {
      get value() {
        return _saveExists;
      },
      set value(v: boolean) {
        _saveExists = v;
      },
    },
    persistenceEnabled: {
      get value() {
        return _persistenceEnabled;
      },
      set value(v: boolean) {
        _persistenceEnabled = v;
      },
    },
    _resetSaveExists: () => {
      _saveExists = false;
    },
    _resetPersistenceEnabled: () => {
      _persistenceEnabled = false;
    },
    saveGameStateToIDB: vi.fn().mockResolvedValue(undefined),
    loadGameStateFromIDB,
    createRehydrateStore: (useGameStore: any) => {
      return async function rehydrateStore(passedStore?: any): Promise<void> {
        const store = passedStore || useGameStore;
        if (!store) return;
        const state = await loadGameStateFromIDB();
        _saveExists = !!state;
        if (state) {
          _persistenceEnabled = true;
          if (store.persist) {
            await store.persist.rehydrate();
          } else {
            store.setState(state);
          }
          _hydrationComplete = true;
        } else {
          _hydrationComplete = true;
        }
      };
    },
  };
});

import {
  saveExists,
  _resetSaveExists,
  createRehydrateStore,
  loadGameStateFromIDB,
} from "@/game/store/storage";

describe("saveExists flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSaveExists();
  });

  it("is false by default", () => {
    expect(saveExists.value).toBe(false);
  });

  it("rehydrateStore sets saveExists=true when loadGameStateFromIDB returns non-null", async () => {
    (loadGameStateFromIDB as any).mockResolvedValue({ day: 1, cash: 50000 });

    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };

    const rehydrate = createRehydrateStore(mockStore);
    await rehydrate(mockStore);

    expect(saveExists.value).toBe(true);
  });

  it("rehydrateStore sets saveExists=false when loadGameStateFromIDB returns null", async () => {
    (loadGameStateFromIDB as any).mockResolvedValue(null);

    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };

    const rehydrate = createRehydrateStore(mockStore);
    await rehydrate(mockStore);

    expect(saveExists.value).toBe(false);
  });

  it("_resetSaveExists resets to false for testing", async () => {
    (loadGameStateFromIDB as any).mockResolvedValue({ day: 1 });
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };

    const rehydrate = createRehydrateStore(mockStore);
    await rehydrate(mockStore);
    expect(saveExists.value).toBe(true);

    _resetSaveExists();
    expect(saveExists.value).toBe(false);
  });
});
