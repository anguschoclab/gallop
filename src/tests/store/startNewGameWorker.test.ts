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
  let _persistenceEnabled = false;
  return {
    createIdbStorage: () => ({
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    }),
    hydrationComplete: { value: false },
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
    createRehydrateStore: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
    saveGameStateToIDB: vi.fn().mockResolvedValue(undefined),
    loadGameStateFromIDB: vi.fn().mockResolvedValue(null),
  };
});

const mockWorkerCreateInitialState = vi.fn();
vi.mock("@/workers/engine.worker", () => ({}));
vi.mock("@/workers/initialization.worker", () => ({}));

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({
    createInitialState: mockWorkerCreateInitialState,
  })),
  expose: vi.fn(),
}));

// Provide a global Worker so initInitializationWorker doesn't skip
(globalThis as any).Worker = class FakeWorker {
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
};

import { useGame, STORE_STATE_VERSION } from "@/game/store";
import {
  saveGameStateToIDB,
  saveExists,
  _resetSaveExists,
  persistenceEnabled,
  _resetPersistenceEnabled,
} from "@/game/store/storage";
import { clearDatabase } from "@/services/storage/indexedDbService";
import type { NewGameOptions } from "@/game/store/state";

const mockProfile = {
  stableName: "Test Stable",
  ownerName: "Test Owner",
  silk: { pattern: "solid", primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" },
  backstoryId: "wealthy_dilettante" as any,
  founded: 1,
};

const mockBackstory = {
  id: "wealthy_dilettante",
  name: "Wealthy Dilettante",
  description: "A wealthy owner with a passion for racing.",
  startingCash: 100000,
  reputationScore: 50,
  facilityUpgrades: {},
  horses: [{ tier: "elite" as const, count: 2 }],
};

const mockOptions: NewGameOptions = {
  profile: mockProfile as any,
  backstory: mockBackstory as any,
};

const mockWorkerState = {
  day: 1,
  cash: 100000,
  horses: {},
  races: {},
  npcStables: [],
  playerProfile: mockProfile,
  storeVersion: STORE_STATE_VERSION,
  usedHorseNames: ["Thunder", "Lightning"],
  usedJockeyNames: ["Jockey1"],
};

describe("startNewGame uses initialization worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSaveExists();
    _resetPersistenceEnabled();
    (saveGameStateToIDB as any).mockResolvedValue(undefined);
    (clearDatabase as any).mockResolvedValue(undefined);
    mockWorkerCreateInitialState.mockResolvedValue({ state: mockWorkerState });
    useGame.setState({ playerProfile: undefined } as any);
  });

  it("calls getInitializationWorker().createInitialState with options", async () => {
    await useGame.getState().startNewGame(mockOptions);

    expect(mockWorkerCreateInitialState).toHaveBeenCalled();
  });

  it("sets persistenceEnabled.value = true before saving", async () => {
    const callOrder: string[] = [];
    (saveGameStateToIDB as any).mockImplementation(async () => {
      callOrder.push(`persistence=${persistenceEnabled.value}`);
    });

    await useGame.getState().startNewGame(mockOptions);

    expect(callOrder[0]).toBe("persistence=true");
  });

  it("calls saveGameStateToIDB after worker returns state", async () => {
    await useGame.getState().startNewGame(mockOptions);

    expect(saveGameStateToIDB).toHaveBeenCalled();
  });

  it("sets saveExists.value = true after successful save", async () => {
    await useGame.getState().startNewGame(mockOptions);

    expect(saveExists.value).toBe(true);
  });

  it("does NOT set saveExists if save throws", async () => {
    (saveGameStateToIDB as any).mockRejectedValue(new Error("IDB write failed"));

    await expect(useGame.getState().startNewGame(mockOptions)).rejects.toThrow();

    expect(saveExists.value).toBe(false);
  });

  it("worker state includes playerProfile", async () => {
    await useGame.getState().startNewGame(mockOptions);

    const allCalls = (saveGameStateToIDB as any).mock.calls.map((c: any) => c[0]);
    const profileCall = allCalls.find((s: any) => s.playerProfile);
    expect(profileCall).toBeDefined();
    expect(profileCall.playerProfile.stableName).toBe("Test Stable");
  });

  it("worker state includes storeVersion", async () => {
    await useGame.getState().startNewGame(mockOptions);

    const allCalls = (saveGameStateToIDB as any).mock.calls.map((c: any) => c[0]);
    const versionedCall = allCalls.find((s: any) => s.storeVersion === STORE_STATE_VERSION);
    expect(versionedCall).toBeDefined();
  });
});
