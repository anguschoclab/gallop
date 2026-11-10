import { describe, it, expect } from "vitest";
import {
  calculateLotValuation,
  npcBaseValuation,
} from "@/domains/auction/simulation/auctionValuation";
import type { Horse, Stable } from "@/platform/game/types";

describe("Auction Valuation Engine", () => {
  const createBaseHorse = (overrides?: Partial<Horse>): Horse =>
    ({
      id: "h1",
      name: "Test",
      gender: "stallion",
      conformation: 50,
      temperament: 50,
      stats: {
        conformation: 50,
        temperament: 50,
        speed: 50,
        stamina: 50,
        acceleration: 50,
        heart: 50,
        consistency: 50,
      },
      potential: 50,
      age: 3,
      distanceAptitude: 1600,
      fame: 0,
      fanCount: 0,
      birthYear: 2020,
      coatColor: "bay",
      energy: 100,
      fitness: 100,
      condition: 100,
      careerStarts: 0,
      careerWins: 0,
      careerEarnings: 0,
      ...overrides,
    }) as Horse;

  const createBaseStable = (overrides?: Partial<Stable>): Stable =>
    ({
      id: "s1",
      name: "Test Stable",
      tier: "mid",
      personality: "aggressive",
      preferredDistance: 1600,
      ...overrides,
    }) as Stable;

  it("calculates base npc valuation tracking tier", () => {
    const horse = createBaseHorse();
    const budgetStable = createBaseStable({ tier: "budget" });
    const midStable = createBaseStable({ tier: "mid" });
    const eliteStable = createBaseStable({ tier: "elite" });

    const budgetVal = npcBaseValuation(horse, budgetStable);
    const midVal = npcBaseValuation(horse, midStable);
    const eliteVal = npcBaseValuation(horse, eliteStable);

    expect(midVal).toBeGreaterThan(budgetVal);
    expect(eliteVal).toBeGreaterThan(midVal);
  });

  describe("Personality Strategies", () => {
    it("applies win-now premium to racing age horses", () => {
      const horse = createBaseHorse();
      const stable = createBaseStable({ personality: "win-now" });

      const baseVal = npcBaseValuation(horse, stable);
      const lotVal = calculateLotValuation(horse, stable, "racing_age");

      // WIN-NOW pays premium for racing age
      expect(lotVal).toBeGreaterThan(baseVal);
    });

    it("applies breeder premium for fillies/mares", () => {
      const colt = createBaseHorse({ gender: "colt" });
      const filly = createBaseHorse({ gender: "filly" });
      const stable = createBaseStable({ personality: "breeder" });

      const coltVal = calculateLotValuation(colt, stable, "yearling");
      const fillyVal = calculateLotValuation(filly, stable, "yearling");

      expect(fillyVal).toBeGreaterThan(coltVal);
    });

    it("applies specialist distance matching", () => {
      const horseA = createBaseHorse({ distanceAptitude: 1600 });
      const horseB = createBaseHorse({ distanceAptitude: 2400 });
      const stable = createBaseStable({ personality: "specialist", preferredDistance: 1600 });

      const valA = calculateLotValuation(horseA, stable, "racing_age");
      const valB = calculateLotValuation(horseB, stable, "racing_age");

      expect(valA).toBeGreaterThan(valB);
    });

    it("applies prestige fame premium", () => {
      const nobody = createBaseHorse({ fame: 0, fanCount: 0 });
      const superstar = createBaseHorse({ fame: 100, fanCount: 20000 });
      const stable = createBaseStable({ personality: "prestige" });

      const nobodyVal = calculateLotValuation(nobody, stable, "racing_age");
      const superstarVal = calculateLotValuation(superstar, stable, "racing_age");

      // Superstars with large fanbases and fame command huge premiums from prestige stables
      // We check that the superstar gets a significantly higher multiplier than the nobody.
      const nobodyMultiplier = nobodyVal / npcBaseValuation(nobody, stable);
      const superstarMultiplier = superstarVal / npcBaseValuation(superstar, stable);
      expect(superstarMultiplier).toBeGreaterThan(nobodyMultiplier);
    });
  });
});
