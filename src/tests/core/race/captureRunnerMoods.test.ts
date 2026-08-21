import { describe, it, expect } from "vitest";
import { captureRunnerMoods } from "@/core/race/runnerConditions";
import type { Runner } from "@/core/race/engine/runnerBuilder";

function horse(temperament = 50, injured = false) {
  return {
    stats: { temperament },
    ...(injured ? { activeInjury: { type: "tendon" } } : {}),
  } as unknown as Runner["horse"];
}

function runner(overrides: Partial<Runner> = {}): Runner {
  return {
    horseId: "h1",
    name: "Test Runner",
    position: 800,
    velocity: 16,
    finishTime: null,
    lane: 1,
    ownership: { type: "unowned" },
    runningStyle: "P",
    topSpeed: 18,
    horse: horse(),
    ...overrides,
  } as unknown as Runner;
}

const DISTANCE = 1600;

describe("captureRunnerMoods", () => {
  it("captures mood for all live runners", () => {
    const runners = [
      runner({ horseId: "a", runningStyle: "E", position: 900, velocity: 17 }),
      runner({ horseId: "b", position: 880, velocity: 16 }),
      runner({ horseId: "c", position: 850, velocity: 15 }),
    ];
    const peaks = new Map<string, number>([
      ["a", 17],
      ["b", 16],
      ["c", 15],
    ]);

    captureRunnerMoods(runners, peaks, DISTANCE);

    for (const r of runners) {
      expect(r.finalMood).toBeDefined();
      expect(r.finalMood!.score).toBeGreaterThanOrEqual(0);
      expect(r.finalMood!.score).toBeLessThanOrEqual(100);
      expect(r.finalMood!.signals).toBeDefined();
    }
  });

  it("skips finished runners — does not overwrite finalMood", () => {
    const existingMood = {
      score: 42,
      face: "neutral" as const,
      label: "Coping",
      signals: [],
    };
    const runners = [
      runner({ horseId: "a", finishTime: 95.2, finalMood: existingMood }),
      runner({ horseId: "b", position: 880, velocity: 16 }),
    ];
    const peaks = new Map<string, number>([
      ["a", 17],
      ["b", 16],
    ]);

    captureRunnerMoods(runners, peaks, DISTANCE);

    expect(runners[0].finalMood).toBe(existingMood);
    expect(runners[1].finalMood).toBeDefined();
  });

  it("preserves existing finalMood for finished runners", () => {
    const original = {
      score: 10,
      face: "unhappy" as const,
      label: "Unhappy",
      signals: [],
    };
    const r = runner({ horseId: "a", finishTime: 90.0, finalMood: original });
    const peaks = new Map<string, number>([["a", 17]]);

    captureRunnerMoods([r], peaks, DISTANCE);

    expect(r.finalMood).toBe(original);
  });

  it("handles single-runner field without crashing", () => {
    const r = runner({ horseId: "solo", position: 800, velocity: 16 });
    const peaks = new Map<string, number>([["solo", 16]]);

    expect(() => captureRunnerMoods([r], peaks, DISTANCE)).not.toThrow();
    expect(r.finalMood).toBeDefined();
  });

  it("handles all-finished field without crashing", () => {
    const runners = [
      runner({ horseId: "a", finishTime: 90.0 }),
      runner({ horseId: "b", finishTime: 91.0 }),
    ];
    const peaks = new Map<string, number>([
      ["a", 17],
      ["b", 17],
    ]);

    expect(() => captureRunnerMoods(runners, peaks, DISTANCE)).not.toThrow();
  });

  it("processes off-screen runners (regression test for Bug #1)", () => {
    // Simulate a large field where back-markers are far behind the leader.
    // captureRunnerMoods must process ALL runners, not just on-screen ones.
    const runners = [
      runner({ horseId: "leader", position: 1500, velocity: 17 }),
      runner({ horseId: "mid", position: 1000, velocity: 16 }),
      runner({ horseId: "backmarker", position: 200, velocity: 14 }),
    ];
    const peaks = new Map<string, number>([
      ["leader", 17],
      ["mid", 16],
      ["backmarker", 14],
    ]);

    captureRunnerMoods(runners, peaks, DISTANCE);

    // The backmarker at position 200 would be off-screen in Track.tsx,
    // but captureRunnerMoods must still compute its mood.
    const backmarker = runners.find((r) => r.horseId === "backmarker")!;
    expect(backmarker.finalMood).toBeDefined();
    expect(backmarker.finalMood!.score).toBeGreaterThanOrEqual(0);
  });
});
