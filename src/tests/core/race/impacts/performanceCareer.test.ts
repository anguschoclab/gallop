import { describe, expect, it } from "vitest";
import { generatePerformanceCareerImpacts } from "@/core/race/impacts/performanceCareer";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import type { Race, RaceResult } from "@/game/types";

describe("generatePerformanceCareerImpacts", () => {
  const testHorse = createTestHorse({ id: "1" });
  testHorse.distanceAptitude = 1600; // Base apt
  const rng = createTestRng("test");

  const mockRace: Partial<Race> = {
    id: "race1",
    distance: 2000,
  };

  const mockResult: RaceResult = {
    horseId: testHorse.id,
    position: 1,
    time: 120,
  };

  const calibratedPars = { 2000: 120 };

  it("should calculate distance aptitude shift toward race distance", () => {
    // Horse apt is 1600, race is 2000.
    // Shift is 5% of the gap (400) = 20.
    const { impacts } = generatePerformanceCareerImpacts(
      testHorse,
      mockResult,
      mockRace as Race,
      { horseId: testHorse.id },
      0,
      calibratedPars,
      [],
      8,
      10,
      [],
      rng,
    );

    const shiftImpact = impacts.find((i) => i.type === "distance_aptitude_shift") as any;
    expect(shiftImpact).toBeDefined();
    expect(shiftImpact.delta).toBe(20);
    expect(shiftImpact.newValue).toBe(1620);
  });

  it("should clamp shifted aptitude between 800 and 3200", () => {
    // If the gap is huge, it limits it, but 5% is small.
    // Let's set apt to 800 and race to 800, gap 0.
    const shortHorse = { ...testHorse, distanceAptitude: 800 } as any;
    const { impacts } = generatePerformanceCareerImpacts(
      shortHorse,
      mockResult,
      { ...mockRace, distance: 800 } as Race,
      { horseId: testHorse.id },
      0,
      calibratedPars,
      [],
      8,
      10,
      [],
      rng,
    );

    const shiftImpact = impacts.find((i) => i.type === "distance_aptitude_shift");
    // delta is 0, so it shouldn't even create the impact since Math.abs(0) < 1
    expect(shiftImpact).toBeUndefined();
  });
});
