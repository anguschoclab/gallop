import { describe, it, expect } from "vitest";
import {
  rand,
  randConformation,
  randTemperament,
  randGeneticQuality,
  generateGeneticMarkers,
  rollRunningStyle,
  randomCoatColor,
  randomWeather,
  randomTrackCondition,
  randomHorseName,
  randomSilk,
  randomRaceName,
} from "./random";

describe("rand", () => {
  it("returns integer within range", () => {
    for (let i = 0; i < 100; i++) {
      const result = rand(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it("handles negative ranges", () => {
    const result = rand(-10, -1);
    expect(result).toBeGreaterThanOrEqual(-10);
    expect(result).toBeLessThanOrEqual(-1);
  });

  it("handles same min and max", () => {
    expect(rand(5, 5)).toBe(5);
  });
});

describe("randConformation", () => {
  it("returns valid conformation value", () => {
    const result = randConformation();
    expect(["excellent", "good", "fair", "poor"]).toContain(result);
  });
});

describe("randTemperament", () => {
  it("returns valid temperament value", () => {
    const result = randTemperament();
    expect(["excellent", "good", "fair", "poor"]).toContain(result);
  });
});

describe("randGeneticQuality", () => {
  it("returns valid genetic quality value", () => {
    const result = randGeneticQuality();
    expect(["excellent", "good", "fair", "poor"]).toContain(result);
  });
});

describe("generateGeneticMarkers", () => {
  it("returns genetic markers with all required properties", () => {
    const markers = generateGeneticMarkers();
    expect(markers.sensoryPerception).toBeDefined();
    expect(markers.signalTransduction).toBeDefined();
    expect(markers.immunity).toBeDefined();
    expect(markers.geneticDiversity).toBeDefined();
    expect(markers.geneticDiversity).toBeGreaterThanOrEqual(0.5);
    expect(markers.geneticDiversity).toBeLessThanOrEqual(1);
  });
});

describe("rollRunningStyle", () => {
  it("returns valid running style", () => {
    const stats = { speed: 50, stamina: 50, acceleration: 50 };
    const result = rollRunningStyle(stats);
    expect(["front-runner", "stalker", "mid-pack", "closer"]).toContain(result);
  });

  it("front-runner bias with high speed/acceleration", () => {
    const stats = { speed: 90, stamina: 30, acceleration: 90 };
    // With high early bias, should skew toward front-runner
    let frontRunnerCount = 0;
    for (let i = 0; i < 100; i++) {
      if (rollRunningStyle(stats) === "front-runner") frontRunnerCount++;
    }
    expect(frontRunnerCount).toBeGreaterThan(30); // Should be biased
  });

  it("closer bias with high stamina", () => {
    const stats = { speed: 30, stamina: 90, acceleration: 30 };
    let closerCount = 0;
    for (let i = 0; i < 100; i++) {
      if (rollRunningStyle(stats) === "closer") closerCount++;
    }
    expect(closerCount).toBeGreaterThan(30); // Should be biased
  });
});

describe("randomCoatColor", () => {
  it("returns valid coat color", () => {
    const result = randomCoatColor();
    expect(["bay", "black", "chestnut", "dark-bay", "gray", "roan", "palomino", "white"]).toContain(
      result,
    );
  });
});

describe("randomWeather", () => {
  it("returns valid weather condition", () => {
    const result = randomWeather();
    expect(["sunny", "cloudy", "rainy", "sunset", "night"]).toContain(result);
  });
});

describe("randomTrackCondition", () => {
  it("returns valid track condition", () => {
    const result = randomTrackCondition();
    expect(["fast", "good", "soft", "heavy"]).toContain(result);
  });
});

describe("randomHorseName", () => {
  it("returns non-empty string with two words", () => {
    const name = randomHorseName();
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(name.split(" ").length).toBe(2);
  });

  it("uses provided RNG when given", () => {
    const mockRng = () => 0; // Always returns first element
    const name = randomHorseName(mockRng);
    expect(name).toBe("Thunder Bullet");
  });
});

describe("randomSilk", () => {
  it("returns valid hex color", () => {
    const silk = randomSilk();
    expect(silk).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("randomRaceName", () => {
  it("returns non-empty string with two words", () => {
    const name = randomRaceName();
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
    expect(name.split(" ").length).toBe(2);
  });
});
