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

const { saveGameStateToIDBMock, savedStates } = vi.hoisted(() => ({
  saveGameStateToIDBMock: vi.fn().mockResolvedValue(undefined),
  savedStates: [] as any[],
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

/**
 * Production-path batch tests: advanceMultipleDays submits ONE engine
 * command; the store commits exactly once; intermediate days never hit
 * persist middleware.
 */
describe("Atomic batch advance through the store", () => {
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
    // Drain the seed write so assertions observe only post-seed writes.
    await saveCoordinator.flush();
    savedStates.length = 0;
    saveGameStateToIDBMock.mockClear();
  });

  it("advanceMultipleDays(10) commits once with the final day", async () => {
    const days: number[] = [];
    const unsub = useGame.subscribe((s, prev) => {
      if (s.day !== prev.day) days.push(s.day);
    });

    await useGame.getState().advanceMultipleDays(10, true);
    unsub();

    expect(useGame.getState().day).toBe(11);
    // Exactly one day transition — the batch is a single atomic commit.
    expect(days).toEqual([11]);
  });

  it("intermediate days are never persisted — only the committed checkpoint", async () => {
    await useGame.getState().advanceMultipleDays(10, true);
    await saveCoordinator.flush();

    // Persisted snapshots are the pre-advance state (day 1) or the committed
    // final state (day 11) — never an intermediate day write.
    expect(saveGameStateToIDBMock).toHaveBeenCalled();
    const persistedDays = savedStates.map((s) => s.day);
    for (const d of persistedDays) expect([1, 11]).toContain(d);
    expect(persistedDays.at(-1)).toBe(11);
  });

  it("advanceMultipleDays reports progress via engine events", async () => {
    const progress: [number, number][] = [];
    await useGame.getState().advanceMultipleDays(5, true, (d, t) => progress.push([d, t]));
    expect(progress.length).toBe(5);
    expect(progress.at(-1)).toEqual([5, 5]);
  });
});
