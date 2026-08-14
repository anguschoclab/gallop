import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeaderboardState } from "@/hooks/race/useLeaderboardState";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/core/race/types";

vi.mock("@/components/race/raceVisualHelpers", () => ({
  projectedBeyer: (
    runner: { velocity: number },
    _dist: number,
    _t: number,
    _bonus: number,
    _pars: Record<number, number>,
  ) => Math.round(runner.velocity * 5),
}));

const race = { id: "r1", distance: 1600 } as Race;

function runner(horseId: string, position: number, overrides: Partial<Runner> = {}): Runner {
  return {
    horseId,
    name: horseId,
    position,
    velocity: 16,
    finishTime: null,
    owned: false,
    lane: 1,
    barrier: 1,
    ...overrides,
  } as Runner;
}

describe("useLeaderboardState live updates", () => {
  it("re-derives the order when runners mutate in place and the tick advances", () => {
    const runners = [runner("a", 100), runner("b", 50)];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    expect(result.current.positionRank.get("a")).toBe(1);

    // Physics loop mutates the same objects: b overtakes a.
    runners[0].position = 200;
    runners[1].position = 400;
    rerender({ tick: 1 });

    expect(result.current.positionRank.get("b")).toBe(1);
    expect(result.current.sorted[0].r.horseId).toBe("b");
  });

  it("updates lastUpdatedAt when the tick advances", () => {
    const runners = [runner("a", 100)];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const before = result.current.lastUpdatedAt;
    rerender({ tick: 1 });
    expect(result.current.lastUpdatedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("useLeaderboardState tie-stability across consecutive ticks", () => {
  it("keeps tied runners in the same order across 6 consecutive ticks (position sort)", () => {
    const runners = [
      runner("c", 800, { barrier: 3 }),
      runner("a", 800, { barrier: 1 }),
      runner("b", 800, { barrier: 2 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const expected = ["a", "b", "c"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    expect(result.current.positionRank.get("a")).toBe(1);
    expect(result.current.positionRank.get("b")).toBe(2);
    expect(result.current.positionRank.get("c")).toBe(3);

    for (let t = 1; t <= 5; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("a")).toBe(1);
      expect(result.current.positionRank.get("b")).toBe(2);
      expect(result.current.positionRank.get("c")).toBe(3);
    }
  });

  it("keeps tied beyer runners in the same order across ticks (beyer sort)", () => {
    const runners = [
      runner("a", 300, { velocity: 16 }),
      runner("b", 500, { velocity: 16 }),
      runner("c", 700, { velocity: 16 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    act(() => result.current.setSortBy("beyer"));

    // Equal velocity → equal mocked beyer (80) → falls back to byPosition
    const expected = ["c", "b", "a"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);

    for (let t = 1; t <= 3; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    }
  });

  it("keeps tied velocity runners in the same order across ticks (velocity sort)", () => {
    const runners = [
      runner("a", 300, { velocity: 16 }),
      runner("b", 500, { velocity: 16 }),
      runner("c", 700, { velocity: 16 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    act(() => result.current.setSortBy("velocity"));

    // Equal velocity → falls back to byPosition
    const expected = ["c", "b", "a"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);

    for (let t = 1; t <= 3; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    }
  });

  it("keeps a large field with multiple tie clusters stable across ticks", () => {
    const runners = [
      // Cluster A (position 1000): barriers 2/1/3 → internal order e, d, f
      runner("d", 1000, { barrier: 2 }),
      runner("e", 1000, { barrier: 1 }),
      runner("f", 1000, { barrier: 3 }),
      // Untied: j at 750
      runner("j", 750, { barrier: 1 }),
      // Cluster B (position 500): barriers 3/1/2 → internal order h, i, g
      runner("g", 500, { barrier: 3 }),
      runner("h", 500, { barrier: 1 }),
      runner("i", 500, { barrier: 2 }),
      // Untied: k at 200
      runner("k", 200, { barrier: 1 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const expected = ["e", "d", "f", "j", "h", "i", "g", "k"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);

    // Verify cluster-internal order independently
    const clusterA = result.current.sorted
      .filter((r) => ["d", "e", "f"].includes(r.r.horseId))
      .map((r) => r.r.horseId);
    expect(clusterA).toEqual(["e", "d", "f"]);

    const clusterB = result.current.sorted
      .filter((r) => ["g", "h", "i"].includes(r.r.horseId))
      .map((r) => r.r.horseId);
    expect(clusterB).toEqual(["h", "i", "g"]);

    for (let t = 1; t <= 3; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    }
  });

  it("keeps pre-start runners (all position 0) in stable order across ticks", () => {
    const runners = [
      runner("d", 0, { barrier: 4 }),
      runner("b", 0, { barrier: 2 }),
      runner("a", 0, { barrier: 1 }),
      runner("c", 0, { barrier: 3 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const expected = ["a", "b", "c", "d"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);

    for (let t = 1; t <= 2; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    }
  });

  it("treats positions within POS_EPSILON as ties and positions outside as distinct", () => {
    const runners = [
      // a and b within epsilon (0.005 < 0.01) → tied, broken by barrier
      runner("a", 800.0, { barrier: 2 }),
      runner("b", 800.005, { barrier: 1 }),
      // c outside epsilon (0.02 > 0.01) → NOT tied, sorts ahead by position
      runner("c", 800.02, { barrier: 1 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    // a and b are tied (within epsilon) → barrier breaks: b(1) < a(2)
    // c is 0.02 ahead → not tied → sorts first by position
    const expected = ["c", "b", "a"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);

    for (let t = 1; t <= 3; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    }
  });
});
