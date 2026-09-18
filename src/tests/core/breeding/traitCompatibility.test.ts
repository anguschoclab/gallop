import { describe, it, expect } from "vitest";
import { calculateConformationCompatibility, calculateTemperamentCompatibility } from "@/core/breeding/traitCompatibility";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("traitCompatibility", () => {
  describe("calculateConformationCompatibility", () => {
    it("calculates correctly using string traits", () => {
      const sire = createTestHorse({ conformation: "excellent" } as any);
      const dam = createTestHorse({ conformation: "good" } as any);
      const result = calculateConformationCompatibility(sire, dam);
      expect(result.score).toBe((1.0 + 0.75) / 2);
      expect(result.description).toBe("Excellent conformation on both sides");
    });

    it("calculates correctly using numeric traits > 1 (e.g. 80)", () => {
      const sire = createTestHorse({ conformation: 80 } as any);
      const dam = createTestHorse({ conformation: 60 } as any);
      const result = calculateConformationCompatibility(sire, dam);
      expect(result.score).toBe((0.8 + 0.6) / 2);
      expect(result.description).toBe("Good conformation");
    });

    it("calculates correctly using numeric traits <= 1", () => {
      const sire = createTestHorse({ conformation: 0.8 } as any);
      const dam = createTestHorse({ conformation: 0.6 } as any);
      const result = calculateConformationCompatibility(sire, dam);
      expect(result.score).toBe((0.8 + 0.6) / 2);
      expect(result.description).toBe("Good conformation");
    });

    it("falls back to fair when trait is undefined", () => {
      const sire = createTestHorse(); // default doesn't override explicitly if we delete
      delete sire.conformation;
      const dam = createTestHorse();
      delete dam.conformation;
      const result = calculateConformationCompatibility(sire, dam);
      expect(result.score).toBe(0.5);
      expect(result.description).toBe("Fair conformation");
    });

    it("flags poor conformation", () => {
      const sire = createTestHorse({ conformation: "poor" } as any);
      const dam = createTestHorse({ conformation: "poor" } as any);
      const result = calculateConformationCompatibility(sire, dam);
      expect(result.score).toBe(0.25);
      expect(result.description).toBe("Poor conformation - risk factor");
    });
  });

  describe("calculateTemperamentCompatibility", () => {
    it("calculates correctly using string traits", () => {
      const sire = createTestHorse({ temperament: "excellent" } as any);
      const dam = createTestHorse({ temperament: "poor" } as any);
      const result = calculateTemperamentCompatibility(sire, dam);
      expect(result.score).toBe((1.0 + 0.25) / 2);
      expect(result.description).toBe("Good temperament");
    });

    it("calculates correctly using numeric traits", () => {
      const sire = createTestHorse({ temperament: 75 } as any);
      const dam = createTestHorse({ temperament: 0.75 } as any);
      const result = calculateTemperamentCompatibility(sire, dam);
      expect(result.score).toBe(0.75);
      expect(result.description).toBe("Good temperament");
    });

    it("falls back to fair when trait is undefined", () => {
      const sire = createTestHorse();
      delete sire.temperament;
      const dam = createTestHorse();
      delete dam.temperament;
      const result = calculateTemperamentCompatibility(sire, dam);
      expect(result.score).toBe(0.5);
      expect(result.description).toBe("Fair temperament");
    });

    it("flags poor temperament", () => {
      const sire = createTestHorse({ temperament: "poor" } as any);
      const dam = createTestHorse({ temperament: "poor" } as any);
      const result = calculateTemperamentCompatibility(sire, dam);
      expect(result.score).toBe(0.25);
      expect(result.description).toBe("Poor temperament - may affect performance");
    });
  });
});
