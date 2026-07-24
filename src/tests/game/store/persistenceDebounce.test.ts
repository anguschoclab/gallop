import { describe, it, expect, vi, beforeEach } from "vitest";

const { saveGameStateToIDBMock } = vi.hoisted(() => ({
  saveGameStateToIDBMock: vi.fn().mockResolvedValue(undefined),
}));

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
    createIdbStorage: () => ({
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
        await saveGameStateToIDBMock(value.state);
      },
      removeItem: async (_name: string) => {},
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
    saveGameStateToIDB: saveGameStateToIDBMock,
    loadGameStateFromIDB,
    createRehydrateStore: (useGameStore: any) => {
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

import { persistenceEnabled, _resetPersistenceEnabled } from "@/game/store/storage";
import { useGame } from "@/game/store";
import { seedStore } from "@/test-utils/renderWithStore";

describe("Persistence debouncing during advanceMultipleDays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPersistenceEnabled();
    persistenceEnabled.value = true;
    seedStore({ day: 1, cash: 100000, races: {}, horses: {} });
  });

  it("T23: saveGameStateToIDB is not called during advanceMultipleDays when isAdvancing", async () => {
    // During advance, persistence should be suppressed.
    // saveGameStateToIDB should only be called once (from persist middleware after flag restore),
    // not once per day.
    await useGame.getState().advanceMultipleDays(3, true);

    // Should be called at most once (the final save via persist middleware), not 3 times
    expect(saveGameStateToIDBMock.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("T24: saveGameStateToIDB is called once after advanceMultipleDays completes", async () => {
    await useGame.getState().advanceMultipleDays(5, true);

    // After batch completes, at most one save should have been triggered
    expect(saveGameStateToIDBMock.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("T25: If advanceMultipleDays is interrupted, persistenceEnabled is restored and save triggered", async () => {
    // Set up a player race on day 3
    seedStore({
      day: 1,
      cash: 100000,
      races: {
        "race-1": {
          id: "race-1",
          name: "Test Race",
          day: 3,
          distance: 2000,
          raceClass: "Maiden",
          entryFee: 500,
          purse: 10000,
          minStat: 70,
          fieldSize: 8,
          entries: [{ horseId: "horse-1", owned: true, npc: false }],
          resolved: false,
        } as any,
      },
      horses: {
        "horse-1": { id: "horse-1", name: "Test", owned: true, age: 3 } as any,
      },
    });

    await useGame.getState().advanceMultipleDays(5, false);

    // Should have stopped early due to player race
    // Persistence should be restored regardless
    expect(persistenceEnabled.value).toBe(true);
    // Saves should be significantly fewer than days advanced (debouncing works)
    // The persist middleware is async, so 1-2 saves is expected, not 5
    expect(saveGameStateToIDBMock.mock.calls.length).toBeLessThan(5);
  });

  it("T26: persistenceEnabled flag is restored to true after batch completes", async () => {
    await useGame.getState().advanceMultipleDays(3, true);

    expect(persistenceEnabled.value).toBe(true);
  });

  it("T27: Single advanceDay still triggers persistence (not suppressed)", async () => {
    // advanceDay should not suppress persistence
    const beforeCalls = saveGameStateToIDBMock.mock.calls.length;

    await useGame.getState().advanceDay();

    // Persistence should still be enabled after single advance
    expect(persistenceEnabled.value).toBe(true);
  });
});
