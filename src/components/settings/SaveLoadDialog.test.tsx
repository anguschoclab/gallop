import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SaveLoadDialog } from "./SaveLoadDialog";
import { useGame } from "@/game/store";
import { toast } from "sonner";
import * as saveManager from "@/services/saveManager";

// Mock dependencies
vi.mock("@/game/store", () => ({
  useGame: Object.assign(
    vi.fn(),
    { getState: vi.fn(() => ({ day: 1 })) }
  )
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/saveManager", () => ({
  getSaveSlots: vi.fn(),
  deleteSaveSlot: vi.fn(),
}));

describe("SaveLoadDialog Error Handling", () => {
  const mockManualSave = vi.fn();
  const mockLoadSlot = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the useGame hook implementations
    vi.mocked(useGame).mockImplementation((selector: any) => {
      // Mock the specific state selections
      const state = {
        manualSave: mockManualSave,
        loadSlot: mockLoadSlot,
      };
      return selector(state);
    });

    vi.mocked(saveManager.getSaveSlots).mockResolvedValue([]);
  });

  it("should show success toast when game saves successfully", async () => {
    mockManualSave.mockResolvedValueOnce(undefined);

    render(
      <SaveLoadDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        initialTab="save"
      />
    );

    // Wait for the dialog to be fully rendered
    await waitFor(() => {
      expect(screen.getByText("Snapshot Current")).toBeInTheDocument();
    });

    // Click the "Create Snapshot" button
    const saveButton = screen.getByText("Create Snapshot");
    fireEvent.click(saveButton);

    // Verify manualSave was called
    await waitFor(() => {
      expect(mockManualSave).toHaveBeenCalled();
    });

    // Verify success toast was shown
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Game saved!");
    });
  });

  it("should show error toast and log to console when game save fails", async () => {
    const error = new Error("Failed to save due to storage limit");
    mockManualSave.mockRejectedValueOnce(error);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SaveLoadDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        initialTab="save"
      />
    );

    // Wait for the dialog to be fully rendered
    await waitFor(() => {
      expect(screen.getByText("Snapshot Current")).toBeInTheDocument();
    });

    // Click the "Create Snapshot" button
    const saveButton = screen.getByText("Create Snapshot");
    fireEvent.click(saveButton);

    // Verify manualSave was called
    await waitFor(() => {
      expect(mockManualSave).toHaveBeenCalled();
    });

    // Verify error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save game");
    });

    // Verify error was logged to console
    expect(consoleErrorSpy).toHaveBeenCalledWith("Ledger write failed:", error);

    consoleErrorSpy.mockRestore();
  });
});
