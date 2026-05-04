import { describe, it, expect } from "vitest";
import {
  findHorseByName,
  getSireByName,
  getDamByName,
  getRandomHorseFromEra,
  getRandomSire,
  getRandomDam,
} from "./pedigreeData";

describe("pedigreeData utilities", () => {
  describe("findHorseByName", () => {
    it("should find a horse with an exact name match", () => {
      const horse = findHorseByName("Northern Dancer");
      expect(horse).toBeDefined();
      expect(horse?.name).toBe("Northern Dancer");
    });

    it("should find a horse with case-insensitive name match", () => {
      const horse = findHorseByName("northern dancer");
      expect(horse).toBeDefined();
      expect(horse?.name).toBe("Northern Dancer");
    });

    it("should return undefined for a non-existent horse name", () => {
      const horse = findHorseByName("Non-Existent Horse");
      expect(horse).toBeUndefined();
    });
  });

  describe("getSireByName", () => {
    it("should return the correct sire for a known horse", () => {
      const sire = getSireByName("Northern Dancer");
      expect(sire).toBe("Nearctic");
    });

    it("should return undefined for a horse with no sire property (e.g., foundation sire)", () => {
      const sire = getSireByName("Byerley Turk");
      expect(sire).toBeUndefined();
    });

    it("should return undefined for a non-existent horse", () => {
      const sire = getSireByName("Non-Existent Horse");
      expect(sire).toBeUndefined();
    });
  });

  describe("getDamByName", () => {
    it("should return the correct dam for a known horse", () => {
      const dam = getDamByName("Northern Dancer");
      expect(dam).toBe("Natalma");
    });

    it("should return 'unknown' for a horse with 'unknown' dam listed in dataset", () => {
      const dam = getDamByName("Sir Charles");
      expect(dam).toBe("unknown");
    });

    it("should return undefined for a non-existent horse", () => {
      const dam = getDamByName("Non-Existent Horse");
      expect(dam).toBeUndefined();
    });
  });

  describe("getRandomHorseFromEra", () => {
    it("should return a horse from the requested era (foundation)", () => {
      const horse = getRandomHorseFromEra("foundation");
      expect(horse).toBeDefined();
      expect(horse?.era).toBe("foundation");
    });

    it("should return a horse from the requested era (modern)", () => {
      const horse = getRandomHorseFromEra("modern");
      expect(horse).toBeDefined();
      expect(horse?.era).toBe("modern");
    });

    it("should return undefined for an era with no horses", () => {
      // @ts-expect-error - testing invalid era
      const horse = getRandomHorseFromEra("non-existent-era");
      expect(horse).toBeUndefined();
    });
  });

  describe("getRandomSire", () => {
    it("should return a horse that is a potential sire", () => {
      const sire = getRandomSire();
      expect(sire).toBeDefined();
      // A potential sire in this dataset is one with a sire property OR from foundation era
      const isSire = sire?.sire !== undefined || sire?.era === "foundation";
      expect(isSire).toBe(true);
    });
  });

  describe("getRandomDam", () => {
    it("should return a horse that has a dam defined", () => {
      const dam = getRandomDam();
      expect(dam).toBeDefined();
      expect(dam?.dam).toBeDefined();
    });
  });
});
