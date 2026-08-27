import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/core/race/headToHead", () => ({
  runHeadToHeadSimulation: vi.fn(() => [
    {
      horseId: "h1",
      winPct: 0.58,
      avgFinishPosition: 1.4,
      avgFinishTime: 96,
      beyerRange: [80, 90],
      finishTimeRange: [93, 99],
    },
    {
      horseId: "h2",
      winPct: 0.42,
      avgFinishPosition: 1.6,
      avgFinishTime: 97,
      beyerRange: [73, 83],
      finishTimeRange: [94, 100],
    },
  ]),
}));

import { useHeadToHeadSim } from "@/hooks/horse/useHeadToHeadSim";
import { runHeadToHeadSimulation } from "@/core/race/headToHead";
import { SIM_ITERATIONS } from "@/constants/uiConstants";
import type { Horse } from "@/game/types";
import { makePlayerOwned } from "@/core/horse/ownership";

const mkHorse = (id: string): Horse =>
  ({
    id,
    name: id,
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    form: 50,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      durability: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    ownership: makePlayerOwned(),
  }) as unknown as Horse;

describe("useHeadToHeadSim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initial state: simResults is null, simRunning is false", () => {
    const { result } = renderHook(() => useHeadToHeadSim());
    expect(result.current.simResults).toBeNull();
    expect(result.current.simRunning).toBe(false);
  });

  it("runSim sets simRunning to true immediately", () => {
    const { result } = renderHook(() => useHeadToHeadSim());
    act(() => {
      result.current.runSim([mkHorse("h1"), mkHorse("h2")], 1600, "Turf");
    });
    expect(result.current.simRunning).toBe(true);
  });

  it("runSim eventually sets simResults and resets simRunning", async () => {
    const { result } = renderHook(() => useHeadToHeadSim());
    act(() => {
      result.current.runSim([mkHorse("h1"), mkHorse("h2")], 1600, "Turf");
    });
    await waitFor(() => {
      expect(result.current.simRunning).toBe(false);
    });
    expect(result.current.simResults).not.toBeNull();
    expect(result.current.simResults).toHaveLength(2);
    expect(runHeadToHeadSimulation).toHaveBeenCalledWith(
      expect.any(Array),
      1600,
      "Turf",
      SIM_ITERATIONS,
    );
  });

  it("clearSim resets simResults to null", async () => {
    const { result } = renderHook(() => useHeadToHeadSim());
    act(() => {
      result.current.runSim([mkHorse("h1"), mkHorse("h2")], 1600, "Turf");
    });
    await waitFor(() => {
      expect(result.current.simResults).not.toBeNull();
    });
    act(() => {
      result.current.clearSim();
    });
    expect(result.current.simResults).toBeNull();
  });
});
