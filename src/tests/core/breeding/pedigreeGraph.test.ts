import { describe, it, expect } from "vitest";
import { buildPedigreeGraph, getAncestorIds } from "@/domains/breeding/simulation/pedigreeGraph";
import { createTestHorse } from "@/tests/helpers";
import type { Horse } from "@/platform/game/types";

describe("pedigreeGraph", () => {
  describe("buildPedigreeGraph", () => {
    it("returns empty structure for unknown horse", () => {
      const map = new Map<string, Horse>();
      const result = buildPedigreeGraph("unknown", map, 3);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.coi).toBe(0);
    });

    it("builds a single node graph for a horse with maxGenerations 0", () => {
      const h = createTestHorse({ id: "h1", name: "Horse 1", coefficientOfInbreeding: 0.1 });
      const map = new Map<string, Horse>([["h1", h]]);
      const result = buildPedigreeGraph("h1", map, 0);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe("h1:root");
      expect(result.nodes[0].data.name).toBe("Horse 1");
      expect(result.nodes[0].data.isReal).toBe(true);
      expect(result.edges).toHaveLength(0);
      expect(result.coi).toBe(0.1);
      expect(result.coiLabel).toContain("10.0% COI");
    });

    it("generates phantom parents if horse has no parent IDs up to maxGen", () => {
      const h = createTestHorse({ id: "h1", pedigree: { name: "H1", generation: 0 } as any });
      // explicitly remove sireName/damName to force phantoms
      h.sireName = undefined as any;
      h.damName = undefined as any;
      h.sireId = undefined as any;
      h.damId = undefined;

      const map = new Map<string, Horse>([["h1", h]]);
      const result = buildPedigreeGraph("h1", map, 1);

      // Should have root + 1 sire + 1 dam
      expect(result.nodes).toHaveLength(3);
      const phantoms = result.nodes.filter(n => !n.data.isReal);
      expect(phantoms).toHaveLength(2);
      expect(result.edges).toHaveLength(2); // edges from parents to root
    });

    it("resolves named parents when IDs are missing", () => {
      const h = createTestHorse({ id: "h1", sireName: "Named Sire", damName: "Named Dam" });
      h.sireId = undefined;
      h.damId = undefined;

      const map = new Map<string, Horse>([["h1", h]]);
      const result = buildPedigreeGraph("h1", map, 1);

      const sireNode = result.nodes.find(n => n.data.name === "Named Sire");
      const damNode = result.nodes.find(n => n.data.name === "Named Dam");

      expect(sireNode).toBeDefined();
      expect(sireNode?.data.isReal).toBe(false); // They are still phantoms because they aren't in horseMap
      expect(damNode).toBeDefined();
    });

    it("walks known parent chain properly", () => {
      const sire = createTestHorse({ id: "s1", name: "Sire" });
      const dam = createTestHorse({ id: "d1", name: "Dam" });
      const h = createTestHorse({ id: "h1", name: "H1", sireId: "s1", damId: "d1" });

      const map = new Map<string, Horse>([["s1", sire], ["d1", dam], ["h1", h]]);
      const result = buildPedigreeGraph("h1", map, 1);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.every(n => n.data.isReal)).toBe(true);
      expect(result.edges).toHaveLength(2);

      // Sire to child edge
      expect(result.edges.some(e => e.source.startsWith("s1:") && e.target.startsWith("h1:"))).toBe(true);
    });

    it("calculates inbreeding styling when a horse appears multiple times", () => {
      // Root -> Sire -> Grandsire
      // Root -> Dam -> Grandsire (same horse)
      const grandsire = createTestHorse({ id: "gs1" });
      const sire = createTestHorse({ id: "s1", sireId: "gs1" });
      const dam = createTestHorse({ id: "d1", sireId: "gs1" });
      const root = createTestHorse({ id: "root", sireId: "s1", damId: "d1" });

      const map = new Map<string, Horse>([
        ["gs1", grandsire], ["s1", sire], ["d1", dam], ["root", root]
      ]);

      const result = buildPedigreeGraph("root", map, 2);

      // Verify the grandsire nodes have inbreedCount > 1 and a ringColor
      const gsNodes = result.nodes.filter(n => n.id.startsWith("gs1:"));
      expect(gsNodes.length).toBeGreaterThanOrEqual(2);
      for (const node of gsNodes) {
        expect(node.data.inbreedCount).toBeGreaterThanOrEqual(2);
        expect(node.data.ringColor).toBeDefined();
      }
    });
  });

  describe("getAncestorIds", () => {
    it("returns real ancestor IDs and excludes root and phantoms", () => {
      const grandsire = createTestHorse({ id: "gs1" });
      const sire = createTestHorse({ id: "s1", sireId: "gs1", damName: "Phantom Dam" }); // no damId
      const dam = createTestHorse({ id: "d1" }); // no parents
      const root = createTestHorse({ id: "root", sireId: "s1", damId: "d1" });

      const map = new Map<string, Horse>([
        ["gs1", grandsire], ["s1", sire], ["d1", dam], ["root", root]
      ]);

      const ancestors = getAncestorIds("root", map, 2);

      expect(ancestors.has("s1")).toBe(true);
      expect(ancestors.has("d1")).toBe(true);
      expect(ancestors.has("gs1")).toBe(true);
      expect(ancestors.has("root")).toBe(false); // excludes root
      expect(ancestors.size).toBe(3); // excludes any phantom generated for Phantom Dam
    });
  });
});
