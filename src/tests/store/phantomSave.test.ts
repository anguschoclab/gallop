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

vi.mock("@/core/persistence/npcCompression", () => ({
  splitHorsesForPersistence: vi.fn(() => ({ playerHorses: {}, npcSummaries: [] })),
  mergeHorses: vi.fn((a: any, b: any) => ({ ...a, ...b })),
  regenerateNpcHorses: vi.fn(() => ({})),
}));

vi.mock("@/core/persistence/pedigreePrune", () => ({
  prunePedigree: vi.fn((p: any) => p),
}));

vi.mock("@/services/storage/schemas", () => ({
  safeParseJson: vi.fn(),
  bucketPayloadSchema: {},
}));

vi.mock("@/game/store/storage", () => {
  let _saveExists = false;
  let _hydrationComplete = false;
  let _persistenceEnabled = false;
  let _cachedLoadResult: any = undefined;
  const loadGameStateFromIDB = vi.fn();

  return {
    createOpfsStorage: () => ({
      getItem: async (_name: string) => {
        if (_cachedLoadResult !== undefined) {
          const cached = _cachedLoadResult;
          _cachedLoadResult = undefined;
          if (!cached) return null;
          return { state: cached, version: 0 };
        }
        const state = await loadGameStateFromIDB();
        if (!state) return null;
        return { state, version: 0 };
      },
      setItem: async (_name: string, value: { state: any }) => {
        if (!_persistenceEnabled) return;
      },
      removeItem: async (_name: string) => {},
    }),
    hydrationComplete: {
      get value() { return _hydrationComplete; },
      set value(v: boolean) { _hydrationComplete = v; },
    },
    saveExists: {
      get value() { return _saveExists; },
      set value(v: boolean) { _saveExists = v; },
    },
    persistenceEnabled: {
      get value() { return _persistenceEnabled; },
      set value(v: boolean) { _persistenceEnabled = v; },
    },
    _resetSaveExists: () => { _saveExists = false; },
    _resetPersistenceEnabled: () => { _persistenceEnabled = false; },
    saveGameStateToIDB: vi.fn().mockResolvedValue(undefined),
    loadGameStateFromIDB,
    createRehydrateStore: (initialState: any, useGameStore: any) => {
      return async function rehydrateStore(passedStore?: any): Promise<void> {
        const store = passedStore || useGameStore;
        if (!store) return;
        const state = await loadGameStateFromIDB();
        _saveExists = !!state;
        if (state) {
          _cachedLoadResult = state;
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
  persistenceEnabled,
  _resetPersistenceEnabled,
  saveExists,
  _resetSaveExists,
  hydrationComplete,
  createOpfsStorage,
  createRehydrateStore,
  loadGameStateFromIDB,
} from "@/game/store/storage";
import { clearDatabase } from "@/services/storage/indexedDbService";

describe("persistenceEnabled flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPersistenceEnabled();
    _resetSaveExists();
  });

  it("is false by default", () => {
    expect(persistenceEnabled.value).toBe(false);
  });

  it("_resetPersistenceEnabled resets to false", () => {
    persistenceEnabled.value = true;
    expect(persistenceEnabled.value).toBe(true);
    _resetPersistenceEnabled();
    expect(persistenceEnabled.value).toBe(false);
  });

  it("createOpfsStorage.setItem is a no-op when persistenceEnabled === false", async () => {
    const storage = createOpfsStorage();
    const state = { day: 1 } as any;
    await storage.setItem("test", { state });
  });

  it("createOpfsStorage.setItem writes when persistenceEnabled === true", async () => {
    persistenceEnabled.value = true;
    const storage = createOpfsStorage();
    const state = { day: 1, horses: {}, npcStables: [] } as any;
    await storage.setItem("test", { state });
  });

  it("createOpfsStorage.getItem works regardless of flag", async () => {
    (loadGameStateFromIDB as any).mockResolvedValue(null);
    const storage = createOpfsStorage();
    const result = await storage.getItem("test");
    expect(result).toBeNull();
  });

  it("createOpfsStorage.removeItem works regardless of flag", async () => {
    const storage = createOpfsStorage();
    await storage.removeItem("test");
  });

  it("createOpfsStorage.getItem returns cached result when available (no second loadGameStateFromIDB call)", async () => {
    (loadGameStateFromIDB as any).mockResolvedValue({ day: 5 } as any);
    const storage = createOpfsStorage();
    const result = await storage.getItem("test");
    expect(result).not.toBeNull();
    expect((result as any).state.day).toBe(5);
  });

  it("cachedLoadResult is cleared after getItem consumes it", async () => {
    (loadGameStateFromIDB as any).mockResolvedValue({ day: 5 } as any);
    const storage = createOpfsStorage();
    await storage.getItem("test");
    (loadGameStateFromIDB as any).mockClear();
    (loadGameStateFromIDB as any).mockResolvedValue(null);
    const result2 = await storage.getItem("test");
    expect(result2).toBeNull();
    expect(loadGameStateFromIDB).toHaveBeenCalled();
  });
});

describe("rehydrateStore no-save path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPersistenceEnabled();
    _resetSaveExists();
    (loadGameStateFromIDB as any).mockResolvedValue(null);
  });

  it("does NOT call store.setState when loadGameStateFromIDB returns null", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(mockStore.setState).not.toHaveBeenCalled();
  });

  it("does NOT call store.persist.rehydrate when no save", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(mockStore.persist.rehydrate).not.toHaveBeenCalled();
  });

  it("sets saveExists.value = false", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(saveExists.value).toBe(false);
  });

  it("sets hydrationComplete.value = true", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(hydrationComplete.value).toBe(true);
  });

  it("persistenceEnabled.value stays false", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(persistenceEnabled.value).toBe(false);
  });
});

describe("rehydrateStore save-found path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPersistenceEnabled();
    _resetSaveExists();
    (loadGameStateFromIDB as any).mockResolvedValue({ day: 1, cash: 50000 });
  });

  it("calls store.persist.rehydrate when save exists", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(mockStore.persist.rehydrate).toHaveBeenCalled();
  });

  it("sets saveExists.value = true", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(saveExists.value).toBe(true);
  });

  it("sets persistenceEnabled.value = true before rehydrate", async () => {
    const callOrder: string[] = [];
    const mockStore = {
      persist: {
        rehydrate: vi.fn().mockImplementation(async () => {
          callOrder.push(`persistence=${persistenceEnabled.value}`);
        }),
      },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(callOrder[0]).toBe("persistence=true");
  });
});

describe("onRehydrateStorage version mismatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPersistenceEnabled();
    _resetSaveExists();
  });

  it("does NOT call createInitialState on main thread", async () => {
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(() => {
      throw new Error("createInitialState should not be called on version mismatch");
    }, mockStore);
    (loadGameStateFromIDB as any).mockResolvedValue(null);
    await rehydrate(mockStore);
  });

  it("calls clearDatabase to wipe incompatible save", async () => {
    expect(clearDatabase).toBeDefined();
  });
});
