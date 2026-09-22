import { describe, it, expect } from "vitest";
import { detectRivalMilestones, isNotableRival } from "@/core/npc/careerMilestones";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";

function horse(overrides: Partial<Horse> = {}): Horse {
  return { ...createTestHorse(), raceHistory: [], ...overrides } as Horse;
}

function start(day: number, position: number, grade?: string, purseEarned = 0) {
  return { raceId: `r${day}`, raceName: "Test Race", position, day, grade, purseEarned };
}

describe("rival career milestones", () => {
  it("only treats prominent rivals as notable", () => {
    expect(isNotableRival(horse({ fame: 5, lifetimeEarnings: 0 }))).toBe(false);
    expect(isNotableRival(horse({ fame: 40 }))).toBe(true);
    expect(isNotableRival(horse({ fame: 5, lifetimeEarnings: 200_000 }))).toBe(true);
  });

  it("reports a debut for a horse with a first start", () => {
    const m = detectRivalMilestones(horse({ age: 2, fame: 30, raceHistory: [start(10, 4)] }), []);
    expect(m.map((x) => x.kind)).toContain("debut");
  });

  it("reports a breakthrough graded win once", () => {
    const h = horse({ age: 3, peakAge: 5, fame: 40, raceHistory: [start(20, 1, "G3", 90_000)] });
    expect(detectRivalMilestones(h, []).some((x) => x.kind === "breakthrough_win")).toBe(true);
    expect(
      detectRivalMilestones(h, ["debut", "breakthrough_win", "stage_rising"]).some(
        (x) => x.kind === "breakthrough_win",
      ),
    ).toBe(false);
  });

  it("reports each crossed earnings threshold", () => {
    const m = detectRivalMilestones(horse({ age: 5, fame: 60, lifetimeEarnings: 600_000 }), []);
    const keys = m.filter((x) => x.kind === "earnings").map((x) => x.key);
    expect(keys).toEqual(["earnings_250000", "earnings_500000"]);
  });

  it("reports peak and decline transitions", () => {
    const prime = detectRivalMilestones(horse({ age: 5, peakAge: 5, fame: 50 }), []);
    expect(prime.some((x) => x.key === "stage_prime")).toBe(true);
    const decline = detectRivalMilestones(horse({ age: 7, peakAge: 4, fame: 50 }), []);
    expect(decline.some((x) => x.key === "stage_declining")).toBe(true);
  });

  it("reports retirement", () => {
    const m = detectRivalMilestones(
      horse({ age: 8, fame: 70, lifecycleStatus: "retired", raceHistory: [start(5, 1)] }),
      [],
    );
    expect(m.some((x) => x.kind === "retirement")).toBe(true);
  });
});
