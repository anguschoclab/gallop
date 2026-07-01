import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/services/storage/saveManager", () => ({
  getSaveSlots: vi.fn().mockResolvedValue([]),
  deleteSaveSlot: vi.fn().mockResolvedValue(undefined),
  saveToSlot: vi.fn().mockResolvedValue(undefined),
  loadFromSlot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useSaveSlots } from "@/hooks/shared/useSaveSlots";
import { useGame } from "@/game/store";
import { getSaveSlots, deleteSaveSlot } from "@/services/storage/saveManager";
import { toast } from "sonner";

let mockState: any;

function setupStore(overrides: Record<string, unknown> = {}) {
  mockState = {
    day: 5,
    manualSave: vi.fn().mockResolvedValue(undefined),
    loadSlot: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  (useGame as any).mockImplementation((selector: any) => selector(mockState));
  (useGame as any).getState = vi.fn(() => mockState);
}

beforeEach(() => {
  vi.clearAllMocks();
  (getSaveSlots as any).mockResolvedValue([]);
  (deleteSaveSlot as any).mockResolvedValue(undefined);
  setupStore();
});

describe("useSaveSlots", () => {
  describe("handleManualSave error path", () => {
    it("calls console.error and toast.error when manualSave rejects", async () => {
      setupStore({ manualSave: vi.fn().mockRejectedValue(new Error("disk full")) });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useSaveSlots("save"));

      await act(async () => {
        await result.current.handleManualSave();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Ledger write failed:", expect.any(Error));
      expect(toast.error).toHaveBeenCalledWith("Failed to save game");
      expect(result.current.isSaving).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleLoad error path", () => {
    it("calls console.error and resets isLoading when loadSlot rejects", async () => {
      setupStore({ loadSlot: vi.fn().mockRejectedValue(new Error("slot corrupt")) });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      const { result } = renderHook(() => useSaveSlots("load"));

      await act(async () => {
        await result.current.handleLoad("slot1");
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Recall failed:", expect.any(Error));
      expect(result.current.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
      confirmSpy.mockRestore();
    });
  });

  describe("handleManualSave success path", () => {
    it("calls toast.success and resets isSaving on success", async () => {
      const { result } = renderHook(() => useSaveSlots("save"));

      await act(async () => {
        await result.current.handleManualSave();
      });

      expect(toast.success).toHaveBeenCalledWith("Game saved!");
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe("handleLoad success path", () => {
    it("calls loadSlot with the provided slotId", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const loadSlot = vi.fn().mockResolvedValue(undefined);
      setupStore({ loadSlot });

      const { result } = renderHook(() => useSaveSlots("load"));

      await act(async () => {
        await result.current.handleLoad("slot1");
      });

      expect(loadSlot).toHaveBeenCalledWith("slot1");

      confirmSpy.mockRestore();
    });
  });

  describe("handleLoad guard", () => {
    it("early-returns when window.confirm is false", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      const loadSlot = vi.fn().mockResolvedValue(undefined);
      setupStore({ loadSlot });

      const { result } = renderHook(() => useSaveSlots("load"));

      await act(async () => {
        await result.current.handleLoad("slot1");
      });

      expect(loadSlot).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);

      confirmSpy.mockRestore();
    });
  });

  describe("initial state", () => {
    it("returns correct defaults", () => {
      const { result } = renderHook(() => useSaveSlots("save"));

      expect(result.current.activeTab).toBe("save");
      expect(result.current.saves).toEqual([]);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("populates saves from getSaveSlots on mount, sorted by timestamp descending", async () => {
      const slots = [
        {
          id: "a",
          name: "A",
          timestamp: 100,
          gameDay: 1,
          stableName: "S",
          cash: 0,
          isAutoSave: false,
        },
        {
          id: "b",
          name: "B",
          timestamp: 300,
          gameDay: 2,
          stableName: "S",
          cash: 0,
          isAutoSave: false,
        },
        {
          id: "c",
          name: "C",
          timestamp: 200,
          gameDay: 3,
          stableName: "S",
          cash: 0,
          isAutoSave: false,
        },
      ];
      (getSaveSlots as any).mockResolvedValue(slots);

      const { result } = renderHook(() => useSaveSlots("load"));

      await waitFor(() => {
        expect(result.current.saves).toHaveLength(3);
      });

      expect(result.current.saves[0].id).toBe("b");
      expect(result.current.saves[1].id).toBe("c");
      expect(result.current.saves[2].id).toBe("a");
    });
  });

  describe("refreshSaves error path", () => {
    it("calls console.error when getSaveSlots rejects and leaves saves unchanged", async () => {
      (getSaveSlots as any).mockRejectedValue(new Error("storage offline"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useSaveSlots("save"));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to load save slots:",
          expect.any(Error),
        );
      });

      expect(result.current.saves).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleDelete error path", () => {
    it("calls console.error and toast.error when deleteSaveSlot rejects", async () => {
      (deleteSaveSlot as any).mockRejectedValue(new Error("permission denied"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      const { result } = renderHook(() => useSaveSlots("save"));

      await act(async () => {
        await result.current.handleDelete("slot1", { stopPropagation: vi.fn() } as any);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to delete save slot:",
        expect.any(Error),
      );
      expect(toast.error).toHaveBeenCalledWith("Failed to delete save");

      consoleErrorSpy.mockRestore();
      confirmSpy.mockRestore();
    });
  });

  describe("handleDelete guard", () => {
    it("early-returns when window.confirm is false", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      const { result } = renderHook(() => useSaveSlots("save"));

      await act(async () => {
        await result.current.handleDelete("slot1", { stopPropagation: vi.fn() } as any);
      });

      expect(deleteSaveSlot).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });
});
