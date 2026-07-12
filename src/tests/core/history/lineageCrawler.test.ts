import { describe, it, expect } from "vitest";
import { computePedigreeFounderInfluence, computeFounderInfluence } from "@/core/history/lineageCrawler";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { PedigreeNode } from "@/core/breeding/types";

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

  describe("computeFounderInfluence", () => {
    it("returns zero descendant count for a horse with no children", () => {
      const founder = createTestHorse({ id: "f1", name: "Founder" });
      const result = computeFounderInfluence(founder, [founder], 100);
      expect(result.descendantCount).toBe(0);
      expect(result.generationDepth).toBe(0);
      expect(result.horseId).toBe("f1");
      expect(result.name).toBe("Founder");
    });

    it("finds direct children as descendants", () => {
      const founder = createTestHorse({ id: "f1", name: "Founder" });
      const child = createTestHorse({
        id: "c1",
        name: "Child",
        pedigree: { name: "Child", generation: 1, sireId: "f1", sireName: "Founder", damName: "Dam" },
      });
      const result = computeFounderInfluence(founder, [founder, child], 100);
      expect(result.descendantCount).toBe(1);
      expect(result.generationDepth).toBe(1);
    });

    it("traverses multiple generations correctly", () => {
      const founder = createTestHorse({ id: "f1", name: "Founder" });
      const child = createTestHorse({
        id: "c1",
        name: "Child",
        pedigree: { name: "Child", generation: 1, sireId: "f1", sireName: "Founder", damName: "Dam" },
      });
      const grandchild = createTestHorse({
        id: "g1",
        name: "Grandchild",
        pedigree: { name: "Grandchild", generation: 2, sireId: "c1", sireName: "Child", damName: "Dam2" },
      });
      const result = computeFounderInfluence(founder, [founder, child, grandchild], 100);
      expect(result.descendantCount).toBe(2);
      expect(result.generationDepth).toBe(2);
    });

    it("produces identical results with and without horseMap/parentToChildrenMap", () => {
      const founder = createTestHorse({ id: "f1", name: "Founder" });
      const child = createTestHorse({
        id: "c1",
        name: "Child",
        pedigree: { name: "Child", generation: 1, sireId: "f1", sireName: "Founder", damName: "Dam" },
      });
      const allHorses = [founder, child];

      const withoutMaps = computeFounderInfluence(founder, allHorses, 100);

      const horseMap = new Map(allHorses.map((h) => [h.id, h]));
      const parentToChildrenMap = new Map<string, string[]>();
      for (const h of allHorses) {
        if (h.pedigree?.sireId) {
          const arr = parentToChildrenMap.get(h.pedigree.sireId) || [];
          arr.push(h.id);
          parentToChildrenMap.set(h.pedigree.sireId, arr);
        }
      }
      const withMaps = computeFounderInfluence(founder, allHorses, 100, horseMap, parentToChildrenMap);

      expect(withMaps).toEqual(withoutMaps);
    });

    it("accumulates earnings and stakes wins correctly", () => {
      const founder = createTestHorse({ id: "f1", name: "Founder" });
      const child = createTestHorse({
        id: "c1",
        name: "Child",
        lifetimeEarnings: 50000,
        careerWins: 5,
        raceHistory: [
          { raceId: "r1", raceName: "Test Race", day: 1, position: 1, grade: "G1", beyer: 90, surface: "Turf", distance: 1600, purse: 30000, purseEarned: 30000 },
        ],
        pedigree: { name: "Child", generation: 1, sireId: "f1", sireName: "Founder", damName: "Dam" },
      });
      const result = computeFounderInfluence(founder, [founder, child], 100);
      expect(result.totalEarnings).toBeGreaterThan(0);
      expect(result.stakesWinners).toBeGreaterThanOrEqual(1);
      expect(result.g1Winners).toBeGreaterThanOrEqual(1);
    });
  });
});
