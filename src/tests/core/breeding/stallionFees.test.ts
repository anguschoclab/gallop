import { describe, it, expect } from "vitest";
import { calculateRecommendedStudFee, recalcStandingFee } from "@/core/breeding/stallions";
import type { Horse, GameState } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";
import { makeGameState } from "@/tests/helpers/sampleGameState";

const mockState = makeGameState({
  horses: {},
  npcStables: [],
}) as GameState;

const baseHorse = createTestHorse({
  id: "h1",
  name: "Test Horse",
  gender: "colt",
  age: 5,
  potential: 60,
  fanCount: 0,
});

describe("Stallion Fee Recommendation", () => {
  it("should calculate a base fee for an unproven stallion", () => {
    const fee = calculateRecommendedStudFee(baseHorse, "mid");
    expect(fee).toBeGreaterThanOrEqual(500);
    expect(fee).toBeLessThan(10000);
  });

  it("should increase fee for high fame and career earnings", () => {
    const legend = createTestHorse({
      ...baseHorse,
      fame: 90,
      raceHistory: [
        { day: 1, raceId: "r1", raceName: "G1", purse: 1000000, position: 1, grade: "G1" },
        { day: 2, raceId: "r2", raceName: "G1", purse: 1000000, position: 1, grade: "G1" },
      ],
    });

    const lowFee = calculateRecommendedStudFee(baseHorse, "mid");
    const highFee = calculateRecommendedStudFee(legend, "mid");

    expect(highFee).toBeGreaterThan(lowFee);
  });

  it("should increase fee for progeny success", () => {
    const provenSire = createTestHorse({
      ...baseHorse,
      stud: {
        atStud: true,
        standingFee: 1000,
        bookSize: 40,
        seasonBookings: 0,
        lifetimeFoals: 50,
        lifetimeStakesFoals: 10,
        lifetimeG1Foals: 2,
        retiredOnDay: 1,
      },
    });

    const fee = calculateRecommendedStudFee(provenSire, "mid");
    expect(fee).toBeGreaterThan(5000);
  });

  it("should round to the nearest $500", () => {
    const fee = calculateRecommendedStudFee(baseHorse, "mid");
    expect(fee % 500).toBe(0);
  });

  it("should recalculate fee with new progeny success", () => {
    const sire = createTestHorse({
      ...baseHorse,
      stud: {
        atStud: true,
        standingFee: 1000,
        bookSize: 40,
        seasonBookings: 0,
        lifetimeFoals: 50,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
        retiredOnDay: 1,
      },
    });

    const initialFee = calculateRecommendedStudFee(sire, "mid");

    const updatedSire = createTestHorse({
      ...sire,
      stud: {
        ...sire.stud!,
        lifetimeStakesFoals: 5, // Significant stakes success!
      },
    });

    const newFee = recalcStandingFee(updatedSire, mockState.day);
    expect(newFee).toBeGreaterThan(initialFee);
  });
});
