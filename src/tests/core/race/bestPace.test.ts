/**
 * bestPace.test.ts - Tests for bestPerMileByHorse
 *
 * Written BEFORE the M1 iterateRaceRuns extraction (Phase 0.5). Locks down the
 * per-mile pace computation so the extraction can be verified against it.
 */

import { describe, it, expect } from "vitest";
import { bestPerMileByHorse } from "@/core/race/bestPace";
import type { Race } from "@/core/race/types";

function mkRace(
  overrides: Omit<Partial<Race>, "result"> & {
    result: { horseId: string; time: number; position?: number }[];
  },
): Race {
  const { result, ...rest } = overrides;
  return {
    id: "r1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    surface: "Turf",
    result: result.map((r) => ({
      horseId: r.horseId as any,
      time: r.time,
      position: r.position ?? 1,
    })),
    ...rest,
  } as Race;
}

describe("bestPerMileByHorse", () => {
  it("returns an empty map for no races", () => {
    expect(bestPerMileByHorse([]).size).toBe(0);
  });

  it("records the best per-mile pace for a single horse", () => {
    const races = [mkRace({ distance: 1600, result: [{ horseId: "h1", time: 96 }] })];
    const best = bestPerMileByHorse(races);
    expect(best.get("h1")?.perMile).toBeCloseTo(96 / (1600 / 1609.34), 2);
    expect(best.get("h1")?.seconds).toBe(96);
    expect(best.get("h1")?.distance).toBe(1600);
    expect(best.get("h1")?.raceName).toBe("Test Race");
  });

  it("keeps the best (lowest) per-mile pace across multiple races", () => {
    const races = [
      mkRace({ id: "r1", distance: 1600, result: [{ horseId: "h1", time: 100 }] }),
      mkRace({ id: "r2", distance: 1600, result: [{ horseId: "h1", time: 90 }] }),
      mkRace({ id: "r3", distance: 3200, result: [{ horseId: "h1", time: 200 }] }),
    ];
    const best = bestPerMileByHorse(races);
    const pace90 = 90 / (1600 / 1609.34);
    const pace200 = 200 / (3200 / 1609.34);
    expect(pace90).toBeLessThan(pace200);
    expect(best.get("h1")?.seconds).toBe(90);
  });

  it("ignores invalid times (NaN, <=0)", () => {
    const races = [
      mkRace({ distance: 1600, result: [{ horseId: "h1", time: 0 }] }),
      mkRace({ distance: 1600, result: [{ horseId: "h1", time: Number.NaN }] }),
    ];
    expect(bestPerMileByHorse(races).has("h1")).toBe(false);
  });

  it("ignores races with zero distance", () => {
    const races = [mkRace({ distance: 0, result: [{ horseId: "h1", time: 90 }] })];
    expect(bestPerMileByHorse(races).has("h1")).toBe(false);
  });

  it("handles multiple horses in one race", () => {
    const races = [
      mkRace({
        distance: 1600,
        result: [
          { horseId: "h1", time: 90 },
          { horseId: "h2", time: 100 },
        ],
      }),
    ];
    const best = bestPerMileByHorse(races);
    expect(best.has("h1")).toBe(true);
    expect(best.has("h2")).toBe(true);
    expect(best.get("h1")!.perMile).toBeLessThan(best.get("h2")!.perMile);
  });
});
