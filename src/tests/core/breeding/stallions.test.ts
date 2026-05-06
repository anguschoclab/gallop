import { describe, it, expect } from "vitest";
import {
  defaultStudParams,
  initialStandingFee,
  recalcStandingFee,
  isStallionAvailable,
  shouldRetireAtStartup,
} from "@/core/breeding/stallions";
import type { Horse, Stable } from "@/game/types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "stallion",
    name: overrides.name ?? "Test",
    age: 5,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#aabbcc",
    stats: { speed: 80, stamina: 80, acceleration: 80, consistency: 80 },
    energy: 100,
    form: 0,
    potential: 90,
    raceHistory: [],
    owned: false,
    fame: 50,
    ...overrides,
  };
}

function mkStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: overrides.id ?? "s1",
    name: overrides.name ?? "Test Farm",
    owner: "Test",
    tier: "mid",
    reputation: 60,
    founded: 1,
    cash: 100000,
    horses: [],
    isMajor: true,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "breeder",
    ...overrides,
  };
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

  it("rounds to nearest $500", () => {
    const h = mkHorse();
    const fee = initialStandingFee(h, "mid");
    expect(fee % 500).toBe(0);
  });
});

describe("recalcStandingFee", () => {
  it("raises fee with stakes wins; G1 wins matter more", () => {
    const base = 10000;
    expect(recalcStandingFee(base, 0, 0)).toBe(base);
    expect(recalcStandingFee(base, 1, 0)).toBeGreaterThan(base);
    expect(recalcStandingFee(base, 0, 1)).toBeGreaterThan(recalcStandingFee(base, 1, 0));
  });

  it("converges at 4× cap so a runaway sire doesn't break the economy", () => {
    const base = 10000;
    const huge = recalcStandingFee(base, 100, 100);
    expect(huge).toBeLessThanOrEqual(base * 4);
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
  function studHorse(over: Partial<Horse["stud"]> = {}, h: Partial<Horse> = {}): Horse {
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
        lifecycleStatus: "active" as const,
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
