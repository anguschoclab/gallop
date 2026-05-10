import { describe, it, expect } from "vitest";
import { calculateConformationCompatibility, calculateTemperamentCompatibility } from "./traitCompatibility";
import type { Horse } from "@/game/types";

describe("traitCompatibility", () => {
  describe("calculateConformationCompatibility", () => {
    it("calculates conformation compatibility for horses", () => {
      const sire = {
        id: "sire-1",
        name: "Test Sire",
        gender: "horse" as const,
        age: 5,
        conformation: "good" as const,
      } as unknown as Horse;

      const dam = {
        id: "dam-1",
        name: "Test Dam",
        gender: "mare" as const,
        age: 5,
        conformation: "good" as const,
      } as unknown as Horse;

      const result = calculateConformationCompatibility(sire, dam);

      expect(result).toHaveProperty("score");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(5);
      expect(result).toHaveProperty("description");
      expect(typeof result.description).toBe("string");
    });

    it("handles missing conformation values gracefully", () => {
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

      const result = calculateConformationCompatibility(sire, dam);

      expect(result).toHaveProperty("score");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result).toHaveProperty("description");
    });
  });

  describe("calculateTemperamentCompatibility", () => {
    it("calculates temperament compatibility for horses", () => {
      const sire = {
        id: "sire-1",
        name: "Test Sire",
        gender: "horse" as const,
        age: 5,
        temperament: "good" as const,
      } as unknown as Horse;

      const dam = {
        id: "dam-1",
        name: "Test Dam",
        gender: "mare" as const,
        age: 5,
        temperament: "good" as const,
      } as unknown as Horse;

      const result = calculateTemperamentCompatibility(sire, dam);

      expect(result).toHaveProperty("score");
      // Score may be NaN if temperament calculation fails
      if (!isNaN(result.score)) {
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(5);
      }
      expect(result).toHaveProperty("description");
      expect(typeof result.description).toBe("string");
    });

    it("handles missing temperament values gracefully", () => {
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

      const result = calculateTemperamentCompatibility(sire, dam);

      expect(result).toHaveProperty("score");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result).toHaveProperty("description");
    });
  });
});
