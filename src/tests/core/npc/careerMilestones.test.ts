import { describe, it, expect } from "vitest";
import {
  detectPlayerMilestones,
  detectRivalMilestones,
  isNotableRival,
} from "@/core/npc/careerMilestones";
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

describe("player career milestones", () => {
  it("reports a debut with no fame floor — every player debut counts", () => {
    const m = detectPlayerMilestones(horse({ age: 2, fame: 0, raceHistory: [start(10, 6)] }), []);
    expect(m.map((x) => x.kind)).toContain("debut");
  });

  it("reports debut, graded win, earnings and retirement on an unremarkable retired player horse", () => {
    const m = detectPlayerMilestones(
      horse({
        age: 8,
        fame: 0,
        lifecycleStatus: "retired",
        peakAge: 5,
        lifetimeEarnings: 600_000,
        raceHistory: [start(5, 1, "G1", 500_000)],
      }),
      [],
    );
    const kinds = m.map((x) => x.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["debut", "breakthrough_win", "earnings", "retirement"]),
    );
  });

  it("reports peak transitions on an active player horse", () => {
    const m = detectPlayerMilestones(horse({ age: 5, peakAge: 5, fame: 0 }), []);
    expect(m.some((x) => x.key === "stage_prime")).toBe(true);
  });

  it("uses player-flavoured copy naming the horse", () => {
    const m = detectPlayerMilestones(
      horse({ name: "My Champ", age: 2, raceHistory: [start(10, 1)] }),
      [],
    );
    const debut = m.find((x) => x.kind === "debut")!;
    expect(debut.title).toContain("My Champ");
    expect(/your|stable/i.test(debut.body)).toBe(true);
  });

  it("suppresses already-announced keys", () => {
    const h = horse({ age: 2, raceHistory: [start(10, 4)] });
    expect(detectPlayerMilestones(h, ["debut"]).some((x) => x.kind === "debut")).toBe(false);
  });
});
