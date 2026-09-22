import { describe, it, expect } from "vitest";
import {
  careerStage,
  offscreenStartInterval,
  isDueForOffscreenStart,
  simulateOffscreenStart,
  applyOffscreenStart,
  summarizeNpcCareer,
  REAL_START_COOLDOWN_DAYS,
} from "@/core/npc/careerTracker";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";

function horse(overrides: Partial<Horse> = {}): Horse {
  return { ...createTestHorse(), raceHistory: [], ...overrides } as Horse;
}

describe("npc career tracker", () => {
  it("classifies career stage from age and peak age", () => {
    expect(careerStage(horse({ age: 1, peakAge: 5 }))).toBe("unraced");
    expect(careerStage(horse({ age: 2, peakAge: 5 }))).toBe("juvenile");
    expect(careerStage(horse({ age: 3, peakAge: 5 }))).toBe("rising");
    expect(careerStage(horse({ age: 5, peakAge: 5 }))).toBe("prime");
    expect(careerStage(horse({ age: 9, peakAge: 5 }))).toBe("veteran");
    expect(careerStage(horse({ age: 4, lifecycleStatus: "retired" }))).toBe("retired");
  });

  it("gives prime horses the busiest campaign", () => {
    expect(offscreenStartInterval("prime")).toBeLessThan(offscreenStartInterval("juvenile"));
    expect(offscreenStartInterval("veteran")).toBeGreaterThan(offscreenStartInterval("prime"));
    expect(offscreenStartInterval("unraced")).toBe(0);
  });

  it("never simulates starts for horses recently seen in a real race", () => {
    const h = horse({
      age: 4,
      peakAge: 5,
      raceHistory: [{ raceId: "r1", raceName: "Real Race", position: 2, day: 100 }],
    });
    const rng = createRng(1);
    for (let day = 100; day < 100 + REAL_START_COOLDOWN_DAYS; day++) {
      expect(isDueForOffscreenStart(h, day, "mid", rng)).toBe(false);
    }
  });

  it("does not simulate starts for foals or horses at stud", () => {
    const rng = createRng(2);
    expect(isDueForOffscreenStart(horse({ age: 1 }), 500, "mid", rng)).toBe(false);
    expect(
      isDueForOffscreenStart(
        horse({ age: 5, stud: { atStud: true } as Horse["stud"] }),
        500,
        "mid",
        rng,
      ),
    ).toBe(false);
  });

  it("produces a plausible off-screen start and advances the career record", () => {
    const h = horse({ age: 4, peakAge: 5, lifetimeEarnings: 0, careerStarts: 0, careerWins: 0 });
    const outcome = simulateOffscreenStart(h, 400, "mid", createRng(7));

    expect(outcome.entry.offscreen).toBe(true);
    expect(outcome.entry.day).toBe(400);
    expect(outcome.entry.position).toBeGreaterThanOrEqual(1);
    expect(outcome.entry.position).toBeLessThanOrEqual(outcome.entry.fieldSize ?? 12);
    expect(outcome.entry.purse ?? 0).toBeGreaterThan(0);
    expect(outcome.entry.distance ?? 0).toBeGreaterThanOrEqual(800);

    const updated = applyOffscreenStart(h, outcome);
    expect(updated.raceHistory).toHaveLength(1);
    expect(updated.careerStarts).toBe(1);
    expect(updated.lifetimeEarnings).toBe(outcome.entry.purseEarned ?? 0);
    expect(updated.careerTracker?.offscreenStarts).toBe(1);
    expect(h.raceHistory).toHaveLength(0); // input untouched
  });

  it("accumulates a real record over several seasons", () => {
    let h = horse({ age: 3, peakAge: 5 });
    const rng = createRng(11);
    for (let day = 0; day < 720; day++) {
      if (day % 365 === 0 && day > 0) h = { ...h, age: h.age + 1 };
      if (isDueForOffscreenStart(h, day, "mid", rng)) {
        h = applyOffscreenStart(h, simulateOffscreenStart(h, day, "mid", rng));
      }
    }
    const summary = summarizeNpcCareer(h, 720);
    expect(summary.starts).toBeGreaterThan(3);
    expect(summary.earnings).toBeGreaterThanOrEqual(0);
    expect(summary.offscreenStarts).toBe(summary.starts);
  });

  it("is deterministic for the same seed", () => {
    const h = horse({ age: 4, peakAge: 5 });
    const a = simulateOffscreenStart(h, 300, "elite", createRng(42));
    const b = simulateOffscreenStart(h, 300, "elite", createRng(42));
    expect(a.entry).toEqual(b.entry);
  });

  it("does not simulate starts for injured horses", () => {
    const h = horse({
      age: 3,
      activeInjury: { onsetDay: 90, type: "Soreness", severity: "minor", recoveryDays: 10 },
    });
    expect(isDueForOffscreenStart(h, 100, "mid", createRng(1))).toBe(false);
  });

  it("summarizes mixed real and offscreen records accurately", () => {
    const h = horse({
      age: 4,
      raceHistory: [
        { raceId: "r1", raceName: "Real Race", position: 1, purseEarned: 10000, day: 50 },
        {
          raceId: "r2",
          raceName: "Sim Race",
          position: 2,
          purseEarned: 5000,
          day: 80,
          offscreen: true,
        },
      ],
      careerTracker: {
        lastOffscreenDay: 80,
        offscreenStarts: 1,
        offscreenWins: 0,
        offscreenEarnings: 5000,
      } as Horse["careerTracker"],
    });

    const summary = summarizeNpcCareer(h, 100);
    expect(summary.starts).toBe(2);
    expect(summary.wins).toBe(1);
    expect(summary.earnings).toBe(15000);
    expect(summary.winRate).toBe(0.5);
    expect(summary.offscreenStarts).toBe(1);
    expect(summary.lastStartDay).toBe(80);
    expect(summary.daysSinceStart).toBe(20);
  });
});
