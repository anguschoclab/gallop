import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/services/storage/storageAdapter", () => ({
  loadWizardState: vi.fn(() => null),
  saveWizardState: vi.fn(),
  clearWizardState: vi.fn(),
}));

vi.mock("@/core/jockey/generator", () => ({
  generateSilk: vi.fn(() => ({ pattern: "solid", primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" })),
}));

vi.mock("@/data/jockeys", () => ({
  SILK_PATTERNS: ["solid"],
}));

vi.mock("@/core/stable/stableGeneration", () => ({
  randomStableName: vi.fn(() => "Test Stable"),
  randomOwnerName: vi.fn(() => "Test Owner"),
}));

vi.mock("@/core/common/backstories", () => ({
  BACKSTORIES: [
    {
      id: "wealthy_dilettante",
      name: "Wealthy Dilettante",
      description: "A wealthy owner.",
      startingCash: 100000,
      reputationScore: 50,
      facilityUpgrades: {},
      horses: h2r([{ tier: "elite", count: 2 }]),
    },
  ],
}));

vi.mock("@/components/NewGameWizard/steps/helpers", () => ({
  makeWizardRng: vi.fn(() => ({ next: () => 0.5 })),
}));

import { useNewGameWizard } from "@/hooks/shared/useNewGameWizard";
import { useGame } from "@/game/store";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function setupStore(startNewGameImpl: any) {
  (useGame as any).mockImplementation((selector: any) =>
    selector({
      startNewGame: startNewGameImpl,
    }),
  );
}

describe("useNewGameWizard error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockResolvedValue(undefined);
  });

  it("resets submitting to false if startNewGame throws", async () => {
    const startNewGame = vi.fn().mockRejectedValue(new Error("OPFS write failed"));
    setupStore(startNewGame);

    const { result } = renderHook(() => useNewGameWizard());

    // Select a backstory so handleStart doesn't return early
    act(() => {
      result.current.setBackstoryId("wealthy_dilettante" as any);
    });

    expect(result.current.submitting).toBe(false);

    await result.current.handleStart();

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });
  });

  it("does not navigate if startNewGame throws", async () => {
    const startNewGame = vi.fn().mockRejectedValue(new Error("OPFS write failed"));
    setupStore(startNewGame);

    const { result } = renderHook(() => useNewGameWizard());

    act(() => {
      result.current.setBackstoryId("wealthy_dilettante" as any);
    });

    await result.current.handleStart();

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("navigates to / when startNewGame succeeds", async () => {
    const startNewGame = vi.fn().mockResolvedValue(undefined);
    setupStore(startNewGame);

    const { result } = renderHook(() => useNewGameWizard());

    act(() => {
      result.current.setBackstoryId("wealthy_dilettante" as any);
    });

    await result.current.handleStart();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/", replace: true });
    });
  });
});
