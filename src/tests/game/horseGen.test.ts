import { describe, it, expect } from "vitest";
import { generateHorse, horsePrice, makeGradedRace, generateRace } from "@/game/horseGen";
import type { GradedRace } from "@/game/gradedRaces";

const STAT_RANGES: Record<string, [number, number]> = {
  starter: [30, 55],
  budget: [25, 60],
  mid: [45, 75],
  elite: [60, 90],
};

describe("generateHorse", () => {
  for (const tier of ["starter", "budget", "mid", "elite"] as const) {
    it(`${tier}: stats within tier range [${STAT_RANGES[tier]}]`, () => {
      const [lo, hi] = STAT_RANGES[tier];
      for (let i = 0; i < 10; i++) {
        const h = generateHorse({ tier });
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

  it("owned matches opts.owned (true)", () => {
    const h = generateHorse({ owned: true });
    expect(h.owned).toBe(true);
  });

  it("owned matches opts.owned (false)", () => {
    const h = generateHorse({ owned: false });
    expect(h.owned).toBe(false);
  });

  it("hemisphere matches opts.hemisphere", () => {
    expect(generateHorse({ hemisphere: "Northern" }).hemisphere).toBe("Northern");
    expect(generateHorse({ hemisphere: "Southern" }).hemisphere).toBe("Southern");
  });

  it("all required fields are present", () => {
    const h = generateHorse();
    expect(h.id).toBeTruthy();
    expect(h.name).toBeTruthy();
    expect(typeof h.age).toBe("number");
    expect(h.gender).toBeTruthy();
    expect(h.silk).toBeTruthy();
    expect(h.raceHistory).toEqual([]);
    expect(h.energy).toBe(100);
    expect(h.form).toBe(0);
    expect(h.fame).toBe(0);
  });

  it("two calls produce different IDs", () => {
    expect(generateHorse().id).not.toBe(generateHorse().id);
  });
});

describe("horsePrice", () => {
  it("result is a multiple of 50", () => {
    for (let i = 0; i < 20; i++) {
      const h = generateHorse({ tier: "mid" });
      expect(horsePrice(h) % 50).toBe(0);
    }
  });

  it("young horse (age <= 3, ageMod=1.2) costs more than old horse (age >= 6, ageMod=0.7) with same stats", () => {
    const h = generateHorse({ tier: "mid" });
    const youngH = { ...h, age: 3 };
    const oldH = { ...h, age: 6 };
    expect(horsePrice(youngH)).toBeGreaterThan(horsePrice(oldH));
  });

  it("price is always positive", () => {
    const h = generateHorse({ tier: "budget" });
    expect(horsePrice(h)).toBeGreaterThan(0);
  });
});

describe("makeGradedRace", () => {
  function mkGraded(grade: "G1" | "G2" | "G3"): GradedRace {
    return {
      key: `test-${grade.toLowerCase()}`,
      uuid: `test-uuid-${grade.toLowerCase()}`,
      name: `Test ${grade}`,
      grade,
      track: "Test Track",
      trackId: "t1",
      surface: "Turf",
      distance: 2000,
      purse: 100000,
      dayOfYear: 100,
      restrictions: {},
    };
  }

  it("G1 → entryFee=2500, minStat=78", () => {
    const race = makeGradedRace(mkGraded("G1"), 100);
    expect(race.entryFee).toBe(2500);
    expect(race.minStat).toBe(78);
  });

  it("G2 → entryFee=1500, minStat=70", () => {
    const race = makeGradedRace(mkGraded("G2"), 100);
    expect(race.entryFee).toBe(1500);
    expect(race.minStat).toBe(70);
  });

  it("G3 → entryFee=1000, minStat=62", () => {
    const race = makeGradedRace(mkGraded("G3"), 100);
    expect(race.entryFee).toBe(1000);
    expect(race.minStat).toBe(62);
  });

  it("graded.grade matches input", () => {
    const race = makeGradedRace(mkGraded("G1"), 50);
    expect(race.graded?.grade).toBe("G1");
  });

  it("race has correct day and distance", () => {
    const graded = mkGraded("G1");
    const race = makeGradedRace(graded, 200);
    expect(race.day).toBe(200);
    expect(race.distance).toBe(graded.distance);
  });

  it("fieldSize is 12 for graded races", () => {
    const race = makeGradedRace(mkGraded("G1"), 100);
    expect(race.fieldSize).toBe(12);
  });

  it("entries is empty on creation", () => {
    const race = makeGradedRace(mkGraded("G2"), 100);
    expect(race.entries).toEqual([]);
    expect(race.resolved).toBe(false);
  });
});

describe("generateRace", () => {
  it("returns valid race with all required fields", () => {
    const race = generateRace(10);
    expect(race.id).toBeTruthy();
    expect(race.name).toBeTruthy();
    expect(race.day).toBe(10);
    expect(race.distance).toBeGreaterThan(0);
    expect(race.entries).toEqual([]);
    expect(race.resolved).toBe(false);
  });

  it("fieldSize is between 6 and 8", () => {
    for (let i = 0; i < 20; i++) {
      const race = generateRace(1);
      expect(race.fieldSize).toBeGreaterThanOrEqual(6);
      expect(race.fieldSize).toBeLessThanOrEqual(8);
    }
  });

  it("raceClass is one of the valid classes", () => {
    const validClasses = ["Maiden","MaidenSpecialWeight","MaidenClaiming","MaidenOptionalClaiming","MaidenStakes","Allowance","OptionalClaiming","StarterAllowance","StarterHandicap","Stakes","Claiming","Handicap","Listed","Group","Graded"];
    for (let i = 0; i < 10; i++) {
      const race = generateRace(1);
      expect(validClasses).toContain(race.raceClass);
    }
  });

  it("two calls produce different IDs", () => {
    expect(generateRace(1).id).not.toBe(generateRace(1).id);
  });
});
