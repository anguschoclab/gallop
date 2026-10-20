import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateSireNarrative } from "@/domains/breeding/simulation/sireAnalyticsSummary";
import { clearLineageCache } from "@/domains/breeding/simulation/lineage";
import { createTestHorse } from "@/tests/helpers";
import type { Horse } from "@/platform/game/types";

describe("generateSireNarrative", () => {
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
    lifetimeG1Foals: number,
    standingFee: number,
    atStud: boolean = true,
  ): Horse {
    return createTestHorse({
      id,
      gender: "Stallion",
      stud: {
        atStud,
        standingFee,
        lifetimeFoals,
        lifetimeStakesFoals,
        lifetimeG1Foals,
        bookSize: 100,
        seasonBookings: 0,
      },
    } as any);
  }

  function mkFoal(
    id: string,
    sireId: string,
    age: number,
    earnings: number,
    surface: string = "Dirt",
  ): Horse {
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
                surface: surface,
                raceClass: "Maiden",
                fieldSize: 10,
                position: 1,
                condition: 100,
              },
            ]
          : [],
    } as any);
  }

  it("returns hottest freshman sire narrative", () => {
    const stallion = mkStallion("s1", 10, 2, 0, 10000);
    const foal = mkFoal("f1", "s1", 2, 5000);
    expect(generateSireNarrative(stallion, [stallion, foal], 1000)).toBe(
      "Hottest freshman sire: 2 stakes winners from his first crop.",
    );
  });

  it("returns freshman sire narrative", () => {
    const stallion = mkStallion("s1", 10, 0, 0, 10000);
    const foal = mkFoal("f1", "s1", 2, 5000);
    expect(generateSireNarrative(stallion, [stallion, foal], 1000)).toBe(
      "Quietly intriguing freshman sire — first crop hitting the track now.",
    );
  });

  it("returns proven Group 1 producer narrative", () => {
    const stallion = mkStallion("s1", 50, 10, 3, 50000);
    const foal = mkFoal("f1", "s1", 5, 50000);
    expect(generateSireNarrative(stallion, [stallion, foal], 1000)).toBe(
      "Proven Group 1 producer — 3 elite winners and counting.",
    );
  });

  it("returns 1 Group 1 winner narrative", () => {
    const stallion = mkStallion("s1", 50, 10, 1, 50000);
    const foal = mkFoal("f1", "s1", 5, 5000);
    expect(generateSireNarrative(stallion, [stallion, foal], 1000)).toMatch(
      /Has sired 1 Group 1 winner; AEI/,
    );
  });

  it("returns best value under 5k narrative", () => {
    const stallion = mkStallion("s1", 50, 2, 0, 4000);
    const foal = mkFoal("f1", "s1", 5, 5000);
    expect(generateSireNarrative(stallion, [stallion, foal], 1000)).toBe(
      "Best value under $5k — outperforming his fee 2× over.",
    );
  });

  it("returns premium fee narrative", () => {
    const stallion = mkStallion("s1", 50, 0, 0, 50000);
    const foal = mkFoal("f1", "s1", 5, 5000);
    expect(generateSireNarrative(stallion, [stallion, foal], 1000)).toBe(
      "Premium fee, modest progeny so far — keep watching.",
    );
  });

  it("returns turf specialist narrative", () => {
    const stallion = mkStallion("s1", 50, 1, 0, 10000);
    const foals = Array.from({ length: 5 }).map((_, i) => mkFoal(`f${i}`, "s1", 5, 5000, "Turf"));
    expect(generateSireNarrative(stallion, [stallion, ...foals], 1000)).toBe(
      "Turf specialist — 1 stakes winners on grass.",
    );
  });

  it("returns dirt specialist narrative", () => {
    const stallion = mkStallion("s1", 50, 1, 0, 10000);
    const foals = Array.from({ length: 5 }).map((_, i) => mkFoal(`f${i}`, "s1", 5, 5000, "Dirt"));
    expect(generateSireNarrative(stallion, [stallion, ...foals], 1000)).toBe(
      "Dirt specialist — 1 stakes winners on the main track.",
    );
  });

  it("returns second-crop watch narrative", () => {
    const stallion = mkStallion("s1", 50, 0, 0, 10000);
    const foal1 = mkFoal("f1", "s1", 4, 5000, "Dirt");
    expect(generateSireNarrative(stallion, [stallion, foal1], 1000)).toBe(
      "Second-crop watch — early progeny showed promise; this season tells the story.",
    );
  });

  it("returns established searching narrative", () => {
    const stallion = mkStallion("s1", 50, 0, 0, 10000);
    const foal1 = mkFoal("f1", "s1", 5, 5000, "Dirt");
    expect(generateSireNarrative(stallion, [stallion, foal1], 1000)).toBe(
      "Established sire still searching for his breakthrough stakes winner.",
    );
  });

  it("returns fallback narrative", () => {
    const stallion = mkStallion("s1", 50, 1, 0, 10000);
    const foal1 = mkFoal("f1", "s1", 5, 5000, "Dirt");
    const foal2 = mkFoal("f2", "s1", 5, 5000, "Turf");
    expect(generateSireNarrative(stallion, [stallion, foal1, foal2], 1000)).toMatch(
      /50 lifetime foals; 1 stakes winners; AEI/,
    );
  });
});
