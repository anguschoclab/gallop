/**
 * useLeaderboardState.test.ts
 *
 * Tests for the leaderboard state hook extracted from useRaceUIState.
 * Covers: filter (all/owned/top5), sort (position/beyer/velocity),
 * minBeyer threshold, positionRank computation, allFinished/anyFinished.
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Runner } from "@/core/race/engine/runnerBuilder";

// Import after mocks — the module doesn't exist yet, so this will fail (RED).
import { useLeaderboardState } from "@/hooks/race/useLeaderboardState";

// Mock projectedBeyer so tests are deterministic
vi.mock("@/components/race/raceVisualHelpers", () => ({
  projectedBeyer: (
    runner: { velocity: number },
    _dist: number,
    _t: number,
    _bonus: number,
    _pars: Record<number, number>,
  ) => Math.round(runner.velocity * 5),
}));

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Horse",
    silk: "#ff0000",
    owned: false,
    position: 0,
    velocity: 15,
    finishTime: null,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    barrier: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

function makeRace(distance = 1600) {
  return { distance } as any;
}

describe("useLeaderboardState", () => {
  it("returns initial state with default filter/sort/minBeyer", () => {
    const runners = [makeRunner()];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.filter).toBe("all");
    expect(result.current.sortBy).toBe("position");
    expect(result.current.minBeyer).toBe(0);
  });

  it("computes positionRank from runner positions", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100 }),
      makeRunner({ horseId: "b", position: 200 }),
      makeRunner({ horseId: "c", position: 50 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.positionRank.get("b")).toBe(1);
    expect(result.current.positionRank.get("a")).toBe(2);
    expect(result.current.positionRank.get("c")).toBe(3);
  });

  it("sorts by position (default)", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100 }),
      makeRunner({ horseId: "b", position: 200 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.sorted[0].r.horseId).toBe("b");
    expect(result.current.sorted[1].r.horseId).toBe("a");
  });

  it("sorts by beyer when sortBy is set to beyer", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 200, velocity: 10 }),
      makeRunner({ horseId: "b", position: 100, velocity: 18 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    act(() => {
      result.current.setSortBy("beyer");
    });

    // projectedBeyer = velocity * 5, so b=90 > a=50
    expect(result.current.sorted[0].r.horseId).toBe("b");
    expect(result.current.sorted[1].r.horseId).toBe("a");
  });

  it("sorts by velocity when sortBy is set to velocity", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 200, velocity: 10 }),
      makeRunner({ horseId: "b", position: 100, velocity: 20 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    act(() => {
      result.current.setSortBy("velocity");
    });

    expect(result.current.sorted[0].r.horseId).toBe("b");
    expect(result.current.sorted[1].r.horseId).toBe("a");
  });

  it("filters to owned runners when filter is 'owned'", () => {
    const runners = [
      makeRunner({ horseId: "a", owned: true }),
      makeRunner({ horseId: "b", owned: false }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    act(() => {
      result.current.setFilter("owned");
    });

    expect(result.current.sorted).toHaveLength(1);
    expect(result.current.sorted[0].r.horseId).toBe("a");
  });

  it("filters to top 5 when filter is 'top5'", () => {
    const runners = Array.from({ length: 8 }, (_, i) =>
      makeRunner({ horseId: `h${i}`, position: 100 - i * 10 }),
    );
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    act(() => {
      result.current.setFilter("top5");
    });

    expect(result.current.sorted).toHaveLength(5);
  });

  it("filters by minBeyer threshold", () => {
    const runners = [
      makeRunner({ horseId: "a", velocity: 10 }), // beyer = 50
      makeRunner({ horseId: "b", velocity: 20 }), // beyer = 100
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    act(() => {
      result.current.setMinBeyer(60);
    });

    expect(result.current.sorted).toHaveLength(1);
    expect(result.current.sorted[0].r.horseId).toBe("b");
  });

  it("reports allFinished when all runners have finishTime", () => {
    const runners = [
      makeRunner({ horseId: "a", finishTime: 10.5 }),
      makeRunner({ horseId: "b", finishTime: 11.2 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.allFinished).toBe(true);
    expect(result.current.anyFinished).toBe(true);
  });

  it("reports anyFinished when at least one runner has finishTime", () => {
    const runners = [
      makeRunner({ horseId: "a", finishTime: 10.5 }),
      makeRunner({ horseId: "b", finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.allFinished).toBe(false);
    expect(result.current.anyFinished).toBe(true);
  });

  it("reports neither finished when no runners have finishTime", () => {
    const runners = [
      makeRunner({ horseId: "a", finishTime: null }),
      makeRunner({ horseId: "b", finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.allFinished).toBe(false);
    expect(result.current.anyFinished).toBe(false);
  });

  it("includes beyer values in sorted rows", () => {
    const runners = [makeRunner({ horseId: "a", velocity: 15 })];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.sorted[0].beyer).toBe(75); // 15 * 5
  });
});
