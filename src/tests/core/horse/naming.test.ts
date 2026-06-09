import { describe, it, expect } from "vitest";
import { validateHorseName } from "@/core/horse/naming/jockeyClubRules";
import { generateProceduralHorseName } from "@/core/horse/naming/nameGenerator";
import { createRng } from "@/core/common/rng";
import type { ReservedNameEntry } from "@/core/horse/naming/reservedNames";

describe("Horse Naming System", () => {
  describe("Jockey Club Rules", () => {
    const existing = new Set(["seattle slew", "affirmed"]);
    const reservedNames: ReservedNameEntry[] = [
      { name: "man o' war", deceasedOnDay: 1, releasedOnDay: 9126 }, // Reserved until day 9126
      { name: "secretariat", deceasedOnDay: 1000, releasedOnDay: 10125 }, // Reserved until day 10125
    ];

    it("should reject empty names", () => {
      expect(validateHorseName("", existing).isValid).toBe(false);
    });

    it("should reject names longer than 18 characters", () => {
      expect(
        validateHorseName("This name is definitely way too long for the jockey club", existing)
          .isValid,
      ).toBe(false);
    });

    it("should reject active duplicate names", () => {
      expect(validateHorseName("Seattle Slew", existing).isValid).toBe(false);
    });

    it("should reject reserved names (deceased within 25 years)", () => {
      // Try to use a reserved name on day 100 (within reservation period)
      const result = validateHorseName("Man o' War", existing, reservedNames, 100);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("reserved for 25 years");
    });

    it("should allow reserved names after 25-year period ends", () => {
      // Try to use a reserved name on day 10000 (after reservation period ended)
      const result = validateHorseName("Man o' War", existing, reservedNames, 10000);
      expect(result.isValid).toBe(true);
    });

    it("should reject recently deceased names (25-year reservation)", () => {
      // Secretariat died on day 1000, try on day 5000 (still reserved)
      const result = validateHorseName("Secretariat", existing, reservedNames, 5000);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("reserved for 25 years");
    });

    it("should allow deceased names after 25 years", () => {
      // Secretariat died on day 1000, try on day 11000 (after 25 years)
      const result = validateHorseName("Secretariat", existing, reservedNames, 11000);
      expect(result.isValid).toBe(true);
    });

    it("should reject offensive words", () => {
      expect(validateHorseName("Shit Name", existing).isValid).toBe(false);
    });

    it("should reject trade names", () => {
      expect(validateHorseName("Nike Runner", existing).isValid).toBe(false);
    });

    it("should reject prohibited characters", () => {
      expect(validateHorseName("Horse #1", existing).isValid).toBe(false);
      expect(validateHorseName("Horse!", existing).isValid).toBe(false);
    });

    it("should allow valid names", () => {
      expect(validateHorseName("Valid Name", existing).isValid).toBe(true);
      expect(validateHorseName("Slew o' Gold", existing).isValid).toBe(true);
      expect(validateHorseName("First-Class", existing).isValid).toBe(true);
    });
  });

  describe("Procedural Generation", () => {
    const rng = createRng(123);
    const context = {
      existingNames: new Set<string>(),
      region: "north_america" as const,
      namingTheme: "aggressive" as const,
    };

    it("should generate a name within 18 characters", () => {
      const name = generateProceduralHorseName(context, rng);
      expect(name.length).toBeGreaterThan(0);
      expect(name.length).toBeLessThanOrEqual(18);
    });

    it("should respect pedigree strategy when parent name blending is enabled", () => {
      const pedigreeContext = {
        ...context,
        sireName: "Seattle Slew",
        damName: "Gold Digger",
        parentNameBlendingEnabled: true,
      };
      const name = generateProceduralHorseName(pedigreeContext, rng, { strategy: "pedigree" });
      expect(name.toLowerCase()).toMatch(/slew|gold|digger/);
    });

    it("should fallback and NOT blend parent names when parent name blending is disabled", () => {
      const pedigreeContext = {
        ...context,
        sireName: "Seattle Slew",
        damName: "Gold Digger",
        parentNameBlendingEnabled: false,
      };
      const name = generateProceduralHorseName(pedigreeContext, rng, { strategy: "pedigree" });
      // Since blending is disabled, it should fallback to generic/thematic and not contain parents' name parts
      expect(name.toLowerCase()).not.toMatch(/slew/);
      expect(name.toLowerCase()).not.toMatch(/digger/);
    });

    it("should respect thematic strategy", () => {
      const name = generateProceduralHorseName(context, rng, { strategy: "thematic" });
      // Aggressive theme patterns often include "Surge", "Storm", "Force", "Bold"
      expect(name.toLowerCase()).toMatch(/surge|storm|force|bold/);
    });

    it("should respect regional strategy", () => {
      const name = generateProceduralHorseName(context, rng, { strategy: "regional" });
      expect(name.length).toBeGreaterThan(0);
    });

    it("should ensure uniqueness", () => {
      const active = new Set(["bold victory"]);
      const name = generateProceduralHorseName({ ...context, existingNames: active }, rng);
      expect(name.toLowerCase()).not.toBe("bold victory");
    });
  });
});
