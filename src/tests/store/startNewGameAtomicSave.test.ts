import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/game/store/storage", () => {
  let _saveExistsValue = false;
  let _persistenceEnabledValue = false;
  return {
    createIdbStorage: () => ({
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    }),
    hydrationComplete: { value: false },
    saveExists: {
      get value() {
        return _saveExistsValue;
      },
      set value(v: boolean) {
        _saveExistsValue = v;
      },
    },
    persistenceEnabled: {
      get value() {
        return _persistenceEnabledValue;
      },
      set value(v: boolean) {
        _persistenceEnabledValue = v;
      },
    },
    createRehydrateStore: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
    saveGameStateToIDB: vi.fn().mockResolvedValue(undefined),
    loadGameStateFromIDB: vi.fn().mockResolvedValue(null),
    _resetSaveExists: () => {
      _saveExistsValue = false;
    },
    _resetPersistenceEnabled: () => {
      _persistenceEnabledValue = false;
    },
  };
});

vi.mock("@/workers/engine.worker", () => ({}));
vi.mock("@/workers/initialization.worker", () => ({}));

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({})),
  expose: vi.fn(),
}));

import { useGame, STORE_STATE_VERSION } from "@/game/store";
import { saveGameStateToIDB, saveExists, _resetSaveExists } from "@/game/store/storage";
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

describe("startNewGame atomic save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSaveExists();
    (saveGameStateToIDB as any).mockResolvedValue(undefined);
    (clearDatabase as any).mockResolvedValue(undefined);
    useGame.setState({ playerProfile: undefined } as any);
  });

  it("calls clearDatabase before saveGameStateToIDB", async () => {
    const callOrder: string[] = [];
    (clearDatabase as any).mockImplementation(async () => {
      callOrder.push("clear");
    });
    (saveGameStateToIDB as any).mockImplementation(async () => {
      callOrder.push("save");
    });

    await useGame.getState().startNewGame(mockOptions);

    expect(callOrder[0]).toBe("clear");
    expect(callOrder.filter((c) => c === "save").length).toBeGreaterThanOrEqual(1);
  });

  it("calls saveGameStateToIDB with state including playerProfile", async () => {
    await useGame.getState().startNewGame(mockOptions);

    const allCalls = (saveGameStateToIDB as any).mock.calls.map((c: any) => c[0]);
    const profileCall = allCalls.find((s: any) => s.playerProfile);
    expect(profileCall).toBeDefined();
    expect(profileCall.playerProfile.stableName).toBe("Test Stable");
    expect(profileCall.playerProfile.ownerName).toBe("Test Owner");
  });

  it("calls saveGameStateToIDB with state including storeVersion", async () => {
    await useGame.getState().startNewGame(mockOptions);

    const allCalls = (saveGameStateToIDB as any).mock.calls.map((c: any) => c[0]);
    const versionedCall = allCalls.find((s: any) => s.storeVersion === STORE_STATE_VERSION);
    expect(versionedCall).toBeDefined();
  });

  it("does not resolve until saveGameStateToIDB resolves", async () => {
    let saveResolved = false;
    (saveGameStateToIDB as any).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      saveResolved = true;
    });

    await useGame.getState().startNewGame(mockOptions);

    expect(saveResolved).toBe(true);
  });

  it("throws if saveGameStateToIDB throws (does not swallow)", async () => {
    (saveGameStateToIDB as any).mockRejectedValue(new Error("IDB write failed"));

    await expect(useGame.getState().startNewGame(mockOptions)).rejects.toThrow("IDB write failed");
  });

  it("sets saveExists to true after successful save", async () => {
    expect(saveExists.value).toBe(false);

    await useGame.getState().startNewGame(mockOptions);

    expect(saveExists.value).toBe(true);
  });

  it("does not set saveExists to true if saveGameStateToIDB throws", async () => {
    (saveGameStateToIDB as any).mockRejectedValue(new Error("IDB write failed"));

    await expect(useGame.getState().startNewGame(mockOptions)).rejects.toThrow();

    expect(saveExists.value).toBe(false);
  });
});
