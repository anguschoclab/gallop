import { describe, it, expect } from "vitest";
import {
  careerStage,
  isDueForOffscreenStart,
  simulateOffscreenStart,
  applyOffscreenStart,
  summarizeNpcCareer,
} from "@/core/npc/careerTracker";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestRng } from "@/tests/helpers/createTestRng";
import type { Horse } from "@/core/horse/types";

describe("careerStage", () => {
  it("returns unraced for horses under 2", () => {
    const horse = createTestHorse({ age: 1 }) as Horse;
    expect(careerStage(horse)).toBe("unraced");
  });

  it("returns juvenile for 2-year-olds", () => {
    const horse = createTestHorse({ age: 2 }) as Horse;
    expect(careerStage(horse)).toBe("juvenile");
  });

  it("returns retired for horses with inactive status", () => {
    const horse = createTestHorse({ age: 4, lifecycleStatus: "retired" }) as Horse;
    expect(careerStage(horse)).toBe("retired");
  });
});

describe("isDueForOffscreenStart", () => {
  it("returns false for retired horses", () => {
    const horse = createTestHorse({ age: 4, lifecycleStatus: "retired" }) as Horse;
    const rng = createTestRng("0.5");
    expect(isDueForOffscreenStart(horse, 100, "mid", rng)).toBe(false);
  });

  it("returns false if horse is too young", () => {
    const horse = createTestHorse({ age: 1 }) as Horse;
    const rng = createTestRng("0.5");
    expect(isDueForOffscreenStart(horse, 100, "mid", rng)).toBe(false);
  });

  it("returns false if horse is injured", () => {
    const horse = createTestHorse({
      age: 3,
      activeInjury: { onsetDay: 90, type: "Soreness", severity: "minor", recoveryDays: 10 },
    }) as Horse;
    const rng = createTestRng("0.5");
    expect(isDueForOffscreenStart(horse, 100, "mid", rng)).toBe(false);
  });

  it("returns false if real start was recent", () => {
    const horse = createTestHorse({
      age: 3,
      raceHistory: [{ raceId: "r1", day: 90, offscreen: false } as any],
    }) as Horse;
    const rng = createTestRng("0.5");
    expect(isDueForOffscreenStart(horse, 100, "mid", rng)).toBe(false);
  });
});

describe("simulateOffscreenStart & applyOffscreenStart", () => {
  it("simulates and applies an offscreen start correctly", () => {
    const horse = createTestHorse({
      age: 3,
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
    }) as Horse;
    const rng = createTestRng("0"); // deterministic

    const outcome = simulateOffscreenStart(horse, 100, "mid", rng);
    expect(outcome.entry).toBeDefined();
    expect(outcome.entry.offscreen).toBe(true);
    expect(outcome.entry.day).toBe(100);

    const updated = applyOffscreenStart(horse, outcome);
    expect(updated.careerStarts).toBe(1);
    expect(updated.raceHistory?.length).toBe(1);
    expect(updated.careerTracker?.offscreenStarts).toBe(1);
    expect(updated.careerTracker?.lastOffscreenDay).toBe(100);
  });
});

describe("summarizeNpcCareer", () => {
  it("summarizes a career accurately", () => {
    const horse = createTestHorse({
      age: 4,
      raceHistory: [
        { raceId: "r1", day: 50, offscreen: false, position: 1, purseEarned: 10000 } as any,
        { raceId: "r2", day: 80, offscreen: true, position: 2, purseEarned: 5000 } as any,
      ],
      careerTracker: {
        lastOffscreenDay: 80,
        offscreenStarts: 1,
        offscreenWins: 0,
        offscreenEarnings: 5000,
        stage: "prime",
      },
    }) as Horse;

    const summary = summarizeNpcCareer(horse, 100);
    expect(summary.starts).toBe(2);
    expect(summary.wins).toBe(1);
    expect(summary.earnings).toBe(15000);
    expect(summary.winRate).toBe(0.5);
    expect(summary.offscreenStarts).toBe(1);
    expect(summary.lastStartDay).toBe(80);
    expect(summary.daysSinceStart).toBe(20);
  });
});
