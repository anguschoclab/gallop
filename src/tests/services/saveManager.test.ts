import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";

const {
  mockSaveSlotState,
  mockLoadSlotState,
  mockDeleteSlotState,
  mockIsIndexedDbAvailable,
  mockSaveGameStateToIDB,
} = vi.hoisted(() => ({
  mockSaveSlotState: vi.fn(),
  mockLoadSlotState: vi.fn(),
  mockDeleteSlotState: vi.fn(),
  mockIsIndexedDbAvailable: vi.fn(),
  mockSaveGameStateToIDB: vi.fn(),
}));

vi.mock("@/services/storage/indexedDbService", () => ({
  saveSlotState: mockSaveSlotState,
  loadSlotState: mockLoadSlotState,
  deleteSlotState: mockDeleteSlotState,
  isIndexedDbAvailable: mockIsIndexedDbAvailable,
}));

vi.mock("@/game/store/storage", () => ({
  saveGameStateToIDB: mockSaveGameStateToIDB,
}));

import * as saveManager from "@/services/storage/saveManager";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("saveManager", () => {
  const mockGameState: GameState = {
    ...createDefaultGameState(),
    day: 42,
    cash: 100000,
    playerProfile: { stableName: "Test Stable" },
  } as GameState;

  const mockMetadata: saveManager.SaveSlotMetadata = {
    id: "slot1",
    name: "Test Save",
    timestamp: 1234567890,
    gameDay: 42,
    stableName: "Test Stable",
    cash: 100000,
    isAutoSave: false,
  };

  const localStoreMap = new Map<string, string>();
  const mockLocalStorageObj = {
    getItem: (key: string) => localStoreMap.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStoreMap.set(key, value);
    },
    removeItem: (key: string) => {
      localStoreMap.delete(key);
    },
    clear: () => {
      localStoreMap.clear();
    },
    length: 0,
    key: (index: number) => Array.from(localStoreMap.keys())[index] ?? null,
  };

  function setupMockLocalStorage() {
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorageObj,
      writable: true,
      configurable: true,
    });
  }

  beforeAll(() => {
    setupMockLocalStorage();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStoreMap.clear();
    mockIsIndexedDbAvailable.mockReturnValue(true);
    mockSaveSlotState.mockResolvedValue(undefined);
    mockLoadSlotState.mockResolvedValue(null);
    mockDeleteSlotState.mockResolvedValue(undefined);
    mockSaveGameStateToIDB.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setupMockLocalStorage();
    delete (globalThis as any).location;
  });

  describe("getSaveSlots", () => {
    it("returns empty array when localStorage empty", async () => {
      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([]);
    });

    it("returns metadata from localStorage", async () => {
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata]));

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([mockMetadata]);
    });

    it("handles localStorage parse error gracefully", async () => {
      localStorage.setItem("gallop_saves_metadata", "invalid json");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "safeParseJson: JSON.parse failed:",
        expect.any(Error),
      );
    });

    it("returns metadata array when localStorage has valid data", async () => {
      const meta2 = { ...mockMetadata, id: "slot2", name: "Second Save" };
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata, meta2]));

      const slots = await saveManager.getSaveSlots();

      expect(slots).toHaveLength(2);
      expect(slots).toEqual([mockMetadata, meta2]);
    });
  });

  describe("saveToSlot", () => {
    it("saves state to IDB via saveSlotState when IDB available", async () => {
      await saveManager.saveToSlot("slot1", "Test Save", mockGameState);

      expect(mockSaveSlotState).toHaveBeenCalledWith("slot1", mockGameState);
    });

    it("saves state to localStorage fallback when IDB unavailable", async () => {
      mockIsIndexedDbAvailable.mockReturnValue(false);

      await saveManager.saveToSlot("slot1", "Test Save", mockGameState);

      expect(mockSaveSlotState).not.toHaveBeenCalled();
      expect(localStorage.getItem("gallop_save_slot1")).toBe(JSON.stringify(mockGameState));
    });

    it("updates existing slot metadata", async () => {
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata]));

      await saveManager.saveToSlot("slot1", "Updated Name", mockGameState);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata[0].name).toBe("Updated Name");
      expect(metadata[0].timestamp).not.toBe(mockMetadata.timestamp);
    });

    it("creates new slot metadata when slot does not exist", async () => {
      await saveManager.saveToSlot("slot2", "New Save", mockGameState);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toHaveLength(1);
      expect(metadata[0].id).toBe("slot2");
    });

    it("marks autosave correctly in metadata", async () => {
      await saveManager.saveToSlot("autosave1", "Auto Save", mockGameState, true);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata[0].isAutoSave).toBe(true);
    });

    it("throws when saveSlotState rejects", async () => {
      mockSaveSlotState.mockRejectedValue(new Error("IDB write failed"));

      await expect(saveManager.saveToSlot("slot1", "Test Save", mockGameState)).rejects.toThrow(
        "IDB write failed",
      );
    });

    it("uses 'Unknown Stable' when playerProfile missing", async () => {
      const stateWithoutProfile = { ...mockGameState, playerProfile: undefined } as GameState;

      await saveManager.saveToSlot("slot1", "Test Save", stateWithoutProfile);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata[0].stableName).toBe("Unknown Stable");
    });
  });

  describe("loadFromSlot", () => {
    it("loads from IDB via loadSlotState, calls saveGameStateToIDB, then reloads", async () => {
      mockLoadSlotState.mockResolvedValue(mockGameState);
      const reloadSpy = vi.fn();
      Object.defineProperty(globalThis, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      await saveManager.loadFromSlot("slot1");

      expect(mockLoadSlotState).toHaveBeenCalledWith("slot1");
      expect(mockSaveGameStateToIDB).toHaveBeenCalledWith(mockGameState);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it("loads from localStorage fallback when IDB unavailable, calls saveGameStateToIDB, then reloads", async () => {
      mockIsIndexedDbAvailable.mockReturnValue(false);
      localStorage.setItem("gallop_save_slot1", JSON.stringify(mockGameState));
      const reloadSpy = vi.fn();
      Object.defineProperty(globalThis, "location", {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true,
      });

      await saveManager.loadFromSlot("slot1");

      expect(mockLoadSlotState).not.toHaveBeenCalled();
      expect(mockSaveGameStateToIDB).toHaveBeenCalledWith(mockGameState);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it("throws when slot not found in IDB (loadSlotState returns null)", async () => {
      mockLoadSlotState.mockResolvedValue(null);

      await expect(saveManager.loadFromSlot("nonexistent")).rejects.toThrow(
        "Save slot nonexistent not found or empty.",
      );
    });

    it("throws when slot not found in localStorage", async () => {
      mockIsIndexedDbAvailable.mockReturnValue(false);

      await expect(saveManager.loadFromSlot("nonexistent")).rejects.toThrow(
        "Save slot nonexistent not found or empty.",
      );
    });

    it("handles localStorage parse error", async () => {
      mockIsIndexedDbAvailable.mockReturnValue(false);
      localStorage.setItem("gallop_save_slot1", "invalid json");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(saveManager.loadFromSlot("slot1")).rejects.toThrow(
        "Save slot slot1 not found or empty.",
      );
    });
  });

  describe("deleteSaveSlot", () => {
    it("deletes from IDB via deleteSlotState when IDB available", async () => {
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata]));

      await saveManager.deleteSaveSlot("slot1");

      expect(mockDeleteSlotState).toHaveBeenCalledWith("slot1");
      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([]);
    });

    it("deletes from localStorage fallback when IDB unavailable", async () => {
      mockIsIndexedDbAvailable.mockReturnValue(false);
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata]));
      localStorage.setItem("gallop_save_slot1", JSON.stringify(mockGameState));

      await saveManager.deleteSaveSlot("slot1");

      expect(mockDeleteSlotState).not.toHaveBeenCalled();
      expect(localStorage.getItem("gallop_save_slot1")).toBeNull();
      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([]);
    });

    it("removes slot from metadata while preserving other slots", async () => {
      const otherMetadata: saveManager.SaveSlotMetadata = {
        ...mockMetadata,
        id: "slot2",
      };
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata, otherMetadata]));

      await saveManager.deleteSaveSlot("slot1");

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([otherMetadata]);
    });

    it("handles deleting non-existent slot gracefully", async () => {
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata]));

      await saveManager.deleteSaveSlot("nonexistent");

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([mockMetadata]);
    });
  });
});
