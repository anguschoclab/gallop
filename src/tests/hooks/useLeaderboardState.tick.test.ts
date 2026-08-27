import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeaderboardState } from "@/hooks/race/useLeaderboardState";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/core/race/types";
import { DEFAULT_GATE } from "@/constants/gateConstants";
import { makeUnowned } from "@/core/horse/ownership";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Mock multiplier: projectedBeyer = velocity × this value. */
const BEYER_MOCK_MULTIPLIER = 5;
/** Race distance in metres used across all tests. */
const RACE_DISTANCE = 1600;
/** Default velocity (m/s) for the runner helper. */
const DEFAULT_VELOCITY = 16;
/** Default lane for the runner helper. */
const DEFAULT_LANE = 1;

/** POS_EPSILON from useLeaderboardState — positions within this gap (metres) are ties. */
const POS_EPSILON = 0.01;

// ─── Tick counts ────────────────────────────────────────────────────────────

/** Number of consecutive ticks to verify in the multi-tick position-sort test. */
const MULTI_TICK_COUNT = 5;
/** Number of consecutive ticks to verify in sort-mode and epsilon tests. */
const SORT_MODE_TICK_COUNT = 3;
/** Number of consecutive ticks to verify in the pre-start test. */
const PRE_START_TICK_COUNT = 2;

// ─── Positions (metres) ─────────────────────────────────────────────────────

/** Tied position used in multi-tick and epsilon boundary tests. */
const TIED_POSITION = 800;
/** Position for the front runner in beyer/velocity tie tests. */
const SORT_TIE_POSITION_FRONT = 700;
/** Position for the middle runner in beyer/velocity tie tests. */
const SORT_TIE_POSITION_MID = 500;
/** Position for the back runner in beyer/velocity tie tests. */
const SORT_TIE_POSITION_BACK = 300;

// ─── Large field positions ──────────────────────────────────────────────────

/** Position for all runners in cluster A of the large-field test. */
const CLUSTER_A_POSITION = 1000;
/** Position for all runners in cluster B of the large-field test. */
const CLUSTER_B_POSITION = 500;
/** Untied runner between the two clusters. */
const UNTIED_MID_POSITION = 750;
/** Untied runner behind both clusters. */
const UNTIED_LOW_POSITION = 200;

// ─── Epsilon boundary positions ─────────────────────────────────────────────

/** Base position for the epsilon boundary test. */
const EPSILON_BASE = 800.0;
/** Offset within POS_EPSILON — should be treated as a tie. */
const EPSILON_WITHIN = 0.005;
/** Offset outside POS_EPSILON — should NOT be treated as a tie. */
const EPSILON_OUTSIDE = 0.02;

// ─── Existing test positions ────────────────────────────────────────────────

const LIVE_UPDATE_POS_A = 100;
const LIVE_UPDATE_POS_B = 50;
const LIVE_UPDATE_OVERTAKE_A = 200;
const LIVE_UPDATE_OVERTAKE_B = 400;

// ─── Mock ───────────────────────────────────────────────────────────────────

vi.mock("@/components/race/raceVisualHelpers", () => ({
  projectedBeyer: (
    runner: { velocity: number },
    _dist: number,
    _t: number,
    _bonus: number,
    _pars: Record<number, number>,
  ) => Math.round(runner.velocity * BEYER_MOCK_MULTIPLIER),
}));

const race = { id: "r1", distance: RACE_DISTANCE } as Race;

function runner(horseId: string, position: number, overrides: Partial<Runner> = {}): Runner {
  return {
    horseId,
    name: horseId,
    position,
    velocity: DEFAULT_VELOCITY,
    finishTime: null,
    ownership: makeUnowned(),
    lane: DEFAULT_LANE,
    gate: DEFAULT_GATE,
    ...overrides,
  } as Runner;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("useLeaderboardState live updates", () => {
  it("re-derives the order when runners mutate in place and the tick advances", () => {
    const runners = [runner("a", LIVE_UPDATE_POS_A), runner("b", LIVE_UPDATE_POS_B)];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    expect(result.current.positionRank.get("a")).toBe(1);

    // Physics loop mutates the same objects: b overtakes a.
    runners[0].position = LIVE_UPDATE_OVERTAKE_A;
    runners[1].position = LIVE_UPDATE_OVERTAKE_B;
    rerender({ tick: 1 });

    expect(result.current.positionRank.get("b")).toBe(1);
    expect(result.current.sorted[0].r.horseId).toBe("b");
  });

  it("updates lastUpdatedAt when the tick advances", () => {
    const runners = [runner("a", LIVE_UPDATE_POS_A)];
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
      runner("c", TIED_POSITION, { gate: 3 }),
      runner("a", TIED_POSITION, { gate: 1 }),
      runner("b", TIED_POSITION, { gate: 2 }),
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

    for (let t = 1; t <= MULTI_TICK_COUNT; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("a")).toBe(1);
      expect(result.current.positionRank.get("b")).toBe(2);
      expect(result.current.positionRank.get("c")).toBe(3);
    }
  });

  it("keeps tied beyer runners in the same order across ticks (beyer sort)", () => {
    const runners = [
      runner("a", SORT_TIE_POSITION_BACK, { velocity: DEFAULT_VELOCITY }),
      runner("b", SORT_TIE_POSITION_MID, { velocity: DEFAULT_VELOCITY }),
      runner("c", SORT_TIE_POSITION_FRONT, { velocity: DEFAULT_VELOCITY }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    act(() => result.current.setSortBy("beyer"));

    // Equal velocity → equal mocked beyer → falls back to byPosition
    const expected = ["c", "b", "a"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    expect(result.current.positionRank.get("c")).toBe(1);
    expect(result.current.positionRank.get("b")).toBe(2);
    expect(result.current.positionRank.get("a")).toBe(3);

    for (let t = 1; t <= SORT_MODE_TICK_COUNT; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("c")).toBe(1);
      expect(result.current.positionRank.get("b")).toBe(2);
      expect(result.current.positionRank.get("a")).toBe(3);
    }
  });

  it("keeps tied velocity runners in the same order across ticks (velocity sort)", () => {
    const runners = [
      runner("a", SORT_TIE_POSITION_BACK, { velocity: DEFAULT_VELOCITY }),
      runner("b", SORT_TIE_POSITION_MID, { velocity: DEFAULT_VELOCITY }),
      runner("c", SORT_TIE_POSITION_FRONT, { velocity: DEFAULT_VELOCITY }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    act(() => result.current.setSortBy("velocity"));

    // Equal velocity → falls back to byPosition
    const expected = ["c", "b", "a"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    expect(result.current.positionRank.get("c")).toBe(1);
    expect(result.current.positionRank.get("b")).toBe(2);
    expect(result.current.positionRank.get("a")).toBe(3);

    for (let t = 1; t <= SORT_MODE_TICK_COUNT; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("c")).toBe(1);
      expect(result.current.positionRank.get("b")).toBe(2);
      expect(result.current.positionRank.get("a")).toBe(3);
    }
  });

  it("keeps a large field with multiple tie clusters stable across ticks", () => {
    const runners = [
      // Cluster A (position 1000): gates 2/1/3 → internal order e, d, f
      runner("d", CLUSTER_A_POSITION, { gate: 2 }),
      runner("e", CLUSTER_A_POSITION, { gate: 1 }),
      runner("f", CLUSTER_A_POSITION, { gate: 3 }),
      // Untied: j at 750
      runner("j", UNTIED_MID_POSITION, { gate: 1 }),
      // Cluster B (position 500): gates 3/1/2 → internal order h, i, g
      runner("g", CLUSTER_B_POSITION, { gate: 3 }),
      runner("h", CLUSTER_B_POSITION, { gate: 1 }),
      runner("i", CLUSTER_B_POSITION, { gate: 2 }),
      // Untied: k at 200
      runner("k", UNTIED_LOW_POSITION, { gate: 1 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const expected = ["e", "d", "f", "j", "h", "i", "g", "k"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);

    // Verify positionRank stability
    expect(result.current.positionRank.get("e")).toBe(1);
    expect(result.current.positionRank.get("d")).toBe(2);
    expect(result.current.positionRank.get("f")).toBe(3);
    expect(result.current.positionRank.get("j")).toBe(4);
    expect(result.current.positionRank.get("h")).toBe(5);
    expect(result.current.positionRank.get("i")).toBe(6);
    expect(result.current.positionRank.get("g")).toBe(7);
    expect(result.current.positionRank.get("k")).toBe(8);

    // Verify cluster-internal order independently
    const clusterA = result.current.sorted
      .filter((r) => ["d", "e", "f"].includes(r.r.horseId))
      .map((r) => r.r.horseId);
    expect(clusterA).toEqual(["e", "d", "f"]);

    const clusterB = result.current.sorted
      .filter((r) => ["g", "h", "i"].includes(r.r.horseId))
      .map((r) => r.r.horseId);
    expect(clusterB).toEqual(["h", "i", "g"]);

    for (let t = 1; t <= SORT_MODE_TICK_COUNT; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("e")).toBe(1);
      expect(result.current.positionRank.get("d")).toBe(2);
      expect(result.current.positionRank.get("f")).toBe(3);
      expect(result.current.positionRank.get("j")).toBe(4);
      expect(result.current.positionRank.get("h")).toBe(5);
      expect(result.current.positionRank.get("i")).toBe(6);
      expect(result.current.positionRank.get("g")).toBe(7);
      expect(result.current.positionRank.get("k")).toBe(8);
    }
  });

  it("keeps pre-start runners (all position 0) in stable order across ticks", () => {
    const runners = [
      runner("d", 0, { gate: 4 }),
      runner("b", 0, { gate: 2 }),
      runner("a", 0, { gate: 1 }),
      runner("c", 0, { gate: 3 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    const expected = ["a", "b", "c", "d"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    expect(result.current.positionRank.get("a")).toBe(1);
    expect(result.current.positionRank.get("b")).toBe(2);
    expect(result.current.positionRank.get("c")).toBe(3);
    expect(result.current.positionRank.get("d")).toBe(4);

    for (let t = 1; t <= PRE_START_TICK_COUNT; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("a")).toBe(1);
      expect(result.current.positionRank.get("b")).toBe(2);
      expect(result.current.positionRank.get("c")).toBe(3);
      expect(result.current.positionRank.get("d")).toBe(4);
    }
  });

  it("treats positions within POS_EPSILON as ties and positions outside as distinct", () => {
    const runners = [
      // a and b within epsilon → tied, broken by gate
      runner("a", EPSILON_BASE, { gate: 2 }),
      runner("b", EPSILON_BASE + EPSILON_WITHIN, { gate: 1 }),
      // c outside epsilon → NOT tied, sorts ahead by position
      runner("c", EPSILON_BASE + EPSILON_OUTSIDE, { gate: 1 }),
    ];
    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => useLeaderboardState(runners, race, 0, {}, tick),
      { initialProps: { tick: 0 } },
    );

    // a and b are tied (within epsilon) → gate breaks: b(1) < a(2)
    // c is beyond epsilon → not tied → sorts first by position
    const expected = ["c", "b", "a"];
    expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
    expect(result.current.positionRank.get("c")).toBe(1);
    expect(result.current.positionRank.get("b")).toBe(2);
    expect(result.current.positionRank.get("a")).toBe(3);

    for (let t = 1; t <= SORT_MODE_TICK_COUNT; t++) {
      rerender({ tick: t });
      expect(result.current.sorted.map((r) => r.r.horseId)).toEqual(expected);
      expect(result.current.positionRank.get("c")).toBe(1);
      expect(result.current.positionRank.get("b")).toBe(2);
      expect(result.current.positionRank.get("a")).toBe(3);
    }
  });
});
