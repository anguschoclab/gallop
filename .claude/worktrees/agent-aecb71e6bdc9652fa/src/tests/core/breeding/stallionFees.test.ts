import { describe, it, expect } from "vitest";
import { calculateRecommendedStudFee, recalcStandingFee } from "@/core/breeding/stallions";
import type { Horse, GameState } from "@/game/types";

const mockState = {
  horses: [],
  npcStables: [],
} as unknown as GameState;

const baseHorse: Horse = {
  id: "h1",
  name: "Test Horse",
  gender: "stallion",
  age: 5,
  stats: {
    speed: 50,
    stamina: 50,
    acceleration: 50,
    consistency: 50,
    control: 50,
    balance: 50,
    spirit: 50,
    intelligence: 50,
    constitution: 50,
  },
  potential: 60,
  energy: 100,
  form: 0,
  fame: 0,
  lifetimeEarnings: 0,
  runningStyle: "balanced",
  raceHistory: [],
  owned: true,
  hemisphere: "Northern",
  silk: "#ffffff",
} as Horse;

describe("Stallion Fee Recommendation", () => {
  it("should calculate a base fee for an unproven stallion", () => {
    const fee = calculateRecommendedStudFee(baseHorse, mockState);
    // physical value = baseHorseValue / 50000 * 0.4
    // baseHorseValue for 50 stats/60 pot is around 5k-10k.
    expect(fee).toBeGreaterThanOrEqual(500);
    expect(fee).toBeLessThan(5000);
  });

  it("should increase fee for high fame and career earnings", () => {
    const legend = {
      ...baseHorse,
      fame: 90,
      raceHistory: [
        { purse: 1000000, position: 1, grade: "G1" },
        { purse: 1000000, position: 1, grade: "G1" },
      ],
    } as Horse;
    
    const lowFee = calculateRecommendedStudFee(baseHorse, mockState);
    const highFee = calculateRecommendedStudFee(legend, mockState);
    
    expect(highFee).toBeGreaterThan(lowFee);
  });

  it("should increase fee for progeny success", () => {
    const provenSire = {
      ...baseHorse,
      stud: {
        atStud: true,
        standingFee: 1000,
        bookSize: 40,
        seasonBookings: 0,
        lifetimeFoals: 50,
        lifetimeStakesFoals: 10,
        lifetimeG1Foals: 2,
      }
    } as Horse;

    const fee = calculateRecommendedStudFee(provenSire, mockState);
    expect(fee).toBeGreaterThan(5000);
  });

  it("should round to the nearest $500", () => {
    const fee = calculateRecommendedStudFee(baseHorse, mockState);
    expect(fee % 500).toBe(0);
  });

  it("should recalculate fee with new progeny success", () => {
    const sire = {
      ...baseHorse,
      stud: {
        atStud: true,
        standingFee: 1000,
        bookSize: 40,
        seasonBookings: 0,
        lifetimeFoals: 50,
        lifetimeStakesFoals: 0,
        lifetimeG1Foals: 0,
      }
    };
    
    const initialFee = calculateRecommendedStudFee(sire, mockState);
    
    const updatedSire = {
      ...sire,
      stud: {
        ...sire.stud,
        lifetimeStakesFoals: 5, // Significant stakes success!
      }
    };
    
    const newFee = recalcStandingFee(updatedSire, mockState);
    expect(newFee).toBeGreaterThan(initialFee);
  });
});
