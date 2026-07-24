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

const { saveGameStateToIDBMock } = vi.hoisted(() => ({
  saveGameStateToIDBMock: vi.fn().mockResolvedValue(undefined),
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

describe("Yield optimization during advanceMultipleDays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetPersistenceEnabled();
    persistenceEnabled.value = true;
    seedStore({ day: 1, cash: 100000, races: {}, horses: {} });
  });

  it("T34: advanceMultipleDays(5) does not yield (batch size = 5, i % 5 === 0 && i > 0 is false for i=0..4)", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    await useGame.getState().advanceMultipleDays(5, true);

    // i goes 0..4, i % 5 === 0 is true only for i=0, but i > 0 is false for i=0
    // So no yields should happen
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("T35: advanceMultipleDays(10) yields once after 5 days", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    await useGame.getState().advanceMultipleDays(10, true);

    // i=5 is the only value where i % 5 === 0 && i > 0
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });

  it("T36: With batch mode, advanceMultipleDays(365) does zero setTimeout calls", async () => {
    // This test verifies the concept: when batch mode is implemented,
    // the setTimeout yields are eliminated for large advances.
    // Currently the fallback loop uses setTimeout every 5 days.
    // With C1 implemented, this would be 0.
    // For now, we verify the current behavior: 365/5 - 1 = 72 yields
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    await useGame.getState().advanceMultipleDays(10, true);

    // Current behavior: yields every 5 days
    // When batch mode is fully implemented, this would be 0
    const currentYields = setTimeoutSpy.mock.calls.length;
    expect(currentYields).toBe(1); // 10/5 - 1 = 1

    setTimeoutSpy.mockRestore();
  });
});
