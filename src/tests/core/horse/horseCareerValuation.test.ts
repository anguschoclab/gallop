import { describe, it, expect } from "vitest";
import {
  horseCareerValuation,
  horsePriceWithPedigree,
  estimateBreedingValue,
  horseMarketValue,
} from "@/core/horse/pricing";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import { calculateOverallRating } from "@/core/horse/stats";
import {
  createTestColt,
  createTestStallion,
  createTestMare,
  createTestGelding,
  createTestFilly,
} from "@/tests/helpers/createTestHorse";

describe("horseCareerValuation", () => {
  // ---------------------------------------------------------------------------
  // 1: racing === horsePriceWithPedigree
  // ---------------------------------------------------------------------------
  it("racing field equals horsePriceWithPedigree", () => {
    const colt = createTestColt({ age: 3 });
    const v = horseCareerValuation(colt, [colt]);
    expect(v.racing).toBe(horsePriceWithPedigree(colt, [colt]));
  });

  // ---------------------------------------------------------------------------
  // 2: breeding === estimateBreedingValue
  // ---------------------------------------------------------------------------
  it("breeding field equals estimateBreedingValue", () => {
    const stallion = createTestStallion({ age: 5 });
    const v = horseCareerValuation(stallion, [stallion]);
    expect(v.breeding).toBe(estimateBreedingValue(stallion, [stallion]));
  });

  // ---------------------------------------------------------------------------
  // 3: current === horseMarketValue
  // ---------------------------------------------------------------------------
  it("current field equals horseMarketValue", () => {
    const mare = createTestMare({ age: 6 });
    const v = horseCareerValuation(mare, [mare]);
    expect(v.current).toBe(horseMarketValue(mare, [mare]));
  });

  // ---------------------------------------------------------------------------
  // 4: preCareer > 0 for non-gelding
  // ---------------------------------------------------------------------------
  it("preCareer is positive for non-gelding colt", () => {
    const colt = createTestColt({ age: 3 });
    expect(horseCareerValuation(colt, [colt]).preCareer).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 5: postCareer > 0 for non-gelding
  // ---------------------------------------------------------------------------
  it("postCareer is positive for non-gelding stallion", () => {
    const stallion = createTestStallion({ age: 5 });
    expect(horseCareerValuation(stallion, [stallion]).postCareer).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 6: postCareer === round(racing * 0.1 / 100) * 100 for gelding (after BUG-2 fix)
  // ---------------------------------------------------------------------------
  it("gelding postCareer is 10% of racing value rounded to 100 (salvage)", () => {
    const gelding = createTestGelding({ age: 5 });
    const v = horseCareerValuation(gelding, [gelding]);
    const expected = Math.round((v.racing * 0.1) / 100) * 100;
    expect(v.postCareer).toBe(expected);
  });

  // ---------------------------------------------------------------------------
  // 7: postCareer is a multiple of 100 for non-geldings
  // ---------------------------------------------------------------------------
  it("postCareer is a multiple of 100 for non-geldings", () => {
    const horses = [
      createTestColt({ age: 3 }),
      createTestStallion({ age: 5 }),
      createTestMare({ age: 6 }),
      createTestFilly({ age: 3 }),
    ];
    for (const h of horses) {
      const v = horseCareerValuation(h, [h]);
      expect(v.postCareer % 100).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 8: preCareer includes breeding upside for non-gelding
  // ---------------------------------------------------------------------------
  it("preCareer includes breeding upside for non-gelding (preCareer > yearlingRacing-only)", () => {
    const colt = createTestColt({ age: 3 });
    const v = horseCareerValuation(colt, [colt]);
    const overall = calculateOverallRating(colt);
    const potMod = 0.5 + (colt.potential ?? 50) / 100;
    const pedMul = pedigreeMultiplier({ ...colt, age: 1 }, { horses: { [colt.id]: colt } });
    const yearlingRacing = Math.round((overall * 80 * 1.2 * potMod) / 50) * 50;
    const yearlingPed = Math.round((yearlingRacing * pedMul) / 50) * 50;
    expect(v.preCareer).toBeGreaterThan(yearlingPed);
  });

  // ---------------------------------------------------------------------------
  // 9: preCareer is purely racing for gelding (no breeding upside)
  // ---------------------------------------------------------------------------
  it("preCareer has no breeding upside for gelding", () => {
    const gelding = createTestGelding({ age: 3 });
    const v = horseCareerValuation(gelding, [gelding]);
    const overall = calculateOverallRating(gelding);
    const potMod = 0.5 + (gelding.potential ?? 50) / 100;
    const pedMul = pedigreeMultiplier(
      { ...gelding, age: 1 },
      { horses: { [gelding.id]: gelding } },
    );
    const yearlingRacing = Math.round((overall * 80 * 1.2 * potMod) / 50) * 50;
    const yearlingPed = Math.round((yearlingRacing * pedMul) / 50) * 50;
    expect(v.preCareer).toBe(yearlingPed);
  });

  // ---------------------------------------------------------------------------
  // 10: postCareer > breeding for young horse (prime-age projection > current)
  // ---------------------------------------------------------------------------
  it("postCareer > breeding for young horse (age 2) due to prime-age projection", () => {
    const colt = createTestColt({ age: 2 });
    const v = horseCareerValuation(colt, [colt]);
    expect(v.postCareer).toBeGreaterThan(v.breeding);
  });

  // ---------------------------------------------------------------------------
  // 11: postCareer uses age 7 for stallions
  // ---------------------------------------------------------------------------
  it("postCareer for stallion equals estimateBreedingValue at age 7 (rounded to 100)", () => {
    const stallion = createTestStallion({ age: 5 });
    const v = horseCareerValuation(stallion, [stallion]);
    const projected =
      Math.round(estimateBreedingValue({ ...stallion, age: 7 }, [stallion]) / 100) * 100;
    expect(v.postCareer).toBe(projected);
  });

  // ---------------------------------------------------------------------------
  // 12: postCareer uses age 6 for mares
  // ---------------------------------------------------------------------------
  it("postCareer for mare equals estimateBreedingValue at age 6 (rounded to 100)", () => {
    const mare = createTestMare({ age: 8 });
    const v = horseCareerValuation(mare, [mare]);
    const projected = Math.round(estimateBreedingValue({ ...mare, age: 6 }, [mare]) / 100) * 100;
    expect(v.postCareer).toBe(projected);
  });

  // ---------------------------------------------------------------------------
  // 13: postCareer uses age 6 for fillies
  // ---------------------------------------------------------------------------
  it("postCareer for filly equals estimateBreedingValue at age 6 (rounded to 100)", () => {
    const filly = createTestFilly({ age: 3 });
    const v = horseCareerValuation(filly, [filly]);
    const projected = Math.round(estimateBreedingValue({ ...filly, age: 6 }, [filly]) / 100) * 100;
    expect(v.postCareer).toBe(projected);
  });

  // ---------------------------------------------------------------------------
  // 14: preCareer uses yearling pedigree weight (age 1), not current age
  // ---------------------------------------------------------------------------
  it("preCareer uses yearling pedigree weight (age 1) regardless of current age", () => {
    const sire = createTestStallion({
      id: "sire",
      stud: {
        atStud: true,
        standingFee: 200000,
        bookSize: 150,
        seasonBookings: 0,
        lifetimeFoals: 20,
        lifetimeStakesFoals: 5,
        lifetimeG1Foals: 2,
      },
    });
    const dam = createTestMare({
      id: "dam",
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 3,
        group1WinnersProduced: 1,
        blueHenScore: 80,
        foalsProduced: 5,
      },
    });
    const colt = createTestColt({
      id: "c",
      age: 5,
      pedigree: {
        name: "Colt",
        generation: 0,
        sireId: "sire",
        damId: "dam",
        sireName: "Sire",
        damName: "Dam",
      },
    });
    const allHorses = [sire, dam, colt];
    const v = horseCareerValuation(colt, allHorses);

    const overall = calculateOverallRating(colt);
    const potMod = 0.5 + (colt.potential ?? 50) / 100;
    const yearlingPedMul = pedigreeMultiplier(
      { ...colt, age: 1 },
      { horses: Object.fromEntries(allHorses.map((h) => [h.id, h])) },
    );
    const yearlingRacing = Math.round((overall * 80 * 1.2 * potMod) / 50) * 50;
    const yearlingPed = Math.round((yearlingRacing * yearlingPedMul) / 50) * 50;
    const breedingUpside = Math.round(estimateBreedingValue({ ...colt, age: 5 }, allHorses) * 0.25);
    const expectedPreCareer = Math.round((yearlingPed + breedingUpside) / 50) * 50;
    expect(v.preCareer).toBe(expectedPreCareer);
  });
});
