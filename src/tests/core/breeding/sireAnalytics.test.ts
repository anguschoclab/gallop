import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateAei,
  calculateProgenyWinPercentage,
  classifyStallion,
} from "@/core/breeding/sireAnalytics";
import { clearLineageCache } from "@/core/breeding/lineage";
import { createTestHorse } from "@/tests/helpers";
import type { Horse } from "@/game/types";

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
});
