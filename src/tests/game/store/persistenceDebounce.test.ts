import { describe, it, expect, vi, beforeEach } from "vitest";

const { saveGameStateToIDBMock, savedStates } = vi.hoisted(() => ({
  saveGameStateToIDBMock: vi.fn().mockResolvedValue(undefined),
  savedStates: [] as any[],
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
  let _armed = false;
  let _lastWrittenRevision = -1;
  let _cachedLoadResult: any = undefined;
  let _writeChain: Promise<void> = Promise.resolve();
  const loadGameStateFromIDB = vi.fn();

  const saveCoordinator = {
    get isArmed() {
      return _armed;
    },
    get lastWrittenRevision() {
      return _lastWrittenRevision;
    },
    arm() {
      _armed = true;
    },
    disarm() {
      _armed = false;
      _lastWrittenRevision = -1;
    },
    enqueue(state: any) {
      if (!_armed) return;
      const rev = state.engineRevision ?? 0;
      if (rev < _lastWrittenRevision) return;
      _lastWrittenRevision = rev;
      _writeChain = _writeChain.then(() => {
        savedStates.push(state);
        return saveGameStateToIDBMock(state);
      });
    },
    async flush() {
      await _writeChain;
    },
  };

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
        saveCoordinator.enqueue(value.state);
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
    saveCoordinator,
    _resetSaveExists: () => {
      _saveExists = false;
    },
    _resetSaveCoordinator: () => {
      _armed = false;
      _lastWrittenRevision = -1;
      _writeChain = Promise.resolve();
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
          saveCoordinator.arm();
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

import { saveCoordinator, _resetSaveCoordinator } from "@/game/store/storage";
import { useGame } from "@/game/store";
import { seedStore } from "@/test-utils/renderWithStore";
import { makePlayerOwned } from "@/core/horse/ownership";

describe("Save coordinator during advanceMultipleDays", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    savedStates.length = 0;
    _resetSaveCoordinator();
    saveCoordinator.arm();
    seedStore({
      day: 1,
      cash: 100000,
      races: {},
      horses: {},
      engineRevision: 0,
      engineGeneration: 1,
    } as never);
    // Drain the seed write, then clear — assertions observe only post-seed writes.
    await saveCoordinator.flush();
    savedStates.length = 0;
    saveGameStateToIDBMock.mockClear();
  });

  it("batch advance persists only committed checkpoints, never intermediate days", async () => {
    await useGame.getState().advanceMultipleDays(5, true);
    await saveCoordinator.flush();

    expect(saveGameStateToIDBMock).toHaveBeenCalled();
    // Writes are either the pre-advance state (day 1) or the committed final
    // state (day 6) — never a mid-range checkpoint (days 2–5).
    for (const s of savedStates) {
      expect([1, 6]).toContain(s.day);
    }
    expect(savedStates.at(-1).day).toBe(6);
  });

  it("interrupted advance persists only the committed checkpoint", async () => {
    seedStore({
      day: 1,
      cash: 100000,
      engineRevision: 0,
      engineGeneration: 1,
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
          entries: [{ horseId: "horse-1", ownership: makePlayerOwned(), npc: false }],
          resolved: false,
        } as never,
      },
      horses: {
        "horse-1": {
          id: "horse-1",
          name: "Test",
          ownership: makePlayerOwned(),
          age: 3,
          stats: { speed: 50, acceleration: 50, stamina: 50, temperament: 50 },
          form: 0,
          energy: 100,
          distanceAptitude: 1600,
          surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
          raceHistory: [],
        } as never,
      },
    } as never);
    // Drain the re-seed write so only the interrupted advance is observed.
    await saveCoordinator.flush();
    savedStates.length = 0;
    saveGameStateToIDBMock.mockClear();

    await useGame.getState().advanceMultipleDays(5, false);
    await saveCoordinator.flush();

    // Interrupted at race on day 3 → committed checkpoint is day 2.
    expect(useGame.getState().day).toBe(2);
    expect(useGame.getState().execution?.interruptRaceId).toBe("race-1");
    for (const s of savedStates) {
      expect(s.day).toBeLessThanOrEqual(2);
    }
    expect(Math.max(...savedStates.map((s) => s.day))).toBe(2);
  });

  it("coordinator stays armed after batch completes", async () => {
    await useGame.getState().advanceMultipleDays(3, true);
    expect(saveCoordinator.isArmed).toBe(true);
  });

  it("disarmed coordinator drops writes", async () => {
    saveCoordinator.disarm();
    await useGame.getState().advanceMultipleDays(3, true);
    await saveCoordinator.flush();
    expect(saveGameStateToIDBMock).not.toHaveBeenCalled();
  });
});
