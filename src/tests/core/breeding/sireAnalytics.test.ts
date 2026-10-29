import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateAei,
  calculateProgenyWinPercentage,
  classifyStallion,
  generateSireNarrative,
} from "@/domains/breeding/simulation/sireAnalytics";
import { clearLineageCache } from "@/domains/breeding/simulation/lineage";
import { createTestHorse } from "@/tests/helpers";
import type { Horse } from "@/platform/game/types";

describe("sireAnalytics", () => {
  beforeEach(() => {
    clearLineageCache();
  });
  afterEach(() => {
    clearLineageCache();
  });

  function mkStallion(
    id: string,
    lifetimeFoals: number,
    lifetimeStakesFoals: number,
    atStud: boolean = true,
  ): Horse {
    return createTestHorse({
      id,
      gender: "Stallion",
      stud: {
        atStud,
        standingFee: 5000,
        lifetimeFoals,
        lifetimeStakesFoals,
        lifetimeG1Foals: 0,
        bookSize: 100,
        seasonBookings: 0,
      },
    } as any);
  }

  function mkFoal(id: string, sireId: string, age: number, earnings: number): Horse {
    return createTestHorse({
      id,
      age,
      pedigree: { sireId, damId: "dam1" },
      raceHistory:
        earnings > 0
          ? [
              {
                raceId: "race1",
                raceName: "Race",
                date: "2024-01-01",
                name: "Race",
                purse: earnings,
                purseEarned: earnings,
                distance: 1200,
                surface: "Dirt",
                raceClass: "Maiden",
                fieldSize: 10,
                position: 1,
                condition: 100,
              },
            ]
          : [],
    } as any);
  }

  describe("calculateAei", () => {
    it("returns 0 if no lifetimeFoals", () => {
      const stallion = createTestHorse({
        gender: "Stallion",
        stud: {
          atStud: true,
          standingFee: 5000,
          bookSize: 100,
          seasonBookings: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          lifetimeFoals: 0,
        },
      } as any);
      expect(calculateAei(stallion, [stallion], 1000)).toBe(0);
    });

    it("returns 0 if no runners (age >= 2 with races)", () => {
      const stallion = mkStallion("s1", 1, 0);
      const foal = mkFoal("f1", "s1", 1, 0); // Age 1, no races
      expect(calculateAei(stallion, [stallion, foal], 1000)).toBe(0);
    });

    it("returns 0 if industry mean is 0", () => {
      const stallion = mkStallion("s1", 1, 0);
      const foal = mkFoal("f1", "s1", 2, 5000); // Earner
      expect(calculateAei(stallion, [stallion, foal], 0)).toBe(0);
    });

    it("calculates AEI correctly", () => {
      const stallion = mkStallion("s1", 2, 0);
      const f1 = mkFoal("f1", "s1", 3, 10000); // 10k
      const f2 = mkFoal("f2", "s1", 2, 20000); // 20k
      // Avg progeny earnings = 15k. Mean = 10k. 15k / 10k * 100 = 150
      expect(calculateAei(stallion, [stallion, f1, f2], 10000)).toBe(150);
    });
  });

  describe("calculateProgenyWinPercentage", () => {
    it("returns 0 if no lifetimeFoals", () => {
      const stallion = createTestHorse({
        gender: "Stallion",
        stud: {
          atStud: true,
          standingFee: 5000,
          bookSize: 100,
          seasonBookings: 0,
          lifetimeStakesFoals: 0,
          lifetimeG1Foals: 0,
          lifetimeFoals: 0,
        },
      } as any);
      expect(calculateProgenyWinPercentage(stallion)).toBe(0);
    });

    it("calculates percentage correctly based on stakes winners", () => {
      const stallion = mkStallion("s1", 20, 5); // 5 / 20 = 25%
      expect(calculateProgenyWinPercentage(stallion)).toBe(25);
    });
  });

  describe("classifyStallion", () => {
    it("returns unproven if not at stud", () => {
      const stallion = mkStallion("s1", 1, 0, false);
      expect(classifyStallion(stallion, [stallion])).toBe("unproven");
    });

    it("returns unproven if no racing age foals", () => {
      const stallion = mkStallion("s1", 1, 0);
      const foal = mkFoal("f1", "s1", 1, 0);
      expect(classifyStallion(stallion, [stallion, foal])).toBe("unproven");
    });

    it("returns freshman if oldest foal is <= 3", () => {
      const stallion = mkStallion("s1", 1, 0);
      const foal = mkFoal("f1", "s1", 3, 0);
      expect(classifyStallion(stallion, [stallion, foal])).toBe("freshman");
    });

    it("returns second-crop if oldest foal is 4", () => {
      const stallion = mkStallion("s1", 1, 0);
      const foal = mkFoal("f1", "s1", 4, 0);
      expect(classifyStallion(stallion, [stallion, foal])).toBe("second-crop");
    });

    it("returns established if oldest foal is >= 5", () => {
      const stallion = mkStallion("s1", 1, 0);
      const foal = mkFoal("f1", "s1", 5, 0);
      expect(classifyStallion(stallion, [stallion, foal])).toBe("established");
    });
  });

  describe("generateSireNarrative", () => {
    it("returns hottest freshman sire narrative if tier is freshman and stakesFoals >= 2", () => {
      const stallion = mkStallion("s1", 10, 2);
      const f1 = mkFoal("f1", "s1", 3, 10000);
      expect(generateSireNarrative(stallion, [stallion, f1], 1000)).toBe(
        "Hottest freshman sire: 2 stakes winners from his first crop."
      );
    });

    it("returns quiet freshman narrative if tier is freshman and stakesFoals < 2", () => {
      const stallion = mkStallion("s2", 10, 1);
      const f1 = mkFoal("f1", "s2", 3, 10000);
      expect(generateSireNarrative(stallion, [stallion, f1], 1000)).toBe(
        "Quietly intriguing freshman sire — first crop hitting the track now."
      );
    });

    it("returns proven G1 producer narrative for 3+ G1 foals", () => {
      const stallion = createTestHorse({
        id: "s3",
        gender: "Stallion",
        stud: { atStud: true, standingFee: 20000, lifetimeFoals: 20, lifetimeStakesFoals: 5, lifetimeG1Foals: 3, bookSize: 100, seasonBookings: 0 }
      } as any);
      const f1 = mkFoal("f1", "s3", 5, 10000); // age 5 -> established
      expect(generateSireNarrative(stallion, [stallion, f1], 1000)).toBe(
        "Proven Group 1 producer — 3 elite winners and counting."
      );
    });

    it("returns value narrative for fee <= 5000 and 2+ stakes winners", () => {
      const stallion = createTestHorse({
        id: "s4",
        gender: "Stallion",
        stud: { atStud: true, standingFee: 4000, lifetimeFoals: 20, lifetimeStakesFoals: 2, lifetimeG1Foals: 0, bookSize: 100, seasonBookings: 0 }
      } as any);
      const f1 = mkFoal("f1", "s4", 5, 10000); // age 5 -> established
      expect(generateSireNarrative(stallion, [stallion, f1], 1000)).toBe(
        "Best value under $5k — outperforming his fee 2× over."
      );
    });

    it("returns default narrative for established sire", () => {
      const stallion = mkStallion("s5", 20, 1); // fee 5000
      const f1 = mkFoal("f1", "s5", 5, 10000);
      // AEI is calculated based on industryMeanEarnings.
      // f1 earnings = 10000. mean = 1000. avg progeny earnings = 10000. AEI = 1000.0 (multiplier in calculation)
      expect(generateSireNarrative(stallion, [stallion, f1], 1000)).toBe(
        "20 lifetime foals; 1 stakes winners; AEI 1000.0."
      );
    });
  });
});
