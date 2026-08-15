import { describe, it, expect } from "vitest";
import {
  calculateBaseHorseValue,
  calculateNpcHorseValue,
  getStudFee,
  getBroodmareFee,
  horsePrice,
  horsePriceWithPedigree,
  estimateBreedingValue,
  horseMarketValue,
  horseCareerValuation,
} from "@/core/horse/pricing";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";
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
    injuryProneness: (INJURY_PRONENESS_LOW_THRESHOLD + INJURY_PRONENESS_HIGH_THRESHOLD) / 2,
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

      const youngVal = calculateBaseHorseValue(hYoung, "budget");
      const midVal = calculateBaseHorseValue(hMid, "budget");
      const oldVal = calculateBaseHorseValue(hOld, "budget");

      expect(youngVal).toBeGreaterThan(midVal);
      expect(oldVal).toBeLessThan(midVal);
    });

    it("scales with fame", () => {
      const h = getBaseHorse();
      const baseVal = calculateBaseHorseValue(h, "budget");

      const hFame = getBaseHorse();
      hFame.fame = 200;
      const fameVal = calculateBaseHorseValue(hFame, "budget");

      expect(fameVal).toBeGreaterThan(baseVal);
    });

    it("scales with stable tier", () => {
      const h = getBaseHorse();
      const lowVal = calculateBaseHorseValue(h, "budget");
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

    it("returns 0 for geldings", () => {
      const h = getBaseHorse();
      h.gender = "gelding";
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

  describe("fan count valuation", () => {
    it("calculateBaseHorseValue increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.fanCount = 0;
      const baseVal = calculateBaseHorseValue(h, "budget");

      const hFans = getBaseHorse();
      hFans.fanCount = 100000;
      const fanVal = calculateBaseHorseValue(hFans, "budget");

      expect(fanVal).toBeGreaterThan(baseVal);
    });

    it("calculateBaseHorseValue with fanCount 100000 produces higher value than fanCount 0", () => {
      const h0 = getBaseHorse();
      h0.fanCount = 0;
      const h100k = getBaseHorse();
      h100k.fanCount = 100000;

      expect(calculateBaseHorseValue(h100k, "elite")).toBeGreaterThan(
        calculateBaseHorseValue(h0, "elite"),
      );
    });

    it("horsePrice increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.fanCount = 0;
      const basePrice = horsePrice(h);

      const hFans = getBaseHorse();
      hFans.fanCount = 100000;
      const fanPrice = horsePrice(hFans);

      expect(fanPrice).toBeGreaterThan(basePrice);
    });

    it("estimateBreedingValue increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.gender = "colt";
      h.age = 5;
      h.fanCount = 0;
      const baseVal = estimateBreedingValue(h, [h]);

      const hFans = getBaseHorse();
      hFans.gender = "colt";
      hFans.age = 5;
      hFans.fanCount = 200000;
      const fanVal = estimateBreedingValue(hFans, [hFans]);

      expect(fanVal).toBeGreaterThan(baseVal);
    });

    it("horseMarketValue increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.fanCount = 0;
      const baseVal = horseMarketValue(h, [h]);

      const hFans = getBaseHorse();
      hFans.fanCount = 100000;
      const fanVal = horseMarketValue(hFans, [hFans]);

      expect(fanVal).toBeGreaterThan(baseVal);
    });

    it("horseCareerValuation.current increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.fanCount = 0;
      const baseVal = horseCareerValuation(h, [h]);

      const hFans = getBaseHorse();
      hFans.fanCount = 100000;
      const fanVal = horseCareerValuation(hFans, [hFans]);

      expect(fanVal.current).toBeGreaterThan(baseVal.current);
    });

    it("horseCareerValuation.racing increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.fanCount = 0;
      const baseVal = horseCareerValuation(h, [h]);

      const hFans = getBaseHorse();
      hFans.fanCount = 100000;
      const fanVal = horseCareerValuation(hFans, [hFans]);

      expect(fanVal.racing).toBeGreaterThan(baseVal.racing);
    });

    it("horseCareerValuation.breeding increases when fanCount > 0", () => {
      const h = getBaseHorse();
      h.gender = "colt";
      h.age = 5;
      h.fanCount = 0;
      const baseVal = horseCareerValuation(h, [h]);

      const hFans = getBaseHorse();
      hFans.gender = "colt";
      hFans.age = 5;
      hFans.fanCount = 200000;
      const fanVal = horseCareerValuation(hFans, [hFans]);

      expect(fanVal.breeding).toBeGreaterThan(baseVal.breeding);
    });

    it("existing fame scaling test still passes with fanCount 0", () => {
      const h = getBaseHorse();
      h.fanCount = 0;
      const baseVal = calculateBaseHorseValue(h, "budget");

      const hFame = getBaseHorse();
      hFame.fanCount = 0;
      hFame.fame = 200;
      const fameVal = calculateBaseHorseValue(hFame, "budget");

      expect(fameVal).toBeGreaterThan(baseVal);
    });
  });

  describe("horsePriceWithPedigree", () => {
    it("returns base price when no pedigree sire/dam IDs are set", () => {
      const horse = getBaseHorse();
      const allHorses: Horse[] = [];
      expect(horsePriceWithPedigree(horse, allHorses)).toBe(horsePrice(horse));
    });
  });
});
