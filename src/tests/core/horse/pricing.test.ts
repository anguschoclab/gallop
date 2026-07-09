import { describe, it, expect } from "vitest";
import {
  calculateBaseHorseValue,
  calculateNpcHorseValue,
  getStudFee,
  getBroodmareFee,
  horsePrice,
} from "@/core/horse/pricing";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import {
  AGE_YOUNG_THRESHOLD,
  AGE_OLD_THRESHOLD,
  AGE_RETIREMENT_THRESHOLD,
  INJURY_PRONENESS_LOW_THRESHOLD,
  INJURY_PRONENESS_HIGH_THRESHOLD,
} from "@/constants";

function getBaseHorse() {
  return createTestHorse({
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      consistency: 50,
      conformation: 50,
      temperament: 50,
    },
    potential: 50,
    injuryProneness: 0.05,
    fame: 0,
    age: 5,
  });
}

describe("pricing and valuation", () => {
  describe("calculateBaseHorseValue", () => {
    it("applies young and old age modifiers correctly", () => {
      const hYoung = getBaseHorse();
      hYoung.age = AGE_YOUNG_THRESHOLD;
      const hMid = getBaseHorse();
      hMid.age = AGE_YOUNG_THRESHOLD + 1;
      const hOld = getBaseHorse();
      hOld.age = AGE_OLD_THRESHOLD;

      const youngVal = calculateBaseHorseValue(hYoung, "low");
      const midVal = calculateBaseHorseValue(hMid, "low");
      const oldVal = calculateBaseHorseValue(hOld, "low");

      expect(youngVal).toBeGreaterThan(midVal);
      expect(oldVal).toBeLessThan(midVal);
    });

    it("scales with fame", () => {
      const h = getBaseHorse();
      const baseVal = calculateBaseHorseValue(h, "low");

      const hFame = getBaseHorse();
      hFame.fame = 200;
      const fameVal = calculateBaseHorseValue(hFame, "low");

      expect(fameVal).toBeGreaterThan(baseVal);
    });

    it("scales with stable tier", () => {
      const h = getBaseHorse();
      const lowVal = calculateBaseHorseValue(h, "low");
      const midVal = calculateBaseHorseValue(h, "mid");
      const eliteVal = calculateBaseHorseValue(h, "elite");

      expect(midVal).toBeGreaterThan(lowVal);
      expect(eliteVal).toBeGreaterThan(midVal);
    });
  });

  describe("calculateNpcHorseValue", () => {
    it("matches calculateBaseHorseValue", () => {
      const h = getBaseHorse();
      expect(calculateNpcHorseValue(h, "elite")).toBe(calculateBaseHorseValue(h, "elite"));
    });
  });

  describe("getStudFee", () => {
    it("returns 0 for mares/fillies", () => {
      const h = getBaseHorse();
      h.gender = "mare";
      expect(getStudFee(h, { tier: "elite" })).toBe(0);
      h.gender = "filly";
      expect(getStudFee(h, { tier: "elite" })).toBe(0);
    });

    it("returns 0 for horses under age 4", () => {
      const h = getBaseHorse();
      h.gender = "colt";
      h.age = 3;
      expect(getStudFee(h, { tier: "elite" })).toBe(0);
    });

    it("returns non-zero for eligible stallions/colts", () => {
      const h = getBaseHorse();
      h.gender = "colt";
      h.age = 4;
      expect(getStudFee(h, { tier: "elite" })).toBeGreaterThan(0);
      h.gender = "horse";
      h.age = 5;
      expect(getStudFee(h, { tier: "elite" })).toBeGreaterThan(0);
    });
  });

  describe("getBroodmareFee", () => {
    it("returns 0 for colts/horses/geldings", () => {
      const h = getBaseHorse();
      h.gender = "colt";
      expect(getBroodmareFee(h, { tier: "elite" })).toBe(0);
      h.gender = "horse";
      expect(getBroodmareFee(h, { tier: "elite" })).toBe(0);
      h.gender = "gelding";
      expect(getBroodmareFee(h, { tier: "elite" })).toBe(0);
    });

    it("returns 0 for horses under age 3", () => {
      const h = getBaseHorse();
      h.gender = "filly";
      h.age = 2;
      expect(getBroodmareFee(h, { tier: "elite" })).toBe(0);
    });

    it("returns correct value for eligible mares/fillies", () => {
      const h = getBaseHorse();
      h.gender = "mare";
      h.age = 4;
      const expected = Math.round(calculateNpcHorseValue(h, "elite") * 0.3);
      expect(getBroodmareFee(h, { tier: "elite" })).toBe(expected);
    });
  });

  describe("horsePrice", () => {
    it("applies young and retirement age modifiers correctly", () => {
      const hYoung = getBaseHorse();
      hYoung.age = AGE_YOUNG_THRESHOLD;
      const hMid = getBaseHorse();
      hMid.age = Math.floor((AGE_YOUNG_THRESHOLD + AGE_RETIREMENT_THRESHOLD) / 2);
      const hRet = getBaseHorse();
      hRet.age = AGE_RETIREMENT_THRESHOLD;

      const youngPrice = horsePrice(hYoung);
      const midPrice = horsePrice(hMid);
      const retPrice = horsePrice(hRet);

      expect(youngPrice).toBeGreaterThan(midPrice);
      expect(retPrice).toBeLessThan(midPrice);
    });

    it("scales with conformation and temperament", () => {
      const hBase = getBaseHorse();
      const basePrice = horsePrice(hBase);

      const hGood = getBaseHorse();
      hGood.stats.conformation = 90;
      hGood.stats.temperament = 90;
      const goodPrice = horsePrice(hGood);

      const hBad = getBaseHorse();
      hBad.stats.conformation = 30;
      hBad.stats.temperament = 30;
      const badPrice = horsePrice(hBad);

      expect(goodPrice).toBeGreaterThan(basePrice);
      expect(badPrice).toBeLessThan(basePrice);
    });

    it("scales with injuryProneness", () => {
      const hBase = getBaseHorse();
      const basePrice = horsePrice(hBase);

      const hSafe = getBaseHorse();
      hSafe.injuryProneness = INJURY_PRONENESS_LOW_THRESHOLD - 0.01;
      const safePrice = horsePrice(hSafe);

      const hRisk = getBaseHorse();
      hRisk.injuryProneness = INJURY_PRONENESS_HIGH_THRESHOLD + 0.01;
      const riskPrice = horsePrice(hRisk);

      expect(safePrice).toBeGreaterThan(basePrice);
      expect(riskPrice).toBeLessThan(basePrice);
    });
  });
});
