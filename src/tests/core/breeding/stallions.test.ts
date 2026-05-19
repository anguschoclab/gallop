import { describe, it, expect } from "vitest";
import {
  defaultStudParams,
  initialStandingFee,
  recalcStandingFee,
  isStallionAvailable,
  shouldRetireAtStartup,
} from "@/core/breeding/stallions";
import type { Horse, Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "stallion",
    name: "Test",
    age: 5,
    gender: "horse",
    ...overrides,
  });
}

function mkStable(overrides: Partial<Stable> = {}): Stable {
  return createTestStable({
    id: "s1",
    name: "Test Farm",
    owner: "Test",
    tier: "mid",
    reputation: 60,
    founded: 1,
    cash: 100000,
    isMajor: true,
    personality: "breeder",
    ...overrides,
  });
}

describe("defaultStudParams", () => {
  it("elite > mid > budget for fee and bookSize", () => {
    expect(defaultStudParams("elite").fee).toBeGreaterThan(defaultStudParams("mid").fee);
    expect(defaultStudParams("mid").fee).toBeGreaterThan(defaultStudParams("budget").fee);
    expect(defaultStudParams("elite").bookSize).toBeGreaterThan(
      defaultStudParams("budget").bookSize,
    );
  });
});

describe("initialStandingFee", () => {
  it("higher tier produces higher fee for the same stat profile", () => {
    const h = mkHorse();
    const eliteFee = initialStandingFee(h, "elite");
    const midFee = initialStandingFee(h, "mid");
    const budgetFee = initialStandingFee(h, "budget");
    expect(eliteFee).toBeGreaterThan(midFee);
    expect(midFee).toBeGreaterThan(budgetFee);
  });

  it("rounds to nearest $100", () => {
    const h = mkHorse();
    const fee = initialStandingFee(h, "mid");
    expect(fee % 100).toBe(0);
  });
});

describe("recalcStandingFee", () => {
  it("raises fee with stakes wins; G1 wins matter more", () => {
    const horse = mkHorse({
      stud: {
        atStud: true,
        standingFee: 10000,
        bookSize: 100,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 1,
      },
      raceHistory: [],
    });
    const state = { horses: [horse], npcStables: [] };
    const base = recalcStandingFee(horse, state as any);

    // Add a stakes win
    horse.raceHistory.push({
      raceId: "r1",
      raceName: "Stakes",
      position: 1,
      day: 1,
      raceClass: "Stakes",
    });
    const stakesFee = recalcStandingFee(horse, state as any);
    expect(stakesFee).toBeGreaterThan(base);

    // Add a G1 win
    horse.raceHistory.push({
      raceId: "r2",
      raceName: "G1",
      position: 1,
      day: 2,
      grade: "G1",
    });
    const g1Fee = recalcStandingFee(horse, state as any);
    expect(g1Fee).toBeGreaterThan(stakesFee);
  });
});

describe("shouldRetireAtStartup", () => {
  it("never retires females", () => {
    expect(shouldRetireAtStartup(mkHorse({ gender: "mare" }), mkStable())).toBe(false);
  });

  it("never retires under-5 horses", () => {
    expect(shouldRetireAtStartup(mkHorse({ age: 4 }), mkStable())).toBe(false);
  });

  it("elite stables retire all eligible males", () => {
    expect(shouldRetireAtStartup(mkHorse({ age: 5 }), mkStable({ tier: "elite" }))).toBe(true);
  });

  it("budget stables only retire 7+", () => {
    expect(shouldRetireAtStartup(mkHorse({ age: 6 }), mkStable({ tier: "budget" }))).toBe(false);
    expect(shouldRetireAtStartup(mkHorse({ age: 7 }), mkStable({ tier: "budget" }))).toBe(true);
  });
});

describe("isStallionAvailable", () => {
  function studHorse(
    over: Partial<NonNullable<Horse["stud"]>> = {},
    h: Partial<Horse> = {},
  ): Horse {
    return mkHorse({
      ...h,
      stud: {
        atStud: true,
        standingFee: 5000,
        bookSize: 100,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 1,
        ...over,
      },
    });
  }

  it("blocks if not at-stud", () => {
    expect(isStallionAvailable(mkHorse(), 50)).toBe(false);
  });

  it("blocks if book is full", () => {
    expect(isStallionAvailable(studHorse({ seasonBookings: 100 }), 50)).toBe(false);
  });

  it("blocks out of season", () => {
    // Northern season is DoY 36-167. Day 1 = DoY 1 → out of season.
    expect(isStallionAvailable(studHorse(), 1)).toBe(false);
  });

  it("allows in-season with capacity", () => {
    expect(isStallionAvailable(studHorse(), 100)).toBe(true);
  });
});
