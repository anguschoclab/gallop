import { describe, it, expect } from "vitest";
import {
  BREEDING_PERSONALITIES,
  SINGLE_FEE_CAP_FRACTION,
  MIN_MARE_OVERALL,
  MAX_COI,
  scoreStallion,
} from "@/core/breeding/strategy";
import type { Stable } from "@/game/types";
import { createTestHorse, createTestStable } from "@/tests/helpers";

const ALL_PERSONALITIES: Stable["personality"][] = [
  "breeder",
  "developer",
  "prestige",
  "specialist",
  "aggressive",
  "conservative",
  "win-now",
  "trader",
];

describe("BREEDING_PERSONALITIES", () => {
  it("includes all 8 personalities", () => {
    expect(BREEDING_PERSONALITIES).toHaveLength(8);
    for (const p of ALL_PERSONALITIES) {
      expect(BREEDING_PERSONALITIES).toContain(p);
    }
  });
});

describe("SINGLE_FEE_CAP_FRACTION", () => {
  it("has non-zero values for all 8 personalities", () => {
    for (const p of ALL_PERSONALITIES) {
      expect(SINGLE_FEE_CAP_FRACTION[p]).toBeGreaterThan(0);
    }
  });
});

describe("MIN_MARE_OVERALL", () => {
  it("has non-zero values for all 8 personalities", () => {
    for (const p of ALL_PERSONALITIES) {
      expect(MIN_MARE_OVERALL[p]).toBeGreaterThan(0);
    }
  });
});

describe("MAX_COI", () => {
  it("is < 1 for all 8 personalities", () => {
    for (const p of ALL_PERSONALITIES) {
      expect(MAX_COI[p]).toBeLessThan(1);
    }
  });
});

describe("scoreStallion — differentiated strategies", () => {
  it("produces different scores for different personalities with same input", () => {
    const stallion = createTestHorse({
      id: "stallion-1",
      name: "Test Stallion",
      age: 8,
      gender: "horse",
      stats: {
        speed: 80,
        stamina: 80,
        acceleration: 80,
        consistency: 80,
        temperament: 50,
        conformation: 50,
      },
      distanceAptitude: 2000,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
      stud: {
        atStud: true,
        standingFee: 50000,
        lifetimeFoals: 100,
        lifetimeStakesFoals: 10,
        lifetimeG1Foals: 2,
        bookSize: 40,
        seasonBookings: 20,
      },
    });
    const mare = createTestHorse({
      id: "mare-1",
      name: "Test Mare",
      age: 5,
      gender: "mare",
      stats: {
        speed: 70,
        stamina: 70,
        acceleration: 70,
        consistency: 70,
        temperament: 50,
        conformation: 50,
      },
      distanceAptitude: 1800,
      surfaceAptitude: { Turf: 1.0, Dirt: 1.0, Synthetic: 1.0 },
    });

    const scores = ALL_PERSONALITIES.map((p) => {
      const stable = createTestStable({ personality: p, cash: 500000 });
      return scoreStallion(stallion, mare, stable, 50000);
    });

    // At least some scores should differ (not all identical)
    const uniqueScores = new Set(scores);
    expect(uniqueScores.size).toBeGreaterThan(1);
  });
});
