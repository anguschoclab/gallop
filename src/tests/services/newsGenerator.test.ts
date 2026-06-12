import { describe, it, expect } from "vitest";
import { generateRaceNews } from "@/services/narrative/newsGenerator";
import { createTestHorse, createTestRng } from "@/tests/helpers";
import type { Race, Horse } from "@/game/types";

describe("newsGenerator", () => {
  it("should generate news for a G1 win", () => {
    const originalRandom = Math.random;
    Math.random = () => 0; // Always pick the first headline

    const race = {
      id: "race-1",
      name: "Kentucky Derby",
      graded: {
        key: "ky-derby",
        grade: "G1",
        track: "Churchill Downs",
        trackId: "churchill-downs",
        surface: "Dirt",
      },
      raceClass: "Stakes",
      day: 10,
      distance: 2000,
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    } as Race;

    const horses = [createTestHorse({ id: "horse-1", name: "Secretariat" })];

    const result = [{ horseId: "horse-1", position: 1 }];

    const news = generateRaceNews(race, result, horses, 10, createTestRng());
    expect(news).not.toBeNull();
    expect(news?.importance).toBe("high");
    expect(news?.headline).toContain("Secretariat");
    expect(news?.headline).toContain("Kentucky Derby");

    Math.random = originalRandom;
  });

  it("should NOT generate news for a maiden race", () => {
    const race = {
      id: "race-2",
      name: "Maiden Special Weight",
      raceClass: "Maiden",
      day: 10,
      distance: 2000,
      entryFee: 500,
      purse: 10000,
      minStat: 70,
      fieldSize: 8,
      entries: [],
      resolved: false,
    } as Race;

    const horses = [createTestHorse({ id: "horse-2", name: "Slow Joe" })];

    const result = [{ horseId: "horse-2", position: 1 }];

    const news = generateRaceNews(race, result, horses, 10, createTestRng());
    expect(news).toBeNull();
  });
});
