import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/storage/storageAdapter", () => ({
  clearGameState: vi.fn(),
  saveGameState: vi.fn(),
  loadGameState: vi.fn(),
  initializeStorage: vi.fn(),
  useLocalStorageFallback: false,
  _resetStorageAdapterState: vi.fn(),
}));

vi.mock("@/workers/engine.worker", () => ({}));
vi.mock("@/workers/storage.worker", () => ({}));
vi.mock("@/workers/initialization.worker", () => ({}));

vi.mock("comlink", () => ({
  wrap: vi.fn(() => ({})),
  expose: vi.fn(),
}));

import { useGame, STORE_STATE_VERSION } from "@/game/store";
import { saveGameState, clearGameState } from "@/services/storage/storageAdapter";
import { saveExists, _resetSaveExists } from "@/game/store/storage";
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
    (saveGameState as any).mockResolvedValue(undefined);
    (clearGameState as any).mockResolvedValue(undefined);
    useGame.setState({ playerProfile: undefined } as any);
  });

  it("calls clearGameState before saveGameState", async () => {
    const callOrder: string[] = [];
    (clearGameState as any).mockImplementation(async () => {
      callOrder.push("clear");
    });
    (saveGameState as any).mockImplementation(async () => {
      callOrder.push("save");
    });

    await useGame.getState().startNewGame(mockOptions);

    // The persist middleware may also call saveGameState, but our direct call
    // must come after clearGameState. Check that clear comes before any save.
    expect(callOrder[0]).toBe("clear");
    expect(callOrder.filter((c) => c === "save").length).toBeGreaterThanOrEqual(1);
  });

  it("calls saveGameState with state including playerProfile", async () => {
    await useGame.getState().startNewGame(mockOptions);

    // The persist middleware may call saveGameState first with a partial state.
    // Our direct call should include playerProfile. Find the call that has it.
    const allCalls = (saveGameState as any).mock.calls.map((c: any) => c[0]);
    const profileCall = allCalls.find((s: any) => s.playerProfile);
    expect(profileCall).toBeDefined();
    expect(profileCall.playerProfile.stableName).toBe("Test Stable");
    expect(profileCall.playerProfile.ownerName).toBe("Test Owner");
  });

  it("calls saveGameState with state including storeVersion", async () => {
    await useGame.getState().startNewGame(mockOptions);

    const allCalls = (saveGameState as any).mock.calls.map((c: any) => c[0]);
    const versionedCall = allCalls.find((s: any) => s.storeVersion === STORE_STATE_VERSION);
    expect(versionedCall).toBeDefined();
  });

  it("does not resolve until saveGameState resolves", async () => {
    let saveResolved = false;
    (saveGameState as any).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      saveResolved = true;
    });

    await useGame.getState().startNewGame(mockOptions);

    expect(saveResolved).toBe(true);
  });

  it("throws if saveGameState throws (does not swallow)", async () => {
    (saveGameState as any).mockRejectedValue(new Error("OPFS write failed"));

    await expect(useGame.getState().startNewGame(mockOptions)).rejects.toThrow("OPFS write failed");
  });

  it("sets saveExists to true after successful save", async () => {
    expect(saveExists.value).toBe(false);

    await useGame.getState().startNewGame(mockOptions);

    expect(saveExists.value).toBe(true);
  });

  it("does not set saveExists to true if saveGameState throws", async () => {
    (saveGameState as any).mockRejectedValue(new Error("OPFS write failed"));

    await expect(useGame.getState().startNewGame(mockOptions)).rejects.toThrow();

    expect(saveExists.value).toBe(false);
  });
});
