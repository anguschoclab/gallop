import { describe, it, expect } from "vitest";
import { computePedigreeFounderInfluence } from "@/core/history/lineageCrawler";
import { PedigreeNode } from "@/core/breeding/types";

describe("lineageCrawler", () => {
  describe("computePedigreeFounderInfluence", () => {
    it("should calculate 50% influence for parents without further pedigree", () => {
      const tree: PedigreeNode = {
        name: "Foal",
        generation: 0,
        sireName: "Sire",
        damName: "Dam",
      };

      const result = computePedigreeFounderInfluence(tree);
      expect(result.get("Sire")?.influence).toBe(0.5);
      expect(result.get("Dam")?.influence).toBe(0.5);
    });

    it("should calculate 25% influence for grandparents", () => {
      const tree: PedigreeNode = {
        name: "Foal",
        generation: 0,
        sirePedigree: {
          name: "Sire",
          generation: 1,
          sireName: "Paternal Grandsire",
          damName: "Paternal Granddam",
        },
        damPedigree: {
          name: "Dam",
          generation: 1,
          sireName: "Maternal Grandsire",
          damName: "Maternal Granddam",
        },
      };

      const result = computePedigreeFounderInfluence(tree);
      expect(result.get("Paternal Grandsire")?.influence).toBe(0.25);
      expect(result.get("Paternal Granddam")?.influence).toBe(0.25);
      expect(result.get("Maternal Grandsire")?.influence).toBe(0.25);
      expect(result.get("Maternal Granddam")?.influence).toBe(0.25);
    });

    it("should accumulate influence correctly for inbreeding (same founder multiple times)", () => {
      const tree: PedigreeNode = {
        name: "Inbred Foal",
        generation: 0,
        sirePedigree: {
          name: "Sire",
          generation: 1,
          sireName: "Common Ancestor",
          damName: "Unrelated Dam 1",
        },
        damPedigree: {
          name: "Dam",
          generation: 1,
          sireName: "Common Ancestor",
          damName: "Unrelated Dam 2",
        },
      };

      const result = computePedigreeFounderInfluence(tree);
      // Appears twice as a grandparent: 0.25 + 0.25 = 0.50
      expect(result.get("Common Ancestor")?.influence).toBe(0.5);
      expect(result.get("Unrelated Dam 1")?.influence).toBe(0.25);
      expect(result.get("Unrelated Dam 2")?.influence).toBe(0.25);
    });

    it("should handle mixed depths and missing parent names gracefully", () => {
      const tree: PedigreeNode = {
        name: "Foal",
        generation: 0,
        sirePedigree: {
          name: "Sire",
          generation: 1,
          // Sire has no parents at all (is a founder himself)
        },
        damPedigree: {
          name: "Dam",
          generation: 1,
          sirePedigree: {
            name: "Maternal Grandsire",
            generation: 2,
            sireName: "Great Grandsire", // 0.125
            // Missing dam
          },
          // Dam's dam is missing completely
        },
      };

      const result = computePedigreeFounderInfluence(tree);
      expect(result.get("Sire")?.influence).toBe(0.5);
      expect(result.get("Great Grandsire")?.influence).toBe(0.125);
      expect(result.has("Dam")).toBe(false);
      expect(result.has("Maternal Grandsire")).toBe(false);
    });
  });
});
