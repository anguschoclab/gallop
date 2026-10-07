import { describe, it, expect } from "vitest";
import { buildRivalCareerProfile, buildRivalCareerProfiles } from "@/core/npc/rivalCareerCompare";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";

function horse(overrides: Partial<Horse> = {}): Horse {
  return { ...createTestHorse(), raceHistory: [], ...overrides } as Horse;
}

function start(day: number, position: number, grade?: string, purseEarned = 0) {
  return { raceId: `r${day}`, raceName: "Test Race", position, day, grade, purseEarned };
}

describe("rival career comparison", () => {
  it("derives record, earnings and stage for a rival", () => {
    const p = buildRivalCareerProfile(
      horse({
        name: "Rival One",
        age: 5,
        peakAge: 5,
        fame: 42.4,
        raceHistory: [start(10, 1, "G3", 120_000), start(40, 3, undefined, 20_000)],
      }),
      60,
    );
    expect(p.starts).toBe(2);
    expect(p.wins).toBe(1);
    expect(p.winRate).toBeCloseTo(0.5);
    expect(p.earnings).toBe(140_000);
    expect(p.fame).toBe(42);
    expect(p.age).toBe(5);
    expect(p.stage).toBe("prime");
    expect(p.daysSinceStart).toBe(20);
  });

  it("includes milestone history and flags announced ones", () => {
    const p = buildRivalCareerProfile(
      horse({
        age: 4,
        fame: 40,
        raceHistory: [start(10, 1, "G2", 300_000)],
        lifetimeEarnings: 300_000,
        careerMilestonesAnnounced: ["debut"],
      }),
      20,
    );
    const kinds = p.milestones.map((m) => m.kind);
    expect(kinds).toContain("breakthrough_win");
    expect(kinds).toContain("earnings");
    expect(p.milestones.find((m) => m.key === "debut")?.announced).toBe(true);
    expect(p.milestones.find((m) => m.key === "breakthrough_win")?.announced).toBe(false);
    expect(p.milestones.find((m) => m.key === "debut")?.day).toBe(10);
    expect(p.milestones.find((m) => m.key === "breakthrough_win")?.day).toBe(10);
    expect(p.milestones.find((m) => m.key === "earnings_250000")?.day).toBe(10);
  });

  it("dates and chronologically orders career-stage and retirement milestones", () => {
    const p = buildRivalCareerProfile(
      horse({
        age: 8,
        peakAge: 4,
        birthDay: 20,
        fame: 60,
        lifecycleStatus: "retired",
        retiredOnDay: 2_950,
        raceHistory: [start(800, 4), start(900, 1, "G3", 300_000)],
      }),
      3_000,
    );

    expect(p.milestones.find((m) => m.key === "retirement")?.day).toBe(2_950);
    expect(p.milestones.map((m) => m.day)).toEqual(
      [...p.milestones.map((m) => m.day)].sort((a, b) => (a ?? Infinity) - (b ?? Infinity)),
    );
  });

  it("dates career-stage milestones from horse.age, not placeholder birthDay", () => {
    // A 6yo in decline at day 3000 with the default birthDay of 1.
    const p = buildRivalCareerProfile(
      horse({
        age: 6,
        peakAge: 4,
        birthDay: 1,
        fame: 50,
        raceHistory: [start(100, 2)],
      }),
      3_000,
    );
    // Entered "declining" (peakAge + 2 = age 6) at day 3000.
    expect(p.milestones.find((m) => m.key === "stage_declining")?.day).toBe(3_000);
  });

  it("dates the prime-stage milestone at the age it was reached", () => {
    // A 5yo at peak, day 3000 — reached prime (age 4) at day 2635.
    const p = buildRivalCareerProfile(
      horse({
        age: 5,
        peakAge: 4,
        birthDay: 1,
        fame: 50,
        raceHistory: [start(100, 2)],
      }),
      3_000,
    );
    expect(p.milestones.find((m) => m.key === "stage_prime")?.day).toBe(2_635);
  });

  it("sorts profiles by earnings", () => {
    const profiles = buildRivalCareerProfiles(
      [
        horse({ id: "a", name: "A", raceHistory: [start(5, 2, undefined, 10_000)] }),
        horse({ id: "b", name: "B", raceHistory: [start(5, 1, undefined, 90_000)] }),
      ],
      30,
    );
    expect(profiles.map((p) => p.id)).toEqual(["b", "a"]);
  });
});
