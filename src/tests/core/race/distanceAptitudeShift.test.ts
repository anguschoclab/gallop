import { describe, it, expect } from "vitest";
import { generatePerformanceCareerImpacts } from "@/core/race/impacts";
import { createTestColt } from "@/tests/helpers/createTestHorse";
import type { Race } from "@/game/types";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 100,
    distance: 1600,
    raceClass: "open",
    entryFee: 0,
    purse: 50_000,
    fieldSize: 8,
    entries: [],
    resolved: true,
    trackId: "track-1",
    ...overrides,
  } as Race;
}

describe("distance_aptitude_shift impact generation", () => {
  it("emits shift when race distance differs from aptitude", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 1600 });
    const race = makeRace({ distance: 2400 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shift).toBeDefined();
    expect(shift.delta).toBeGreaterThan(0);
    expect(shift.newValue).toBeGreaterThan(1600);
  });

  it("does not emit shift when race distance matches aptitude", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 1600 });
    const race = makeRace({ distance: 1600 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    expect(impacts.find((i) => i.type === "distance_aptitude_shift")).toBeUndefined();
  });

  it("clamps newValue to 800 minimum", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 810 });
    const race = makeRace({ distance: 200 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shift).toBeDefined();
    expect(shift.newValue).toBeGreaterThanOrEqual(800);
  });

  it("clamps newValue to 3200 maximum", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 3190 });
    const race = makeRace({ distance: 6400 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shift).toBeDefined();
    expect(shift.newValue).toBeLessThanOrEqual(3200);
  });

  it("includes scaling fields on the impact", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 1600 });
    const race = makeRace({ distance: 2400 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shift).toBeDefined();
    expect(shift.distanceMod).toBeDefined();
    expect(shift.distanceStaminaMul).toBeDefined();
    expect(shift.preferredDistance).toBeDefined();
    expect(shift.distanceRatio).toBeDefined();
    expect(shift.distanceDeviation).toBeDefined();
  });

  it("scaling fields match computeDistanceScaling output", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 1600 });
    const race = makeRace({ distance: 3200 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shift.distanceMod).toBeCloseTo(0.92, 10);
    expect(shift.distanceStaminaMul).toBeCloseTo(1.2, 10);
  });

  it("emits negative delta for shorter race than preferred", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 2000 });
    const race = makeRace({ distance: 1200 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shift).toBeDefined();
    expect(shift.delta).toBeLessThan(0);
    expect(shift.newValue).toBeLessThan(2000);
  });

  it("applies 5% gap formula correctly", () => {
    const horse = createTestColt({ id: "h1", distanceAptitude: 1600 });
    const race = makeRace({ distance: 2600 });
    const { impacts } = generatePerformanceCareerImpacts(
      horse,
      { horseId: "h1", position: 1, time: 120 },
      race,
      undefined,
      0,
      {},
      [],
      1,
      100,
      [],
    );
    const shift = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    const expectedShifted = 1600 + (2600 - 1600) * 0.05;
    expect(shift.delta).toBeCloseTo(expectedShifted - 1600, 5);
    expect(shift.newValue).toBeCloseTo(expectedShifted, 5);
  });
});
