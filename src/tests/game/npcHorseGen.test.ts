import { describe, it, expect } from "vitest";
import {
  generateStableHorses,
  generateAllNpcHorses,
  calculateNpcHorseValue,
  getStudFee,
  getBroodmareFee,
} from "@/game/npcHorseGen";
import { generateNpcHorse } from "@/game/horseGen";
import { createRng } from "@/game/rng";
import type { Stable } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkStable(tier: Stable["tier"], isMajor = true, overrides: Partial<Stable> = {}): Stable {
  return {
    id: "s1",
    name: "Test",
    owner: "Owner",
    tier,
    reputation: 75,
    founded: 1,
    cash: 200000,
    horses: [],
    isMajor,
    colors: { primary: "#000", secondary: "#fff" },
    country: "USA",
    personality: "conservative",
    ...overrides,
  };
}

const STAT_RANGES: Record<Stable["tier"], [number, number]> = {
  elite: [55, 85],
  mid: [40, 70],
  budget: [25, 55],
};

describe("generateNpcHorse", () => {
  for (const tier of ["elite", "mid", "budget"] as const) {
    it(`${tier}: all 4 stats within tier range`, () => {
      const [lo, hi] = STAT_RANGES[tier];
      for (let i = 0; i < 20; i++) {
        const h = generateNpcHorse(mkStable(tier), createRng("test"));
        expect(h.stats.speed).toBeGreaterThanOrEqual(lo);
        expect(h.stats.speed).toBeLessThanOrEqual(hi);
        expect(h.stats.stamina).toBeGreaterThanOrEqual(lo);
        expect(h.stats.stamina).toBeLessThanOrEqual(hi);
        expect(h.stats.acceleration).toBeGreaterThanOrEqual(lo);
        expect(h.stats.acceleration).toBeLessThanOrEqual(hi);
        expect(h.stats.consistency).toBeGreaterThanOrEqual(lo);
        expect(h.stats.consistency).toBeLessThanOrEqual(hi);
      }
    });
  }

  it("owned is always false", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"));
    expect(h.owned).toBe(false);
  });

  it("stableId matches provided id", () => {
    const h = generateNpcHorse(mkStable("mid", true, { id: "stable-xyz" }), createRng("test"));
    expect(h.stableId).toBe("stable-xyz");
  });

  it("specificAge is honored", () => {
    for (let i = 0; i < 10; i++) {
      const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
        forcedAge: 5,
      });
      expect(h.age).toBe(5);
    }
  });

  it("specificGender is honored", () => {
    for (let i = 0; i < 10; i++) {
      const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
        forcedGender: "mare",
      });
      expect(h.gender).toBe("mare");
    }
  });

  it("hemisphere is honored when provided", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      hemisphere: "Southern",
    });
    expect(h.hemisphere).toBe("Southern");
  });

  it("all required fields are present", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"));
    expect(h.id).toBeTruthy();
    expect(h.name).toBeTruthy();
    expect(typeof h.age).toBe("number");
    expect(h.gender).toBeTruthy();
    expect(h.silk).toBeTruthy();
    expect(h.raceHistory).toEqual([]);
    expect(h.healthStatus).toBe("healthy");
  });
});

describe("calculateNpcHorseValue", () => {
  it("result is rounded to nearest 100", () => {
    const horse = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 4,
    });
    const val = calculateNpcHorseValue(horse, "mid");
    expect(val % 100).toBe(0);
  });

  it("elite tier > mid tier > budget tier for same horse", () => {
    const horse = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 4,
    });
    const elite = calculateNpcHorseValue(horse, "elite");
    const mid = calculateNpcHorseValue(horse, "mid");
    const budget = calculateNpcHorseValue(horse, "budget");
    expect(elite).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(budget);
  });

  it("young horse (age 2) has higher value than old horse (age 8) for same stats", () => {
    const young = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 2,
    });
    const old = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 8,
    });
    // Use same stats for fair comparison — override manually
    const base = { speed: 60, stamina: 60, acceleration: 60, consistency: 60 };
    const youngVal = calculateNpcHorseValue({ ...young, stats: base, fame: 0 }, "mid");
    const oldVal = calculateNpcHorseValue({ ...old, stats: base, fame: 0 }, "mid");
    expect(youngVal).toBeGreaterThan(oldVal);
  });
});

describe("getStudFee", () => {
  const stable = mkStable("mid");

  it("returns 0 for mare", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 5,
      forcedGender: "mare",
    });
    expect(getStudFee(h, stable)).toBe(0);
  });

  it("returns 0 for filly", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 2,
      forcedGender: "filly",
    });
    expect(getStudFee(h, stable)).toBe(0);
  });

  it("returns 0 for horse younger than 4", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 3,
      forcedGender: "horse",
    });
    expect(getStudFee(h, stable)).toBe(0);
  });

  it("returns > 0 for horse age >= 4", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 5,
      forcedGender: "horse",
    });
    expect(getStudFee(h, stable)).toBeGreaterThan(0);
  });

  it("returns 0 for colt younger than 4", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 2,
      forcedGender: "colt",
    });
    expect(getStudFee(h, stable)).toBe(0);
  });
});

describe("getBroodmareFee", () => {
  const stable = mkStable("mid");

  it("returns 0 for horse (male)", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 5,
      forcedGender: "horse",
    });
    expect(getBroodmareFee(h, stable)).toBe(0);
  });

  it("returns 0 for colt", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 2,
      forcedGender: "colt",
    });
    expect(getBroodmareFee(h, stable)).toBe(0);
  });

  it("returns 0 for filly age < 3", () => {
    const h = generateNpcHorse(mkStable("mid"), createRng("test"), undefined, 1, {
      forcedAge: 2,
      forcedGender: "filly",
    });
    expect(getBroodmareFee(h, stable)).toBe(0);
  });

  it("returns > 0 for eligible mare", () => {
    const s = { id: "s1", tier: "mid" } as any;
    const h = generateNpcHorse(s, createRng("test"), undefined, 1, { forcedAge: 5 });
    h.gender = "mare"; // Ensure it's a mare for the test
    expect(getBroodmareFee(h, s)).toBeGreaterThan(0);
  });

  it("broodmare fee is approximately 30% of calculateNpcHorseValue", () => {
    const s = { id: "s1", tier: "mid" } as any;
    const h = generateNpcHorse(s, createRng("test"), undefined, 1, { forcedAge: 5 });
    h.gender = "mare";
    const val = calculateNpcHorseValue(h, "mid");
    const fee = getBroodmareFee(h, s);
    const expected = Math.round(val * 0.3);
    expect(fee).toBe(expected);
  });
});

describe("generateStableHorses", () => {
  it("filler stable (isMajor=false) generates exactly 10 horses", () => {
    const stable = mkStable("budget", false);
    const horses = generateStableHorses(stable, createRng("test"));
    expect(horses).toHaveLength(10);
  });

  it("major elite stable generates 30-40 horses", () => {
    const stable = mkStable("elite", true);
    const horses = generateStableHorses(stable, createRng("test"));
    expect(horses.length).toBeGreaterThanOrEqual(30);
    expect(horses.length).toBeLessThanOrEqual(40);
  });

  it("major mid stable generates 20-30 horses", () => {
    const stable = mkStable("mid", true);
    const horses = generateStableHorses(stable, createRng("test"));
    expect(horses.length).toBeGreaterThanOrEqual(20);
    expect(horses.length).toBeLessThanOrEqual(30);
  });

  it("major budget stable generates 15-25 horses", () => {
    const stable = mkStable("budget", true);
    const horses = generateStableHorses(stable, createRng("test"));
    expect(horses.length).toBeGreaterThanOrEqual(15);
    expect(horses.length).toBeLessThanOrEqual(25);
  });

  it("all generated horses have correct stableId", () => {
    const stable = mkStable("mid", false, { id: "my-stable" });
    const horses = generateStableHorses(stable, createRng("test"));
    for (const h of horses) {
      expect(h.stableId).toBe("my-stable");
    }
  });
});

describe("generateAllNpcHorses", () => {
  it("updated stables have horses arrays populated", () => {
    const stables = [
      mkStable("budget", false, { id: "s1" }),
      mkStable("budget", false, { id: "s2" }),
    ];
    const { stables: updated } = generateAllNpcHorses(stables, createRng("test"));
    for (const s of updated) {
      expect(s.horses.length).toBeGreaterThan(0);
    }
  });

  it("total horse count equals sum of per-stable counts", () => {
    const stables = [mkStable("budget", false, { id: "s1" }), mkStable("mid", false, { id: "s2" })];
    const { stables: updated, horses } = generateAllNpcHorses(stables, createRng("test"));
    const expectedCount = updated.reduce((sum, s) => sum + s.horses.length, 0);
    expect(horses.length).toBe(expectedCount);
  });
});
