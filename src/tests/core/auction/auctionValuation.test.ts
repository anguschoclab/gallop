import { describe, it, expect } from "vitest";
import { calculateLotValuation } from "@/core/auction/auctionValuation";
import { createTestHorse, createTestStable } from "@/tests/helpers";

describe("calculateLotValuation", () => {
  it("applies personality multipliers correctly for aggressive vs conservative", () => {
    const horse = createTestHorse({ id: "1", name: "Test Horse", gender: "stallion", age: 3 });
    const aggressiveStable = createTestStable({ id: "stable-1", personality: "aggressive" });
    const aggressiveVal = calculateLotValuation(horse, aggressiveStable, "racing_age");

    const conservativeStable = createTestStable({ id: "stable-2", personality: "conservative" });
    const conservativeVal = calculateLotValuation(horse, conservativeStable, "racing_age");

    expect(aggressiveVal).toBeGreaterThan(conservativeVal);
  });

  it("boosts valuation for young horses if stable prefers youth", () => {
    const developerStable = createTestStable({ id: "dev", personality: "developer" });
    const horse = createTestHorse({ id: "2", name: "Youngster", age: 1 });

    const yearlingVal = calculateLotValuation(horse, developerStable, "yearling");
    const racingAgeVal = calculateLotValuation(horse, developerStable, "racing_age");

    expect(yearlingVal).toBeGreaterThan(racingAgeVal);
  });

  it("gives prestige valuation boost based on horse fame", () => {
    const prestigeStable = createTestStable({ id: "prestige", personality: "prestige" });

    // We expect calculateLotValuation to boost value if horse.fame > 30 and racing_age
    const unknownHorse = createTestHorse({ id: "3", name: "Unknown", fame: 0, age: 3 });
    const famousHorse = createTestHorse({
      id: "4",
      name: "Famous",
      fame: 80,
      age: 3,
      fanCount: 100,
    });

    // Explicitly providing the stat fields needed to avoid NaN from calculateNpcHorseValue
    unknownHorse.stats = { speed: 50, stamina: 50, acceleration: 50, consistency: 50 } as any;
    famousHorse.stats = { speed: 50, stamina: 50, acceleration: 50, consistency: 50 } as any;

    const unknownVal = calculateLotValuation(unknownHorse, prestigeStable, "racing_age");
    const famousVal = calculateLotValuation(famousHorse, prestigeStable, "racing_age");

    expect(famousVal).toBeGreaterThan(unknownVal);
  });

  it("gives breeder valuation boost for broodmares and blue hens", () => {
    const breederStable = createTestStable({ id: "breeder", personality: "breeder" });
    const stallion = createTestHorse({ id: "5", gender: "stallion", age: 5 });
    const normalMare = createTestHorse({ id: "6", gender: "mare", damName: "Some Dam", age: 5 });
    const blueHenMare = createTestHorse({
      id: "7",
      gender: "mare",
      damName: "Some Dam",
      age: 5,
      blueHenStatus: { isBlueHen: true, status: "proven", points: 100 },
    });

    const stallionVal = calculateLotValuation(stallion, breederStable, "broodmare");
    const normalMareVal = calculateLotValuation(normalMare, breederStable, "broodmare");
    const blueHenVal = calculateLotValuation(blueHenMare, breederStable, "broodmare");

    expect(normalMareVal).toBeGreaterThan(stallionVal);
    expect(blueHenVal).toBeGreaterThan(normalMareVal);
  });

  it("boosts valuation for high conformation and temperament stats", () => {
    const stable = createTestStable({ id: "normal", personality: "win-now" });
    const averageHorse = createTestHorse({
      id: "8",
      age: 3,
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        conformation: 50,
        temperament: 50,
      } as any,
    });
    averageHorse.conformation = 50;
    averageHorse.temperament = 50;

    const perfectHorse = createTestHorse({
      id: "9",
      age: 3,
      stats: {
        speed: 50,
        stamina: 50,
        acceleration: 50,
        consistency: 50,
        conformation: 95,
        temperament: 95,
      } as any,
    });
    perfectHorse.conformation = 95;
    perfectHorse.temperament = 95;

    const avgVal = calculateLotValuation(averageHorse, stable, "racing_age");
    const perfectVal = calculateLotValuation(perfectHorse, stable, "racing_age");

    expect(perfectVal).toBeGreaterThan(avgVal);
  });
});
