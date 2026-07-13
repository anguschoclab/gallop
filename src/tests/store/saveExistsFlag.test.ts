import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/storage/storageAdapter", () => ({
  loadGameState: vi.fn(),
  saveGameState: vi.fn(),
  clearGameState: vi.fn(),
  initializeStorage: vi.fn(),
  useLocalStorageFallback: false,
  _resetStorageAdapterState: vi.fn(),
}));

import { saveExists, _resetSaveExists, createRehydrateStore } from "@/game/store/storage";
import { loadGameState } from "@/services/storage/storageAdapter";

describe("saveExists flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSaveExists();
  });

  it("is false by default", () => {
    expect(saveExists.value).toBe(false);
  });

  it("rehydrateStore sets saveExists=true when loadGameState returns non-null", async () => {
    (loadGameState as any).mockResolvedValue({ day: 1, cash: 50000 });

    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };

    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);

    expect(saveExists.value).toBe(true);
  });

  it("rehydrateStore sets saveExists=false when loadGameState returns null", async () => {
    (loadGameState as any).mockResolvedValue(null);

    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };

    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);

    expect(saveExists.value).toBe(false);
  });

  it("_resetSaveExists resets to false for testing", async () => {
    (loadGameState as any).mockResolvedValue({ day: 1 });
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };

    const rehydrate = createRehydrateStore(() => ({}), mockStore);
    await rehydrate(mockStore);
    expect(saveExists.value).toBe(true);

    _resetSaveExists();
    expect(saveExists.value).toBe(false);
  });
});
