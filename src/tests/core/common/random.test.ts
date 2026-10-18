import { describe, it, expect } from "vitest";
import { rollRunningStyle } from "@/domains/horse/simulation/stats";
import { randomSilk } from "@/domains/horse/simulation/visuals";
import { randomWeather } from "@/domains/race/simulation/environment";
import { rand } from "@/shared/common/random";
import { generateProceduralHorseName } from "@/domains/horse/simulation/naming/nameGenerator";
import { generateProceduralJockeyName } from "@/domains/jockey/simulation/proceduralNaming";
import { generateRaceName } from "@/domains/race/simulation/naming/raceNameGenerator";
import { createRng } from "@/shared/common/rng";
import type { Track } from "@/shared/data/tracks";

describe("rand", () => {
  it("returns integer within range", () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const result = rand(1, 10, rng);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });
});

describe("rollRunningStyle", () => {
  it("returns valid running style", () => {
    const stats = { speed: 50, stamina: 50, acceleration: 50 };
    const result = rollRunningStyle(stats, createRng(42));
    expect(["E", "EP", "P", "S"]).toContain(result);
  });
});

describe("randomWeather", () => {
  it("returns valid weather condition", () => {
    const result = randomWeather(createRng(42));
    expect(["sunny", "cloudy", "rainy", "sunset", "night"]).toContain(result);
  });
});

describe("Procedural Horse Naming", () => {
  it("generates valid names", () => {
    const name = generateProceduralHorseName({ existingNames: new Set() }, createRng(42));
    expect(name).toBeTruthy();
    expect(name.length).toBeLessThanOrEqual(18);
  });
});

describe("Procedural Jockey Naming", () => {
  it("generates regionalized names", () => {
    const rng = createRng(123);
    const asiaName = generateProceduralJockeyName("asia", rng);
    // Many Asian names in pool are Japanese/HK
    expect(asiaName).toBeTruthy();

    const euroName = generateProceduralJockeyName("europe", rng);
    expect(euroName).toBeTruthy();
  });
});

describe("Procedural Race Naming", () => {
  it("generates realistic names", () => {
    const mockTrack = { name: "Test Track", country: "USA" } as Track;
    const name = generateRaceName({
      track: mockTrack,
      raceClass: "Stakes",
      rng: createRng(42),
    });
    expect(name).toBeTruthy();
    expect(name).not.toBe("Stakes"); // Should be more descriptive
  });
});

describe("randomSilk", () => {
  it("returns HSL color", () => {
    const silk = randomSilk(createRng(42));
    expect(silk).toMatch(/hsl\(\d+, \d+%, \d+%\)/);
  });
});
