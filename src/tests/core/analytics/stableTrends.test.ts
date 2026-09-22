import { describe, it, expect } from "vitest";
import { analyzeStableTrends } from "@/core/analytics/stableTrends";
import type { Horse, HorseRaceHistoryEntry } from "@/core/horse/types";

describe("analyzeStableTrends", () => {
  it("should return nulls when there is no race history", () => {
    const horses: Horse[] = [];
    const trends = analyzeStableTrends(horses);
    expect(trends.bestSurface).toBeNull();
    expect(trends.bestDistance).toBeNull();
  });

  it("should return nulls when there are fewer starts than the minimum threshold", () => {
    const history: HorseRaceHistoryEntry[] = [
      { raceId: "r1", raceName: "R1", position: 1, day: 1, surface: "Turf", distance: 1200 },
      { raceId: "r2", raceName: "R2", position: 1, day: 2, surface: "Turf", distance: 1200 },
      { raceId: "r3", raceName: "R3", position: 1, day: 3, surface: "Turf", distance: 1200 },
    ];
    const horse = { raceHistory: history } as Horse;
    const trends = analyzeStableTrends([horse], 5);
    expect(trends.bestSurface).toBeNull();
    expect(trends.bestDistance).toBeNull();
  });

  it("should correctly identify the best surface and distance with sufficient data", () => {
    const history: HorseRaceHistoryEntry[] = [
      // Turf Sprint: 4 wins / 5 starts = 80%
      { raceId: "r1", raceName: "R1", position: 1, day: 1, surface: "Turf", distance: 1000 },
      { raceId: "r2", raceName: "R2", position: 1, day: 2, surface: "turf", distance: 1200 },
      { raceId: "r3", raceName: "R3", position: 1, day: 3, surface: "Turf", distance: 1300 },
      { raceId: "r4", raceName: "R4", position: 1, day: 4, surface: "Turf", distance: 1200 },
      { raceId: "r5", raceName: "R5", position: 4, day: 5, surface: "Turf", distance: 1200 },
      // Dirt Route: 2 wins / 6 starts = 33%
      { raceId: "r6", raceName: "R6", position: 1, day: 6, surface: "Dirt", distance: 2000 },
      { raceId: "r7", raceName: "R7", position: 1, day: 7, surface: "Dirt", distance: 2000 },
      { raceId: "r8", raceName: "R8", position: 5, day: 8, surface: "Dirt", distance: 2000 },
      { raceId: "r9", raceName: "R9", position: 6, day: 9, surface: "Dirt", distance: 2000 },
      { raceId: "r10", raceName: "R10", position: 7, day: 10, surface: "Dirt", distance: 2000 },
      { raceId: "r11", raceName: "R11", position: 8, day: 11, surface: "Dirt", distance: 2000 },
    ];
    const horse = { raceHistory: history } as Horse;
    const trends = analyzeStableTrends([horse], 5);

    expect(trends.bestSurface).not.toBeNull();
    expect(trends.bestSurface?.surface).toBe("Turf");
    expect(trends.bestSurface?.starts).toBe(5);
    expect(trends.bestSurface?.wins).toBe(4);
    expect(trends.bestSurface?.winRate).toBe(0.8);

    expect(trends.bestDistance).not.toBeNull();
    expect(trends.bestDistance?.distanceCategory).toBe("Sprint (<1400m)");
    expect(trends.bestDistance?.starts).toBe(5);
    expect(trends.bestDistance?.wins).toBe(4);
    expect(trends.bestDistance?.winRate).toBe(0.8);
  });

  it("should break ties by picking the category with more starts", () => {
    const history: HorseRaceHistoryEntry[] = [
      // Turf: 5/5
      { raceId: "r1", raceName: "R1", position: 1, day: 1, surface: "Turf", distance: 1600 },
      { raceId: "r2", raceName: "R2", position: 1, day: 2, surface: "Turf", distance: 1600 },
      { raceId: "r3", raceName: "R3", position: 1, day: 3, surface: "Turf", distance: 1600 },
      { raceId: "r4", raceName: "R4", position: 1, day: 4, surface: "Turf", distance: 1600 },
      { raceId: "r5", raceName: "R5", position: 1, day: 5, surface: "Turf", distance: 1600 },
      // Dirt: 6/6
      { raceId: "r6", raceName: "R6", position: 1, day: 6, surface: "Dirt", distance: 1600 },
      { raceId: "r7", raceName: "R7", position: 1, day: 7, surface: "Dirt", distance: 1600 },
      { raceId: "r8", raceName: "R8", position: 1, day: 8, surface: "Dirt", distance: 1600 },
      { raceId: "r9", raceName: "R9", position: 1, day: 9, surface: "Dirt", distance: 1600 },
      { raceId: "r10", raceName: "R10", position: 1, day: 10, surface: "Dirt", distance: 1600 },
      { raceId: "r11", raceName: "R11", position: 1, day: 11, surface: "Dirt", distance: 1600 },
    ];
    const horse = { raceHistory: history } as Horse;
    const trends = analyzeStableTrends([horse], 5);

    expect(trends.bestSurface?.surface).toBe("Dirt");
    expect(trends.bestSurface?.winRate).toBe(1);
    expect(trends.bestSurface?.starts).toBe(6);
  });
});
