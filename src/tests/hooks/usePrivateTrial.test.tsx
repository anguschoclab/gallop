import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Horse } from "@/game/types";

vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/core/horse/trialFeedback", () => ({
  generateRiderFeedback: vi.fn(() => "mock feedback"),
}));

import { usePrivateTrial } from "@/hooks/race/usePrivateTrial";
import { useGame } from "@/game/store";
import { generateRiderFeedback } from "@/core/horse/trialFeedback";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

function makeHorse(overrides: any = {}): Horse {
  return {
    id: "h1",
    name: "Thunder",
    owned: true,
    energy: 50,
    ...overrides,
  } as unknown as Horse;
}

const mockTrialResult = {
  snapshots: [
    {
      t: 1.0,
      horses: h2r([
        { horseId: "h1", velocity: 10 },
        { horseId: "h2", velocity: 9 },
      ] as unknown as Horse[])),
    },
    {
      t: 2.0,
      horses: h2r([
        { horseId: "h1", velocity: 12 },
        { horseId: "h2", velocity: 11 },
      ] as unknown as Horse[])),
    },
  ],
  result: [
    { horseId: "h1", position: 1, time: 60.5 },
    { horseId: "h2", position: 2, time: 62.0 },
  ],
};

describe("usePrivateTrial", () => {
  let runPrivateTrialMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    runPrivateTrialMock = vi.fn();
    (useGame as any).mockImplementation((selector: any) =>
      selector({ runPrivateTrial: runPrivateTrialMock }),
    );
  });

  describe("initial state", () => {
    it("starts with correct defaults", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      expect(result.current.isOpen).toBe(false);
      expect(result.current.distance).toBe(1200);
      expect(result.current.surface).toBe("Turf");
      expect(result.current.opponentId).toBe("pacemaker");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.trialResult).toBeNull();
    });
  });

  describe("handleStartTrial error paths", () => {
    it("sets error to e.message when runPrivateTrial throws", async () => {
      runPrivateTrialMock.mockImplementation(() => {
        throw new Error("boom");
      });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.error).toBe("boom");
      expect(result.current.loading).toBe(false);
    });

    it("falls back to 'An unexpected error occurred.' when error has empty message", async () => {
      runPrivateTrialMock.mockImplementation(() => {
        throw new Error("");
      });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.error).toBe("An unexpected error occurred.");
      expect(result.current.loading).toBe(false);
    });

    it("falls back to 'An unexpected error occurred.' when non-Error is thrown", async () => {
      runPrivateTrialMock.mockImplementation(() => {
        throw {};
      });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.error).toBe("An unexpected error occurred.");
      expect(result.current.loading).toBe(false);
    });

    it("sets error to reason when runPrivateTrial returns ok:false with reason", async () => {
      runPrivateTrialMock.mockReturnValue({
        ok: false,
        reason: "Not enough cash.",
      });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.error).toBe("Not enough cash.");
    });

    it("falls back to 'Failed to start trial.' when ok:false with no reason", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: false });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.error).toBe("Failed to start trial.");
    });

    it("sets trialResult and keeps error null on success", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.trialResult).toEqual(mockTrialResult);
      expect(result.current.error).toBeNull();
    });

    it("resets loading to false after successful trial", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.loading).toBe(false);
    });
  });

  describe("handleReset", () => {
    it("clears error after error state", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: false, reason: "err" });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.error).toBe("err");
      act(() => {
        result.current.handleReset();
      });
      expect(result.current.error).toBeNull();
    });

    it("clears trialResult after successful trial", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.trialResult).not.toBeNull();
      act(() => {
        result.current.handleReset();
      });
      expect(result.current.trialResult).toBeNull();
    });

    it("clears both error and trialResult simultaneously", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      act(() => {
        result.current.handleReset();
      });
      expect(result.current.error).toBeNull();
      expect(result.current.trialResult).toBeNull();
    });
  });

  describe("handleOpenChange", () => {
    it("resets error and trialResult when closing", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      act(() => {
        result.current.setIsOpen(false);
      });
      expect(result.current.isOpen).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.trialResult).toBeNull();
    });

    it("sets isOpen to true without resetting", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      act(() => {
        result.current.setIsOpen(true);
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe("eligibleOpponents", () => {
    it("filters out non-owned horses", () => {
      const horses = [
        makeHorse({ id: "h2", owned: false, energy: 50 }),
        makeHorse({ id: "h3", owned: true, energy: 50 }),
      ];
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), horses, 10000));
      expect(result.current.eligibleOpponents).toHaveLength(1);
      expect(result.current.eligibleOpponents[0].id).toBe("h3");
    });

    it("filters out horses with energy < 15", () => {
      const horses = [
        makeHorse({ id: "h2", owned: true, energy: 14 }),
        makeHorse({ id: "h3", owned: true, energy: 15 }),
      ];
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), horses, 10000));
      expect(result.current.eligibleOpponents).toHaveLength(1);
      expect(result.current.eligibleOpponents[0].id).toBe("h3");
    });

    it("filters out the trial horse itself", () => {
      const horses = [
        makeHorse({ id: "h1", owned: true, energy: 50 }),
        makeHorse({ id: "h2", owned: true, energy: 50 }),
      ];
      const { result } = renderHook(() => usePrivateTrial(makeHorse({ id: "h1" }), horses, 10000));
      expect(result.current.eligibleOpponents).toHaveLength(1);
      expect(result.current.eligibleOpponents[0].id).toBe("h2");
    });

    it("includes owned horses with energy >= 15 that are not the trial horse", () => {
      const horses = [
        makeHorse({ id: "h2", owned: true, energy: 15 }),
        makeHorse({ id: "h3", owned: true, energy: 100 }),
        makeHorse({ id: "h4", owned: false, energy: 100 }),
        makeHorse({ id: "h5", owned: true, energy: 10 }),
      ];
      const { result } = renderHook(() => usePrivateTrial(makeHorse({ id: "h1" }), horses, 10000));
      expect(result.current.eligibleOpponents).toHaveLength(2);
      expect(result.current.eligibleOpponents.map((h) => h.id)).toEqual(["h2", "h3"]);
    });
  });

  describe("opponentName", () => {
    it("returns Pacemaker when opponentId is pacemaker", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      expect(result.current.opponentId).toBe("pacemaker");
      expect(result.current.opponentName).toBe("Pacemaker");
    });

    it("returns opponent horse name when matched", () => {
      const horses = [makeHorse({ id: "h2", name: "Lightning", owned: true, energy: 50 })];
      const { result } = renderHook(() => usePrivateTrial(makeHorse({ id: "h1" }), horses, 10000));
      act(() => {
        result.current.setOpponentId("h2");
      });
      expect(result.current.opponentName).toBe("Lightning");
    });

    it("returns Opponent when opponentId does not match any eligible opponent", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      act(() => {
        result.current.setOpponentId("nonexistent");
      });
      expect(result.current.opponentName).toBe("Opponent");
    });
  });

  describe("chartData", () => {
    it("returns empty array when no trialResult", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      expect(result.current.chartData).toEqual([]);
    });

    it("maps snapshots with velocity * 3.6 conversion and t rounding", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() =>
        usePrivateTrial(makeHorse({ id: "h1", name: "Thunder" }), [], 10000),
      );
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.chartData).toEqual([
        { t: 1, Thunder: 36, Pacemaker: 32.4 },
        { t: 2, Thunder: 43.2, Pacemaker: 39.6 },
      ]);
    });

    it("uses horse.name for player and opponentName for opponent", async () => {
      const horses = [makeHorse({ id: "h2", name: "Lightning", owned: true, energy: 50 })];
      runPrivateTrialMock.mockReturnValue({
        ok: true,
        result: {
          snapshots: [
            {
              t: 1.0,
              horses: h2r([
                { horseId: "h1", velocity: 10 },
                { horseId: "h2", velocity: 9 },
              ] as unknown as Horse[])),
            },
          ],
          result: [
            { horseId: "h1", position: 1, time: 60 },
            { horseId: "h2", position: 2, time: 62 },
          ],
        },
      });
      const { result } = renderHook(() =>
        usePrivateTrial(makeHorse({ id: "h1", name: "Thunder" }), horses, 10000),
      );
      act(() => {
        result.current.setOpponentId("h2");
      });
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.chartData[0]).toHaveProperty("Thunder");
      expect(result.current.chartData[0]).toHaveProperty("Lightning");
    });
  });

  describe("runnerStats", () => {
    it("returns empty array when no trialResult", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      expect(result.current.runnerStats).toEqual([]);
    });

    it("maps result entries with name, isPlayer, position, time", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() =>
        usePrivateTrial(makeHorse({ id: "h1", name: "Thunder" }), [], 10000),
      );
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.runnerStats).toEqual([
        { name: "Thunder", isPlayer: true, position: 1, time: 60.5 },
        { name: "Pacemaker", isPlayer: false, position: 2, time: 62.0 },
      ]);
    });

    it("sorts by position ascending", async () => {
      runPrivateTrialMock.mockReturnValue({
        ok: true,
        result: {
          snapshots: [],
          result: [
            { horseId: "h2", position: 2, time: 62 },
            { horseId: "h1", position: 1, time: 60 },
          ],
        },
      });
      const { result } = renderHook(() =>
        usePrivateTrial(makeHorse({ id: "h1", name: "Thunder" }), [], 10000),
      );
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(result.current.runnerStats[0].position).toBe(1);
      expect(result.current.runnerStats[1].position).toBe(2);
    });
  });

  describe("feedback", () => {
    it("returns empty string when no trialResult", () => {
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      expect(result.current.feedback).toBe("");
    });

    it("returns generateRiderFeedback output when trialResult exists", async () => {
      runPrivateTrialMock.mockReturnValue({ ok: true, result: mockTrialResult });
      const { result } = renderHook(() => usePrivateTrial(makeHorse(), [], 10000));
      await act(async () => {
        await result.current.handleStartTrial();
      });
      expect(generateRiderFeedback).toHaveBeenCalled();
      expect(result.current.feedback).toBe("mock feedback");
    });
  });
});
