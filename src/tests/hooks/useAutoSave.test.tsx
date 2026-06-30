import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/services/storage/saveManager", () => ({
  saveToSlot: vi.fn(),
}));

import { useAutoSave } from "@/hooks/game/useAutoSave";
import { useGame } from "@/game/store";
import { saveToSlot } from "@/services/storage/saveManager";

let mockState: any;

function setupStore(overrides: Record<string, unknown> = {}) {
  mockState = {
    day: 1,
    cash: 50000,
    playerProfile: { stableName: "Test" },
    ...overrides,
  };
  (useGame as any).mockImplementation((selector: any) => selector(mockState));
  (useGame as any).getState = vi.fn(() => mockState);
}

beforeEach(() => {
  vi.clearAllMocks();
  (saveToSlot as any).mockResolvedValue(undefined);
  setupStore();
});

describe("useAutoSave", () => {
  describe("auto-save error path", () => {
    it("calls console.error with auto-save prefix when saveToSlot rejects", async () => {
      (saveToSlot as any).mockRejectedValue(new Error("OPFS write failed"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { rerender } = renderHook(() => useAutoSave());

      setupStore({ day: 7 });
      rerender();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[Auto-Save] Failed to save game:",
          expect.any(Error),
        );
      });

      expect(saveToSlot).toHaveBeenCalledWith("autosave", "Auto-Save", mockState, true);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("auto-save success path", () => {
    it("calls saveToSlot and does not call console.error on success", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { rerender } = renderHook(() => useAutoSave());

      setupStore({ day: 7 });
      rerender();

      await waitFor(() => {
        expect(saveToSlot).toHaveBeenCalledTimes(1);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("guard conditions", () => {
    it("does not trigger on day 1", async () => {
      const { rerender } = renderHook(() => useAutoSave());

      setupStore({ day: 1 });
      rerender();

      await waitFor(() => {
        expect(saveToSlot).not.toHaveBeenCalled();
      });
    });

    it("does not trigger on non-multiple-of-7 day", async () => {
      const { rerender } = renderHook(() => useAutoSave());

      setupStore({ day: 5 });
      rerender();

      await waitFor(() => {
        expect(saveToSlot).not.toHaveBeenCalled();
      });
    });

    it("does not trigger when day is unchanged", async () => {
      setupStore({ day: 7 });
      const { rerender } = renderHook(() => useAutoSave());

      setupStore({ day: 7 });
      rerender();

      await waitFor(() => {
        expect(saveToSlot).not.toHaveBeenCalled();
      });
    });
  });
});
