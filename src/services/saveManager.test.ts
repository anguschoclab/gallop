import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as saveManager from "./saveManager";
import * as opfsService from "./opfsService";
import type { GameState } from "@/game/types";

describe("saveManager", () => {
  const mockGameState: GameState = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSaveSlots", () => {
    it("returns empty array when OPFS unavailable and localStorage empty", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([]);
    });

    it("returns metadata from localStorage when OPFS unavailable", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      localStorage.setItem("gallop_saves_metadata", JSON.stringify([mockMetadata]));

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([mockMetadata]);
    });

    it("handles localStorage parse error gracefully", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      localStorage.setItem("gallop_saves_metadata", "invalid json");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load save metadata from localStorage:",
        expect.any(Error),
      );
    });

    it("returns metadata from OPFS when available", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([mockMetadata]);

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([mockMetadata]);
      expect(opfsService.readFile).toHaveBeenCalledWith("savesMetadata.json");
    });

    it("handles OPFS read error gracefully", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockRejectedValue(new Error("OPFS error"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load save metadata from OPFS:",
        expect.any(Error),
      );
    });

    it("returns empty array when OPFS returns null", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue(null);

      const slots = await saveManager.getSaveSlots();

      expect(slots).toEqual([]);
    });
  });

  describe("saveToSlot", () => {
    it("saves to localStorage when OPFS unavailable", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);

      await saveManager.saveToSlot("slot1", "Test Save", mockGameState);

      expect(localStorage.getItem("gallop_save_slot1")).toBe(JSON.stringify(mockGameState));
      expect(localStorage.getItem("gallop_saves_metadata")).toBeTruthy();
    });

    it("saves to OPFS when available", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);
      const writeFileSpy = vi.spyOn(opfsService, "writeFile").mockResolvedValue();

      await saveManager.saveToSlot("slot1", "Test Save", mockGameState);

      expect(writeFileSpy).toHaveBeenCalledWith("save_slot1.json", mockGameState);
      expect(writeFileSpy).toHaveBeenCalledWith("savesMetadata.json", expect.any(Array));
    });

    it("updates existing slot metadata", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([mockMetadata]);

      await saveManager.saveToSlot("slot1", "Updated Name", mockGameState);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata[0].name).toBe("Updated Name");
      expect(metadata[0].timestamp).not.toBe(mockMetadata.timestamp);
    });

    it("creates new slot metadata when slot does not exist", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);

      await saveManager.saveToSlot("slot2", "New Save", mockGameState);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toHaveLength(1);
      expect(metadata[0].id).toBe("slot2");
    });

    it("marks autosave correctly in metadata", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);

      await saveManager.saveToSlot("autosave1", "Auto Save", mockGameState, true);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata[0].isAutoSave).toBe(true);
    });

    it("throws error when localStorage save fails", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      await expect(saveManager.saveToSlot("slot1", "Test Save", mockGameState)).rejects.toThrow(
        "Storage quota exceeded",
      );
      setItemSpy.mockRestore();
    });

    it("throws error when OPFS save fails", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);
      vi.spyOn(opfsService, "writeFile").mockRejectedValue(new Error("OPFS write failed"));

      await expect(saveManager.saveToSlot("slot1", "Test Save", mockGameState)).rejects.toThrow(
        "OPFS write failed",
      );
    });

    it("uses 'Unknown Stable' when playerProfile missing", async () => {
      const stateWithoutProfile = { ...mockGameState, playerProfile: undefined } as GameState;
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([]);

      await saveManager.saveToSlot("slot1", "Test Save", stateWithoutProfile);

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata[0].stableName).toBe("Unknown Stable");
    });
  });

  describe("loadFromSlot", () => {
    it("loads from localStorage and reloads page", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      localStorage.setItem("gallop_save_slot1", JSON.stringify(mockGameState));
      const reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => {});

      await saveManager.loadFromSlot("slot1");

      expect(localStorage.getItem("gallop_game_state_fallback")).toBe(
        JSON.stringify(mockGameState),
      );
      expect(reloadSpy).toHaveBeenCalled();
    });

    it("loads from OPFS and reloads page", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue(mockGameState);
      const writeFileSpy = vi.spyOn(opfsService, "writeFile").mockResolvedValue();
      const reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => {});

      await saveManager.loadFromSlot("slot1");

      expect(writeFileSpy).toHaveBeenCalledWith("gameState.json", mockGameState);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it("throws error when save slot not found in localStorage", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(saveManager.loadFromSlot("nonexistent")).rejects.toThrow(
        "Save slot nonexistent not found or empty.",
      );
    });

    it("throws error when save slot not found in OPFS", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue(null);

      await expect(saveManager.loadFromSlot("nonexistent")).rejects.toThrow(
        "Save slot nonexistent not found or empty.",
      );
    });

    it("handles localStorage parse error", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      localStorage.setItem("gallop_save_slot1", "invalid json");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(saveManager.loadFromSlot("slot1")).rejects.toThrow(
        "Save slot slot1 not found or empty.",
      );
    });
  });

  describe("deleteSaveSlot", () => {
    it("deletes from localStorage when OPFS unavailable", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([mockMetadata]);
      localStorage.setItem("gallop_save_slot1", JSON.stringify(mockGameState));

      await saveManager.deleteSaveSlot("slot1");

      expect(localStorage.getItem("gallop_save_slot1")).toBeNull();
      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([]);
    });

    it("deletes from OPFS when available", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(true);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([mockMetadata]);
      const deleteFileSpy = vi.spyOn(opfsService, "deleteFile").mockResolvedValue(true);
      const writeFileSpy = vi.spyOn(opfsService, "writeFile").mockResolvedValue();

      await saveManager.deleteSaveSlot("slot1");

      expect(deleteFileSpy).toHaveBeenCalledWith("save_slot1.json");
      expect(writeFileSpy).toHaveBeenCalledWith("savesMetadata.json", []);
    });

    it("removes slot from metadata while preserving other slots", async () => {
      const otherMetadata: saveManager.SaveSlotMetadata = {
        ...mockMetadata,
        id: "slot2",
      };
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([mockMetadata, otherMetadata]);

      await saveManager.deleteSaveSlot("slot1");

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([otherMetadata]);
    });

    it("handles deleting non-existent slot gracefully", async () => {
      vi.spyOn(opfsService, "checkOPFSAvailable").mockResolvedValue(false);
      vi.spyOn(opfsService, "readFile").mockResolvedValue([mockMetadata]);

      await saveManager.deleteSaveSlot("nonexistent");

      const metadata = JSON.parse(localStorage.getItem("gallop_saves_metadata")!);
      expect(metadata).toEqual([mockMetadata]);
    });
  });
});
