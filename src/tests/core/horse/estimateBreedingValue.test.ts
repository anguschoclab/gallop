import { describe, it, expect } from "vitest";
import { estimateBreedingValue } from "@/core/horse/pricing";
import {
  createTestHorse,
  createTestColt,
  createTestStallion,
  createTestMare,
  createTestGelding,
} from "@/tests/helpers/createTestHorse";
import type { Horse, StudCareer } from "@/game/types";

describe("estimateBreedingValue", () => {
  // ---------------------------------------------------------------------------
  // 1-2: Geldings / gelded flag → 0
  // ---------------------------------------------------------------------------
  it("returns 0 for geldings", () => {
    const gelding = createTestGelding({ age: 5 });
    expect(estimateBreedingValue(gelding)).toBe(0);
  });

  it("returns 0 when gelded flag is true even if gender is colt", () => {
    const geldedColt = createTestColt({ age: 5, gelded: true });
    expect(estimateBreedingValue(geldedColt)).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 3-5: Stallion age curve
  // ---------------------------------------------------------------------------
  it("stallion below prime (age 2) has lower value than at prime (age 7)", () => {
    const young = createTestStallion({ age: 2 });
    const prime = createTestStallion({ age: 7 });
    expect(estimateBreedingValue(young)).toBeLessThan(estimateBreedingValue(prime));
    expect(estimateBreedingValue(young)).toBeGreaterThan(0);
  });

  it("stallion at prime (age 7) has peak value (curve = 1.0)", () => {
    const at7 = createTestStallion({ age: 7 });
    const at18 = createTestStallion({ age: 18 }); // still prime end
    expect(estimateBreedingValue(at7)).toBe(estimateBreedingValue(at18));
  });

  it("stallion past prime (age 20) has lower value than at prime but > 0", () => {
    const prime = createTestStallion({ age: 7 });
    const past = createTestStallion({ age: 20 });
    expect(estimateBreedingValue(past)).toBeLessThan(estimateBreedingValue(prime));
    expect(estimateBreedingValue(past)).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 6-7: Mare age curve
  // ---------------------------------------------------------------------------
  it("mare below prime (age 2) has lower value than at prime (age 6)", () => {
    const young = createTestMare({ age: 2 });
    const prime = createTestMare({ age: 6 });
    expect(estimateBreedingValue(young)).toBeLessThan(estimateBreedingValue(prime));
    expect(estimateBreedingValue(young)).toBeGreaterThan(0);
  });

  it("mare past prime (age 18) has lower value than at prime", () => {
    const prime = createTestMare({ age: 6 });
    const past = createTestMare({ age: 18 });
    expect(estimateBreedingValue(past)).toBeLessThan(estimateBreedingValue(prime));
    expect(estimateBreedingValue(past)).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 8: Prime-year discount behavior — verify proportional reduction
  // ---------------------------------------------------------------------------
  it("stallion age 20 has curve = 0.7 (proportional discount from prime)", () => {
    // stallionAgeCurve(20) = max(0.15, 1 - (20 - 18) * 0.15) = max(0.15, 0.7) = 0.7
    const at20 = createTestStallion({ age: 20 });
    const atPrime = createTestStallion({ age: 7 });
    const ratio = estimateBreedingValue(at20) / estimateBreedingValue(atPrime);
    // Allow rounding tolerance since values are rounded to nearest 100
    expect(ratio).toBeCloseTo(0.7, 1);
  });

  // ---------------------------------------------------------------------------
  // 9: Stallion at stud with standing fee → capitalization path
  // ---------------------------------------------------------------------------
  it("stallion at stud with standing fee has higher value than projected-only", () => {
    const studCareer: StudCareer = {
      atStud: true,
      standingFee: 50000,
      lifetimeStakesFoals: 10,
      lifetimeG1Foals: 2,
      bookSize: 120,
      seasonBookings: 100,
      lifetimeFoals: 200,
    };
    const atStud = createTestStallion({ age: 7, stud: studCareer });
    const projected = createTestStallion({ age: 7 });
    expect(estimateBreedingValue(atStud)).toBeGreaterThan(estimateBreedingValue(projected));
  });

  // ---------------------------------------------------------------------------
  // 10: Mare with blue-hen status → value boosts
  // ---------------------------------------------------------------------------
  it("mare with blue-hen status has higher value than without", () => {
    const withBH = createTestMare({
      age: 6,
      isBlueHen: true,
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 5,
        group1WinnersProduced: 2,
        blueHenScore: 80,
        foalsProduced: 10,
      },
    });
    const without = createTestMare({ age: 6 });
    expect(estimateBreedingValue(withBH)).toBeGreaterThan(estimateBreedingValue(without));
  });

  it("mare blue-hen score increases value proportionally", () => {
    const lowScore = createTestMare({
      age: 6,
      blueHenStatus: {
        isBlueHen: false,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 10,
        foalsProduced: 0,
      },
    });
    const highScore = createTestMare({
      age: 6,
      blueHenStatus: {
        isBlueHen: false,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 90,
        foalsProduced: 0,
      },
    });
    expect(estimateBreedingValue(highScore)).toBeGreaterThan(estimateBreedingValue(lowScore));
  });

  // ---------------------------------------------------------------------------
  // 11: Fertility impact
  // ---------------------------------------------------------------------------
  it("mare with low fertility has lower value than high fertility", () => {
    const lowFert = createTestMare({ age: 6, fertility: 0.5 });
    const highFert = createTestMare({ age: 6, fertility: 0.95 });
    expect(estimateBreedingValue(lowFert)).toBeLessThan(estimateBreedingValue(highFert));
  });

  // ---------------------------------------------------------------------------
  // 12: Foaling ease impact
  // ---------------------------------------------------------------------------
  it("mare with low foaling ease has lower value than high foaling ease", () => {
    const lowEase = createTestMare({ age: 6, foalingEase: 0.7 });
    const highEase = createTestMare({ age: 6, foalingEase: 1.0 });
    expect(estimateBreedingValue(lowEase)).toBeLessThan(estimateBreedingValue(highEase));
  });

  // ---------------------------------------------------------------------------
  // 13: Result is always rounded to nearest 100
  // ---------------------------------------------------------------------------
  it("result is always a multiple of 100", () => {
    const horses: Horse[] = [
      createTestStallion({ age: 2 }),
      createTestStallion({ age: 7 }),
      createTestStallion({ age: 20 }),
      createTestMare({ age: 3 }),
      createTestMare({ age: 6 }),
      createTestMare({ age: 18 }),
      createTestColt({ age: 4 }),
      createTestMare({
        age: 6,
        blueHenStatus: {
          isBlueHen: true,
          stakesWinnersProduced: 3,
          group1WinnersProduced: 1,
          blueHenScore: 50,
          foalsProduced: 5,
        },
      }),
    ];
    for (const h of horses) {
      expect(estimateBreedingValue(h) % 100).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 14: Result is always >= 0 with very low stats
  // ---------------------------------------------------------------------------
  it("result is >= 0 with very low stats", () => {
    const lowStats = createTestStallion({
      age: 2,
      stats: {
        speed: 1,
        stamina: 1,
        acceleration: 1,
        consistency: 1,
        temperament: 1,
        conformation: 1,
      },
      potential: 1,
      fame: 0,
    });
    expect(estimateBreedingValue(lowStats)).toBeGreaterThanOrEqual(0);
  });

  // ---------------------------------------------------------------------------
  // 15-16: Colt and filly return positive breeding value
  // ---------------------------------------------------------------------------
  it("colt (age 4, not at stud) returns positive value", () => {
    const colt = createTestColt({ age: 4 });
    expect(estimateBreedingValue(colt)).toBeGreaterThan(0);
  });

  it("filly (age 3) returns positive value", () => {
    const filly = createTestHorse({ gender: "filly", age: 3 });
    expect(estimateBreedingValue(filly)).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 17: Win rate boosts projected value for non-stud males
  // ---------------------------------------------------------------------------
  it("stallion with high win rate has higher projected value than low win rate", () => {
    const lowWin = createTestStallion({ age: 7, careerStarts: 20, careerWins: 1 });
    const highWin = createTestStallion({ age: 7, careerStarts: 20, careerWins: 15 });
    expect(estimateBreedingValue(highWin)).toBeGreaterThan(estimateBreedingValue(lowWin));
  });

  // ---------------------------------------------------------------------------
  // 18: Fame boosts value
  // ---------------------------------------------------------------------------
  it("higher fame increases breeding value", () => {
    const lowFame = createTestStallion({ age: 7, fame: 0 });
    const highFame = createTestStallion({ age: 7, fame: 200 });
    expect(estimateBreedingValue(highFame)).toBeGreaterThan(estimateBreedingValue(lowFame));
  });

  // ---------------------------------------------------------------------------
  // 19: Foals produced boost for mares
  // ---------------------------------------------------------------------------
  it("mare with foals produced has higher value than without", () => {
    const withFoals = createTestMare({
      age: 6,
      blueHenStatus: {
        isBlueHen: false,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 0,
        foalsProduced: 10,
      },
    });
    const without = createTestMare({
      age: 6,
      blueHenStatus: {
        isBlueHen: false,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 0,
        foalsProduced: 0,
      },
    });
    expect(estimateBreedingValue(withFoals)).toBeGreaterThan(estimateBreedingValue(without));
  });

  // ---------------------------------------------------------------------------
  // 20: isBlueHen flag gives 1.5x multiplier
  // ---------------------------------------------------------------------------
  it("isBlueHen flag multiplies value by 1.5", () => {
    const base = createTestMare({
      age: 6,
      blueHenStatus: {
        isBlueHen: false,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 0,
        foalsProduced: 0,
      },
    });
    const blueHen = createTestMare({
      age: 6,
      isBlueHen: true,
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 0,
        group1WinnersProduced: 0,
        blueHenScore: 0,
        foalsProduced: 0,
      },
    });
    const ratio = estimateBreedingValue(blueHen) / estimateBreedingValue(base);
    expect(ratio).toBeCloseTo(1.5, 1);
  });

  // ---------------------------------------------------------------------------
  // 21: Stallion at prime boundary age 4 (curve = 1.0)
  // ---------------------------------------------------------------------------
  it("stallion at prime boundary age 4 has curve = 1.0 (equals age 7 value)", () => {
    const at4 = createTestStallion({ age: 4 });
    const at7 = createTestStallion({ age: 7 });
    expect(estimateBreedingValue(at4)).toBe(estimateBreedingValue(at7));
  });

  // ---------------------------------------------------------------------------
  // 22: Mare at prime boundary age 3 (curve = 1.0)
  // ---------------------------------------------------------------------------
  it("mare at prime boundary age 3 has curve = 1.0 (equals age 6 value)", () => {
    const at3 = createTestMare({ age: 3 });
    const at6 = createTestMare({ age: 6 });
    expect(estimateBreedingValue(at3)).toBe(estimateBreedingValue(at6));
  });

  // ---------------------------------------------------------------------------
  // 23: Mare at prime boundary age 16 (curve = 1.0)
  // ---------------------------------------------------------------------------
  it("mare at prime boundary age 16 has curve = 1.0 (equals age 6 value)", () => {
    const at16 = createTestMare({ age: 16 });
    const at6 = createTestMare({ age: 6 });
    expect(estimateBreedingValue(at16)).toBe(estimateBreedingValue(at6));
  });

  // ---------------------------------------------------------------------------
  // 24: Stallion at age 25 (curve floor = 0.15)
  // ---------------------------------------------------------------------------
  it("stallion at age 25 has curve floor = 0.15", () => {
    const at25 = createTestStallion({ age: 25 });
    const atPrime = createTestStallion({ age: 7 });
    const ratio = estimateBreedingValue(at25) / estimateBreedingValue(atPrime);
    expect(ratio).toBeCloseTo(0.15, 1);
  });

  // ---------------------------------------------------------------------------
  // 25: Mare at age 22 (curve floor = 0.1)
  // ---------------------------------------------------------------------------
  it("mare at age 22 has curve floor = 0.1", () => {
    const at22 = createTestMare({ age: 22 });
    const atPrime = createTestMare({ age: 6 });
    const ratio = estimateBreedingValue(at22) / estimateBreedingValue(atPrime);
    expect(ratio).toBeCloseTo(0.1, 1);
  });

  // ---------------------------------------------------------------------------
  // 26: Stallion at stud with standingFee=0 falls to projected path
  // ---------------------------------------------------------------------------
  it("stallion at stud with standingFee=0 uses projected path (not capitalization)", () => {
    const studZeroFee = createTestStallion({
      age: 5,
      stud: {
        atStud: true,
        standingFee: 0,
        bookSize: 100,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
      },
    });
    const projected = createTestStallion({ age: 5 });
    // With standingFee=0, the capitalization branch produces 0, so it falls
    // through to the projected path (same as a stallion without stud career)
    expect(estimateBreedingValue(studZeroFee)).toBe(estimateBreedingValue(projected));
  });

  // ---------------------------------------------------------------------------
  // 27: Stallion at stud with bookSize=0 defaults to 100
  // ---------------------------------------------------------------------------
  it("stallion at stud with bookSize=0 defaults bookSize to 100", () => {
    const studZeroBook = createTestStallion({
      age: 5,
      stud: {
        atStud: true,
        standingFee: 50000,
        bookSize: 0,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
      },
    });
    const stud100Book = createTestStallion({
      age: 5,
      stud: {
        atStud: true,
        standingFee: 50000,
        bookSize: 100,
        seasonBookings: 0,
        lifetimeFoals: 0,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
      },
    });
    expect(estimateBreedingValue(studZeroBook)).toBe(estimateBreedingValue(stud100Book));
  });

  // ---------------------------------------------------------------------------
  // 28: Stallion age 1 (curve = 0.3, minimum pre-prime)
  // ---------------------------------------------------------------------------
  it("stallion age 1 has minimum pre-prime curve (0.3) but value > 0", () => {
    const at1 = createTestStallion({ age: 1 });
    const atPrime = createTestStallion({ age: 7 });
    const ratio = estimateBreedingValue(at1) / estimateBreedingValue(atPrime);
    expect(ratio).toBeCloseTo(0.3, 1);
    expect(estimateBreedingValue(at1)).toBeGreaterThan(0);
  });
});
