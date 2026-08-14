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
  it("returns initial state with default filter/sort/minBeyer and lastUpdatedAt", () => {
    const runners = [makeRunner()];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));

    expect(result.current.filter).toBe("all");
    expect(result.current.sortBy).toBe("position");
    expect(result.current.minBeyer).toBe(0);
    expect(result.current.lastUpdatedAt).toBeGreaterThan(0);
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

describe("useLeaderboardState tie-breaking", () => {
  it("orders equal positions by finishTime, then barrier, then horseId", () => {
    const runners = [
      makeRunner({ horseId: "c", position: 1200, barrier: 5 }),
      makeRunner({ horseId: "a", position: 1200, barrier: 2 }),
      makeRunner({ horseId: "b", position: 1200, barrier: 2, finishTime: 95 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["b", "a", "c"]);
  });

  it("keeps the same order across ticks when positions are tied", () => {
    const runners = [
      makeRunner({ horseId: "z", position: 800, barrier: 3 }),
      makeRunner({ horseId: "y", position: 800, barrier: 1 }),
    ];
    const first = renderHook(({ tick }) => useLeaderboardState(runners, makeRace(), 0, {}, tick), {
      initialProps: { tick: 0 },
    });
    const before = first.result.current.sorted.map((r) => r.r.horseId);
    first.rerender({ tick: 1 });
    expect(first.result.current.sorted.map((r) => r.r.horseId)).toEqual(before);
    expect(before).toEqual(["y", "z"]);
  });

  it("falls back to position ordering when velocities tie", () => {
    const runners = [
      makeRunner({ horseId: "slowlead", position: 900, velocity: 15 }),
      makeRunner({ horseId: "back", position: 500, velocity: 15 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    act(() => result.current.setSortBy("velocity"));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["slowlead", "back"]);
  });
});

describe("useLeaderboardState tie-break chain isolation", () => {
  // ── Step 1: Position epsilon boundary ──

  it("treats positions exactly 0.01m apart as tied (falls through to horseId)", () => {
    const runners = [
      makeRunner({ horseId: "z", position: 100.0, barrier: 1, finishTime: null }),
      makeRunner({ horseId: "a", position: 100.01, barrier: 1, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["a", "z"]);
  });

  it("treats positions 0.011m apart as NOT tied (position decides)", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100.0, barrier: 1, finishTime: null }),
      makeRunner({ horseId: "b", position: 100.011, barrier: 1, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["b", "a"]);
  });

  it("identical positions fall through to barrier", () => {
    const runners = [
      makeRunner({ horseId: "x", position: 500, barrier: 5, finishTime: null }),
      makeRunner({ horseId: "y", position: 500, barrier: 2, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["y", "x"]);
  });

  // ── Step 2: Finish time tie-break ──

  it("lower finishTime wins when positions are tied", () => {
    const runners = [
      makeRunner({ horseId: "late", position: 1200, barrier: 1, finishTime: 95 }),
      makeRunner({ horseId: "early", position: 1200, barrier: 1, finishTime: 90 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["early", "late"]);
  });

  it("null finishTime sorts after a non-null finishTime", () => {
    const runners = [
      makeRunner({ horseId: "running", position: 1200, barrier: 1, finishTime: null }),
      makeRunner({ horseId: "done", position: 1200, barrier: 1, finishTime: 90 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["done", "running"]);
  });

  it("both null finishTime falls through to barrier", () => {
    const runners = [
      makeRunner({ horseId: "hi", position: 800, barrier: 3, finishTime: null }),
      makeRunner({ horseId: "lo", position: 800, barrier: 1, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["lo", "hi"]);
  });

  // ── Step 3: Barrier tie-break ──

  it("lower barrier wins when positions and finishTimes are tied", () => {
    const runners = [
      makeRunner({ horseId: "wide", position: 1200, barrier: 5, finishTime: 90 }),
      makeRunner({ horseId: "inside", position: 1200, barrier: 2, finishTime: 90 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["inside", "wide"]);
  });

  // ── Step 4: Horse ID tie-break ──

  it("lexicographically lower horseId wins when position, finishTime, and barrier all tie", () => {
    const runners = [
      makeRunner({ horseId: "z", position: 1200, barrier: 3, finishTime: 90 }),
      makeRunner({ horseId: "a", position: 1200, barrier: 3, finishTime: 90 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["a", "z"]);
  });

  // ── Step 5: Full chain ordering ──

  it("exercises every tie-break level in a single 4-runner field", () => {
    const runners = [
      // D: still running (finishTime null) → sorts last among tied
      makeRunner({ horseId: "d", position: 1200.005, barrier: 1, finishTime: null }),
      // C: finished but wide barrier
      makeRunner({ horseId: "c", position: 1200.005, barrier: 5, finishTime: 90 }),
      // B: finished, lower barrier than C
      makeRunner({ horseId: "b", position: 1200.005, barrier: 3, finishTime: 90 }),
      // A: finished, same barrier as B, lower horseId
      makeRunner({ horseId: "a", position: 1200.005, barrier: 3, finishTime: 90 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["a", "b", "c", "d"]);
  });

  // ── Step 6: positionRank under ties ──

  it("assigns sequential positionRank via tie-break when positions are tied", () => {
    const runners = [
      makeRunner({ horseId: "c", position: 1000, barrier: 9, finishTime: null }),
      makeRunner({ horseId: "a", position: 1000, barrier: 1, finishTime: null }),
      makeRunner({ horseId: "b", position: 1000, barrier: 5, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.positionRank.get("a")).toBe(1);
    expect(result.current.positionRank.get("b")).toBe(2);
    expect(result.current.positionRank.get("c")).toBe(3);
  });

  it("top5 filter uses tie-break-derived positionRank when positions are tied", () => {
    // 6 runners: 3 tied at position 1000 (barriers 1,2,3), 3 at lower positions
    const runners = [
      makeRunner({ horseId: "t1", position: 1000, barrier: 1, finishTime: null }),
      makeRunner({ horseId: "t2", position: 1000, barrier: 2, finishTime: null }),
      makeRunner({ horseId: "t3", position: 1000, barrier: 3, finishTime: null }),
      makeRunner({ horseId: "back1", position: 500, barrier: 4, finishTime: null }),
      makeRunner({ horseId: "back2", position: 400, barrier: 5, finishTime: null }),
      makeRunner({ horseId: "back3", position: 300, barrier: 6, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    act(() => result.current.setFilter("top5"));
    const ids = result.current.sorted.map((r) => r.r.horseId);
    expect(ids).toHaveLength(5);
    // The three tied runners get ranks 1-3, plus back1 (rank 4) — back2 is rank 5
    expect(ids.slice(0, 3)).toEqual(["t1", "t2", "t3"]);
  });

  // ── Step 7: Tie-break as fallback in other sort modes ──

  it("beyer sort with tied beyers falls back to byPosition", () => {
    const runners = [
      makeRunner({ horseId: "behind", position: 100, velocity: 15 }),
      makeRunner({ horseId: "ahead", position: 200, velocity: 15 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    act(() => result.current.setSortBy("beyer"));
    // Same velocity → same mocked beyer → falls back to position: 200 > 100
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["ahead", "behind"]);
  });

  it("velocity sort with tied velocity and tied position falls through to barrier", () => {
    const runners = [
      makeRunner({ horseId: "wide", position: 800, velocity: 15, barrier: 5 }),
      makeRunner({ horseId: "inside", position: 800, velocity: 15, barrier: 2 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    act(() => result.current.setSortBy("velocity"));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["inside", "wide"]);
  });

  // ── Step 8: Dead-heat scenario ──

  it("dead heat: same non-null finishTime and position → barrier decides", () => {
    const runners = [
      makeRunner({ horseId: "outer", position: 1600, barrier: 4, finishTime: 95.0 }),
      makeRunner({ horseId: "inner", position: 1600, barrier: 2, finishTime: 95.0 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["inner", "outer"]);
  });

  // ── Step 9: Pre-start scenario ──

  it("pre-start: all runners at position 0 with null finishTime → barrier order", () => {
    const runners = [
      makeRunner({ horseId: "h3", position: 0, barrier: 3, finishTime: null }),
      makeRunner({ horseId: "h1", position: 0, barrier: 1, finishTime: null }),
      makeRunner({ horseId: "h2", position: 0, barrier: 2, finishTime: null }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(["h1", "h2", "h3"]);
  });
});

describe("useLeaderboardState tie detection", () => {
  it("hasTies is false when all runners have distinct positions", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100 }),
      makeRunner({ horseId: "b", position: 200 }),
      makeRunner({ horseId: "c", position: 300 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.hasTies).toBe(false);
  });

  it("hasTies is true when two runners are within POS_EPSILON", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100.0 }),
      makeRunner({ horseId: "b", position: 100.005 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.hasTies).toBe(true);
  });

  it("tiedHorseIds contains all tied horse IDs but not untied ones", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100 }),
      makeRunner({ horseId: "b", position: 100.005 }),
      makeRunner({ horseId: "c", position: 200 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.tiedHorseIds.has("a")).toBe(true);
    expect(result.current.tiedHorseIds.has("b")).toBe(true);
    expect(result.current.tiedHorseIds.has("c")).toBe(false);
  });

  it("tiedHorseIds is empty when no ties exist", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100 }),
      makeRunner({ horseId: "b", position: 200 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.tiedHorseIds.size).toBe(0);
  });

  it("hasTies is true when all runners at position 0 (pre-start)", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 0 }),
      makeRunner({ horseId: "b", position: 0 }),
      makeRunner({ horseId: "c", position: 0 }),
    ];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.hasTies).toBe(true);
    expect(result.current.tiedHorseIds.size).toBe(3);
  });

  it("hasTies is false for a single runner", () => {
    const runners = [makeRunner({ horseId: "a", position: 100 })];
    const { result } = renderHook(() => useLeaderboardState(runners, makeRace(), 0, {}));
    expect(result.current.hasTies).toBe(false);
  });

  it("hasTies and tiedHorseIds update across ticks", () => {
    const runners = [
      makeRunner({ horseId: "a", position: 100 }),
      makeRunner({ horseId: "b", position: 200 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }) => useLeaderboardState(runners, makeRace(), 0, {}, tick),
      { initialProps: { tick: 0 } },
    );
    expect(result.current.hasTies).toBe(false);

    runners[1].position = 100.005;
    rerender({ tick: 1 });
    expect(result.current.hasTies).toBe(true);
    expect(result.current.tiedHorseIds.has("a")).toBe(true);
    expect(result.current.tiedHorseIds.has("b")).toBe(true);
  });
});
