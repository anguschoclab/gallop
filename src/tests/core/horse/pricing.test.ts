import { describe, it, expect, vi } from "vitest";
import {
  calculateBaseHorseValue,
  calculateNpcHorseValue,
  getStudFee,
  getBroodmareFee,
  horsePrice,
  horsePriceWithPedigree,
} from "@/core/horse/pricing";
import { createTestHorse } from "@/tests/helpers";
import type { StableTier } from "@/game/types";

// Helper to quickly create a test horse for pricing
function createPricingHorse(overrides: any = {}) {
  return createTestHorse({
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      consistency: 50,
      conformation: 50,
      temperament: 50,
    },
    age: 4,
    fame: 0,
    potential: 50,
    injuryProneness: 0.05,
    gender: "colt",
    ...overrides,
  });
}

describe("calculateBaseHorseValue", () => {
  it("calculates value for young, low fame, low tier horse", () => {
    // Overall 50, age 3 (young, 1.3), fame 0 (1.0), tier low (1.0)
    // 50 * 100 * 1.3 * 1.0 * 1.0 = 6500
    const horse = createPricingHorse({ age: 3 });
    const val = calculateBaseHorseValue(horse, "low" as StableTier);
    expect(val).toBe(6500);
  });

  it("calculates value for prime age horse", () => {
    // Overall 50, age 4 (prime, 0.9), fame 0, tier low
    // 50 * 100 * 0.9 * 1.0 * 1.0 = 4500
    const horse = createPricingHorse({ age: 4 });
    const val = calculateBaseHorseValue(horse, "low" as StableTier);
    expect(val).toBe(4500);
  });

  it("calculates value for old age horse", () => {
    // Overall 50, age 7 (old, 0.5), fame 0, tier low
    // 50 * 100 * 0.5 * 1.0 * 1.0 = 2500
    const horse = createPricingHorse({ age: 7 });
    const val = calculateBaseHorseValue(horse, "low" as StableTier);
    expect(val).toBe(2500);
  });

  it("scales with fame", () => {
    // Overall 50, age 4 (0.9), fame 200 (1 + 200/200 = 2.0), tier low
    // 50 * 100 * 0.9 * 2.0 * 1.0 = 9000
    const horse = createPricingHorse({ age: 4, fame: 200 });
    const val = calculateBaseHorseValue(horse, "low" as StableTier);
    expect(val).toBe(9000);
  });

  it("scales with tier", () => {
    // Overall 50, age 4 (0.9), fame 0, tier elite (1.5)
    // 50 * 100 * 0.9 * 1.0 * 1.5 = 6750, rounded to 100 => 6800
    const horse = createPricingHorse({ age: 4 });
    const val = calculateBaseHorseValue(horse, "elite" as StableTier);
    expect(val).toBe(6800);
  });
});

describe("calculateNpcHorseValue", () => {
  it("aliases calculateBaseHorseValue", () => {
    const horse = createPricingHorse();
    expect(calculateNpcHorseValue(horse, "mid")).toBe(calculateBaseHorseValue(horse, "mid"));
  });
});

describe("getStudFee", () => {
  it("returns 0 for mares/fillies/geldings", () => {
    const mare = createPricingHorse({ gender: "mare" });
    const gelding = createPricingHorse({ gender: "gelding" });
    expect(getStudFee(mare, { tier: "low" })).toBe(0);
    expect(getStudFee(gelding, { tier: "low" })).toBe(0);
  });

  it("returns 0 for colts under age 4", () => {
    const colt = createPricingHorse({ gender: "colt", age: 3 });
    expect(getStudFee(colt, { tier: "low" })).toBe(0);
  });

  it("calculates fee for stallions age 4+", () => {
    const stallion = createPricingHorse({ gender: "horse", age: 4 });
    // fee should equal npc horse value
    expect(getStudFee(stallion, { tier: "low" })).toBe(calculateNpcHorseValue(stallion, "low"));
  });
});

describe("getBroodmareFee", () => {
  it("returns 0 for colts/stallions/geldings", () => {
    const colt = createPricingHorse({ gender: "colt" });
    const gelding = createPricingHorse({ gender: "gelding" });
    expect(getBroodmareFee(colt, { tier: "low" })).toBe(0);
    expect(getBroodmareFee(gelding, { tier: "low" })).toBe(0);
  });

  it("returns 0 for fillies under age 3", () => {
    const filly = createPricingHorse({ gender: "filly", age: 2 });
    expect(getBroodmareFee(filly, { tier: "low" })).toBe(0);
  });

  it("calculates fee for mares age 3+ at 30% of base value", () => {
    const mare = createPricingHorse({ gender: "mare", age: 3 });
    const expected = Math.round(calculateNpcHorseValue(mare, "low") * 0.3);
    expect(getBroodmareFee(mare, { tier: "low" })).toBe(expected);
  });
});

describe("horsePrice", () => {
  it("calculates basic market price", () => {
    // overall: 50
    // age 4 (mod: 1)
    // pot: 50 (mod: 0.5 + 50/100 = 1.0)
    // bio: 1.0
    // 50 * 80 * 1 * 1 * 1 = 4000
    const horse = createPricingHorse({ age: 4, potential: 50 });
    expect(horsePrice(horse)).toBe(4000);
  });

  it("adjusts for young/old ages", () => {
    // young age 2 (mod: 1.2) => 50 * 80 * 1.2 * 1 * 1 = 4800
    const young = createPricingHorse({ age: 2, potential: 50 });
    expect(horsePrice(young)).toBe(4800);

    // old age 6 (retirement threshold, mod: 0.7) => 50 * 80 * 0.7 * 1 * 1 = 2800
    const old = createPricingHorse({ age: 6, potential: 50 });
    expect(horsePrice(old)).toBe(2800);
  });

  it("adjusts for high and low conformation/temperament", () => {
    // +0.05 + 0.05 = bio 1.1
    // 50 * 80 * 1 * 1 * 1.1 = 4400
    const greatBio = createPricingHorse({
      age: 4,
      potential: 50,
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50, conformation: 95, temperament: 95 }
    });
    expect(horsePrice(greatBio)).toBe(4400);

    // -0.1 - 0.1 = bio 0.8
    // 50 * 80 * 1 * 1 * 0.8 = 3200
    const badBio = createPricingHorse({
      age: 4,
      potential: 50,
      stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50, conformation: 20, temperament: 20 }
    });
    expect(horsePrice(badBio)).toBe(3200);
  });

  it("adjusts for injury proneness extremes", () => {
    // proneness 0.02 (low) => +0.15 bio = 1.15
    // 50 * 80 * 1 * 1 * 1.15 = 4600
    const durable = createPricingHorse({ age: 4, potential: 50, injuryProneness: 0.02 });
    expect(horsePrice(durable)).toBe(4600);

    // proneness 0.10 (high) => -0.2 bio = 0.8
    // 50 * 80 * 1 * 1 * 0.8 = 3200
    const fragile = createPricingHorse({ age: 4, potential: 50, injuryProneness: 0.10 });
    expect(horsePrice(fragile)).toBe(3200);
  });
});

describe("horsePriceWithPedigree", () => {
  it("multiplies the base price with pedigreeMultiplier and rounds to nearest 50", () => {
    // Base is 4000
    const horse = createPricingHorse({ age: 4, potential: 50 });
    const allHorses: any[] = [];

    // We expect the default pedigree multiplier when no pedigree is set to be 1
    // So price should be 4000
    expect(horsePriceWithPedigree(horse, allHorses)).toBe(4000);
  });
});
