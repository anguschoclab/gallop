/**
 * Triple Crown Detection Unit Tests
 *
 * Tests the triple crown detection logic directly without requiring full game simulation.
 */

import { describe, it, expect } from "vitest";
import { generateRaceImpacts } from "@/services/raceImpactGenerator";
import { GRADED_RACES } from "@/core/data/gradedRaces";
import type { Race, Jockey } from "@/game/types";
import { createTestColt } from "@/tests/helpers/createTestHorse";

describe("Triple Crown Detection", () => {
  it("should detect triple crown progress when horse wins a triple crown leg", () => {
    // Create a mock triple crown race (Kentucky Derby)
    const kentuckyDerby = GRADED_RACES.find((r) => r.key === "usa-kentucky-derby");
    expect(kentuckyDerby).toBeDefined();
    expect(kentuckyDerby?.triplecrownKey).toBe("usa-tc");

    const race: Race = {
      id: "race-1",
      name: kentuckyDerby?.name || "Kentucky Derby",
      day: 100,
      distance: kentuckyDerby?.distance || 2000,
      graded: {
        key: kentuckyDerby?.key || "usa-kentucky-derby",
        grade: "G1",
        triplecrownKey: "usa-tc",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Dirt",
      },
      raceClass: "Stakes",
      purse: 3000000,
      entryFee: 500,
      fieldSize: 12,
      entries: [],
      resolved: false,
    };

    // Create a horse with no triple crown history yet
    const horse = createTestColt({
      id: "horse-1",
      name: "Test Horse",
      raceHistory: [],
    });

    const horses = [horse];
    const jockeys: Jockey[] = [];

    // Simulate winning the Kentucky Derby
    const result = [{ horseId: "horse-1", position: 1, time: 120.5 }];
    const runners = [{ horseId: "horse-1" }];

    const impacts = generateRaceImpacts({
      race,
      result,
      runners,
      horses,
      jockeys,
      newDay: 100,
      stateCash: 10000,
      calibratedPars: {},
    });

    // Check that a triple crown progress impact was generated
    const tcImpact = impacts.find((i) => i.type === "triple_crown_progress");
    expect(tcImpact).toBeDefined();
    expect((tcImpact as any).horseId).toBe("horse-1");
    expect((tcImpact as any).triplecrownKey).toBe("usa-tc");
    expect((tcImpact as any).year).toBe(1); // day 100 is year 1
    expect((tcImpact as any).won).toBe(false); // Only won 1 leg so far
  });

  it("should detect triple crown winner when horse wins all three legs", () => {
    // Get the actual graded race data for Preakness and Belmont
    const preakness = GRADED_RACES.find((r) => r.key === "usa-preakness");
    const belmont = GRADED_RACES.find((r) => r.key === "usa-belmont-stakes");

    // Create a horse that has already won the first two legs
    const horse = createTestColt({
      id: "horse-1",
      name: "Test Horse",
      raceHistory: [
        {
          raceId: preakness?.key || "usa-preakness",
          raceName: preakness?.name || "Preakness Stakes",
          position: 1,
          day: 120,
          grade: "G1",
          distance: preakness?.distance || 1900,
          surface: "Dirt",
          purse: 2000000,
          fieldSize: 8,
        },
        {
          raceId: belmont?.key || "usa-belmont-stakes",
          raceName: belmont?.name || "Belmont Stakes",
          position: 1,
          day: 140,
          grade: "G1",
          distance: belmont?.distance || 2400,
          surface: "Dirt",
          purse: 2000000,
          fieldSize: 8,
        },
      ],
    });

    // Simulate winning the Kentucky Derby (third leg)
    const kentuckyDerby = GRADED_RACES.find((r) => r.key === "usa-kentucky-derby");
    const race: Race = {
      id: "kentucky-derby",
      name: kentuckyDerby?.name || "Kentucky Derby",
      day: 100,
      distance: kentuckyDerby?.distance || 2000,
      graded: {
        key: kentuckyDerby?.key || "usa-kentucky-derby",
        grade: "G1",
        triplecrownKey: "usa-tc",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Dirt",
      },
      raceClass: "Stakes",
      purse: 3000000,
      entryFee: 500,
      fieldSize: 12,
      entries: [],
      resolved: false,
    };

    const horses = [horse];
    const jockeys: Jockey[] = [];
    const result = [{ horseId: "horse-1", position: 1, time: 120.5 }];
    const runners = [{ horseId: "horse-1" }];

    const impacts = generateRaceImpacts({
      race,
      result,
      runners,
      horses,
      jockeys,
      newDay: 100,
      stateCash: 10000,
      calibratedPars: {},
    });

    const tcImpact = impacts.find((i) => i.type === "triple_crown_progress");
    expect(tcImpact).toBeDefined();
    expect((tcImpact as any).won).toBe(true); // Should be a triple crown winner
    expect((tcImpact as any).reason).toContain("Triple Crown winner");
  });

  it("should not generate triple crown impact for non-triple-crown races", () => {
    const race: Race = {
      id: "race-1",
      name: "Regular Stakes",
      day: 100,
      distance: 2000,
      graded: {
        key: "regular-stakes",
        grade: "G2",
        track: "Generic Track",
        trackId: "generic-track",
        surface: "Dirt",
      },
      raceClass: "Stakes",
      purse: 500000,
      entryFee: 200,
      fieldSize: 8,
      entries: [],
      resolved: false,
    };

    const horse = createTestColt({
      id: "horse-1",
      name: "Test Horse",
      raceHistory: [],
    });

    const horses = [horse];
    const jockeys: Jockey[] = [];
    const result = [{ horseId: "horse-1", position: 1, time: 120.5 }];
    const runners = [{ horseId: "horse-1" }];

    const impacts = generateRaceImpacts({
      race,
      result,
      runners,
      horses,
      jockeys,
      newDay: 100,
      stateCash: 10000,
      calibratedPars: {},
    });

    const tcImpact = impacts.find((i) => i.type === "triple_crown_progress");
    expect(tcImpact).toBeUndefined();
  });

  it("should not generate triple crown impact when horse doesn't win", () => {
    const kentuckyDerby = GRADED_RACES.find((r) => r.key === "usa-kentucky-derby");
    const race: Race = {
      id: "race-1",
      name: kentuckyDerby?.name || "Kentucky Derby",
      day: 100,
      distance: kentuckyDerby?.distance || 2000,
      graded: {
        key: kentuckyDerby?.key || "usa-kentucky-derby",
        grade: "G1",
        triplecrownKey: "usa-tc",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Dirt",
      },
      raceClass: "Stakes",
      purse: 3000000,
      entryFee: 500,
      fieldSize: 12,
      entries: [],
      resolved: false,
    };

    const horse = createTestColt({
      id: "horse-1",
      name: "Test Horse",
      raceHistory: [],
    });

    const horses = [horse];
    const jockeys: Jockey[] = [];
    const result = [{ horseId: "horse-1", position: 3, time: 125.5 }]; // 3rd place
    const runners = [{ horseId: "horse-1" }];

    const impacts = generateRaceImpacts({
      race,
      result,
      runners,
      horses,
      jockeys,
      newDay: 100,
      stateCash: 10000,
      calibratedPars: {},
    });

    const tcImpact = impacts.find((i) => i.type === "triple_crown_progress");
    expect(tcImpact).toBeUndefined();
  });

  it("should track all triple crown regions and triple tiaras", () => {
    const tripleCrownKeys = new Set([
      "usa-tc",
      "canada-tc",
      "uk-classics",
      "japan-tc",
      "ireland-tc",
      "france-tc",
      "italy-tc",
      "argentina-tc",
      "hongkong-tc",
      "hungary-tc",
      "japan-tiara",
      "usa-tiara",
      "canada-tiara",
      "australia-tc",
      "germany-tc",
      "brazil-tc",
      "brazil-tiara",
      "chile-tc",
    ]);
    const tcRaces = GRADED_RACES.filter((r) => r.triplecrownKey);

    // Verify all regions have races
    const foundKeys = new Set(tcRaces.map((r) => r.triplecrownKey));
    for (const key of tripleCrownKeys) {
      expect(foundKeys.has(key)).toBe(true);
    }

    // Each region should have at least 3 races (Triple Crown) or 3 races (Triple Tiara)
    for (const key of tripleCrownKeys) {
      const races = tcRaces.filter((r) => r.triplecrownKey === key);
      expect(races.length).toBeGreaterThanOrEqual(3);
    }
  });
});
