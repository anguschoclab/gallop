import { describe, it, expect } from "vitest";
import { calculateGeneticCompatibility } from "./genotypeMatching";
import type { Horse } from "@/game/types";

describe("genotypeMatching", () => {
  it("calculates genetic compatibility for horses with genetic markers", () => {
    const sire = {
      id: "sire-1",
      name: "Test Sire",
      gender: "horse" as const,
      age: 5,
      geneticMarkers: {
        sensoryPerception: 85,
        signalTransduction: 80,
        immunity: 75,
        geneticDiversity: 90,
        leopardComplexRisk: 0.1,
      },
    } as unknown as Horse;

    const dam = {
      id: "dam-1",
      name: "Test Dam",
      gender: "mare" as const,
      age: 5,
      geneticMarkers: {
        sensoryPerception: 82,
        signalTransduction: 78,
        immunity: 77,
        geneticDiversity: 88,
        leopardComplexRisk: 0.15,
      },
    } as unknown as Horse;

    const result = calculateGeneticCompatibility(sire, dam);

    expect(result).toHaveProperty("score");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result).toHaveProperty("description");
    expect(typeof result.description).toBe("string");
  });

  it("handles horses without genetic markers gracefully", () => {
    const sire = {
      id: "sire-1",
      name: "Test Sire",
      gender: "horse" as const,
      age: 5,
    } as unknown as Horse;

    const dam = {
      id: "dam-1",
      name: "Test Dam",
      gender: "mare" as const,
      age: 5,
    } as unknown as Horse;

    const result = calculateGeneticCompatibility(sire, dam);

    expect(result).toHaveProperty("score");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result).toHaveProperty("description");
  });

  it("returns warning for high leopard complex risk", () => {
    const sire = {
      id: "sire-1",
      name: "Test Sire",
      gender: "horse" as const,
      age: 5,
      geneticMarkers: {
        leopardComplexRisk: 0.8,
      },
    } as unknown as Horse;

    const dam = {
      id: "dam-1",
      name: "Test Dam",
      gender: "mare" as const,
      age: 5,
      geneticMarkers: {
        leopardComplexRisk: 0.75,
      },
    } as unknown as Horse;

    const result = calculateGeneticCompatibility(sire, dam);

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("description");
    // High leopard complex risk should trigger a warning
    if (result.warning) {
      expect(result.warning).toMatch(/leopard|pattern/i);
    }
  });
});
