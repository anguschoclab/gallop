import { describe, it, expect } from "vitest";
import {
  buildRankMap,
  updateSplitCrossings,
  recordFinish,
} from "@/hooks/race/useLiveRaceSimulation";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function makeRunner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Runner",
    position: 0,
    finishTime: null,
    velocity: 15,
    lane: 1,
    targetLane: 1,
    laneVelocity: 0,
    gate: 1,
    topSpeed: 16,
    accel: 1,
    staminaFactor: 1,
    noise: 0,
    affinityBonus: 0,
    runningStyle: "EP",
    draftingHorseId: null,
    silk: "",
    ownership: { type: "unowned" },
    weight: 55,
    horse: {} as any,
    ...overrides,
  } as Runner;
}

describe("buildRankMap", () => {
  it("assigns rank 0 to the leader (highest position)", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 100, finishTime: null }),
      makeRunner({ horseId: "h2", position: 50, finishTime: null }),
    ];
    const { rankMap } = buildRankMap(runners);
    expect(rankMap.get("h1")).toBe(0);
    expect(rankMap.get("h2")).toBe(1);
  });

  it("skips runners with a non-null finishTime", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 200, finishTime: 90.0 }),
      makeRunner({ horseId: "h2", position: 100, finishTime: null }),
    ];
    const { rankMap } = buildRankMap(runners);
    expect(rankMap.has("h1")).toBe(false);
    expect(rankMap.get("h2")).toBe(0);
  });

  it("returns correct aliveRank count for 3-horse field where 1 has finished", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 300, finishTime: 95.0 }),
      makeRunner({ horseId: "h2", position: 200, finishTime: null }),
      makeRunner({ horseId: "h3", position: 100, finishTime: null }),
    ];
    const { aliveRank } = buildRankMap(runners);
    expect(aliveRank).toBe(2);
  });

  it("returns empty map and aliveRank 0 for all-finished field", () => {
    const runners = [
      makeRunner({ horseId: "h1", position: 1600, finishTime: 90.0 }),
      makeRunner({ horseId: "h2", position: 1600, finishTime: 91.0 }),
    ];
    const { rankMap, aliveRank } = buildRankMap(runners);
    expect(rankMap.size).toBe(0);
    expect(aliveRank).toBe(0);
  });
});

describe("updateSplitCrossings", () => {
  const FIXED_DT = 0.05;
  const splitMarkers = [400, 800, 1200, 1600];

  it("records a crossing when runner passes the next marker", () => {
    const r = makeRunner({ position: 410, finishTime: null });
    const posBefore = 390;
    const crossings: number[] = [];
    const simTime = 20.0;
    updateSplitCrossings(r, posBefore, splitMarkers, simTime, FIXED_DT, crossings);
    expect(crossings).toHaveLength(1);
  });

  it("does NOT record a crossing when runner has not reached the marker", () => {
    const r = makeRunner({ position: 390, finishTime: null });
    const crossings: number[] = [];
    updateSplitCrossings(r, 380, splitMarkers, 20.0, FIXED_DT, crossings);
    expect(crossings).toHaveLength(0);
  });

  it("does NOT advance to next marker when current hasn't been crossed yet", () => {
    const r = makeRunner({ position: 750, finishTime: null });
    const crossings: number[] = [10.0]; // marker 0 (400m) already crossed
    updateSplitCrossings(r, 700, splitMarkers, 40.0, FIXED_DT, crossings);
    // 750 < 800 so still hasn't crossed marker 1
    expect(crossings).toHaveLength(1);
  });

  it("correctly interpolates crossing time between ticks", () => {
    // Crossing from 390 to 410 over FIXED_DT=0.05s, marker=400
    const r = makeRunner({ position: 410, finishTime: null });
    const posBefore = 390;
    const simTime = 20.0; // simTime is AFTER step
    const crossings: number[] = [];
    updateSplitCrossings(r, posBefore, splitMarkers, simTime, FIXED_DT, crossings);
    // frac = (400-390)/(410-390) = 0.5; tBefore = 20.0 - 0.05 = 19.95; expected = 19.95 + 0.5*0.05 = 19.975
    expect(crossings[0]).toBeCloseTo(19.975, 5);
  });

  it("does not record if runner already has all markers crossed", () => {
    const r = makeRunner({ position: 1650, finishTime: null });
    const crossings = [10, 30, 50, 70]; // all 4 markers already recorded
    updateSplitCrossings(r, 1600, splitMarkers, 90.0, FIXED_DT, crossings);
    expect(crossings).toHaveLength(4);
  });
});

describe("recordFinish", () => {
  it("appends entry with position 1 when finishOrder is empty", () => {
    const r = makeRunner({ horseId: "h1", finishTime: 90.5 });
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    recordFinish(r, finishOrder);
    expect(finishOrder).toHaveLength(1);
    expect(finishOrder[0]).toEqual({ horseId: "h1", position: 1, time: 90.5, gate: 1 });
  });

  it("does NOT append when finishTime is null", () => {
    const r = makeRunner({ horseId: "h1", finishTime: null });
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    recordFinish(r, finishOrder);
    expect(finishOrder).toHaveLength(0);
  });

  it("assigns sequential positions for multiple finishers", () => {
    const finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];
    recordFinish(makeRunner({ horseId: "h1", finishTime: 90.0 }), finishOrder);
    recordFinish(makeRunner({ horseId: "h2", finishTime: 90.3 }), finishOrder);
    recordFinish(makeRunner({ horseId: "h3", finishTime: 90.7 }), finishOrder);
    expect(finishOrder.map((f) => f.position)).toEqual([1, 2, 3]);
  });
});
