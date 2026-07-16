/**
 * pedigreePrune.test.ts — Tests for pedigree depth capping and stub expansion.
 */

import { describe, it, expect } from "vitest";
import {
  prunePedigree,
  expandPedigreeStubs,
  pedigreeDepth,
  countStubs,
  MAX_PERSISTED_PEDIGREE_DEPTH,
} from "@/core/persistence/pedigreePrune";
import type { PedigreeNode } from "@/core/breeding/types";
import type { Horse } from "@/core/horse/types";

function makeDeepPedigree(depth: number, generation: number = 0): PedigreeNode {
  if (depth <= 0) {
    return { name: `gen-${generation}`, generation };
  }
  return {
    horseId: `h-gen-${generation}`,
    name: `gen-${generation}`,
    generation,
    sireId: `sire-${generation}`,
    damId: `dam-${generation}`,
    sireName: `Sire ${generation}`,
    damName: `Dam ${generation}`,
    sirePedigree: makeDeepPedigree(depth - 1, generation + 1),
    damPedigree: makeDeepPedigree(depth - 1, generation + 1),
  };
}

describe("prunePedigree", () => {
  it("prunes a 6-generation deep pedigree to max depth", () => {
    const deep = makeDeepPedigree(6);
    expect(pedigreeDepth(deep)).toBe(6);

    const pruned = prunePedigree(deep, 4)!;
    expect(pedigreeDepth(pruned)).toBeLessThanOrEqual(4);
  });

  it("preserves sireId/damId/sireName/damName at stub level", () => {
    const deep = makeDeepPedigree(6);
    const pruned = prunePedigree(deep, 4)!;

    // Walk to depth 4 (generation 4) — should be a stub with IDs preserved
    let node = pruned;
    for (let i = 0; i < 4; i++) {
      node = node.sirePedigree!;
    }
    expect(node.isStub).toBe(true);
    expect(node.sireId).toBe(`sire-4`);
    expect(node.damId).toBe(`dam-4`);
    expect(node.sireName).toBe(`Sire 4`);
    expect(node.damName).toBe(`Dam 4`);
    expect(node.sirePedigree).toBeUndefined();
    expect(node.damPedigree).toBeUndefined();
  });

  it("does not prune a shallow pedigree", () => {
    const shallow = makeDeepPedigree(2);
    const pruned = prunePedigree(shallow, 4)!;
    expect(countStubs(pruned)).toBe(0);
    expect(pedigreeDepth(pruned)).toBe(2);
  });

  it("uses default max depth of MAX_PERSISTED_PEDIGREE_DEPTH", () => {
    const deep = makeDeepPedigree(10);
    const pruned = prunePedigree(deep)!;
    expect(pedigreeDepth(pruned)).toBeLessThanOrEqual(MAX_PERSISTED_PEDIGREE_DEPTH);
  });

  it("returns undefined for undefined input", () => {
    expect(prunePedigree(undefined)).toBeUndefined();
  });

  it("prunes at exactly maxDepth boundary (generation == maxDepth becomes stub)", () => {
    // Depth 4 means generations 0,1,2,3,4 — gen 4 should be a stub
    const deep = makeDeepPedigree(5);
    const pruned = prunePedigree(deep, 4)!;
    // Walk down the sire side to generation 4
    let node = pruned;
    for (let i = 0; i < 4; i++) {
      node = node.sirePedigree!;
    }
    expect(node.generation).toBe(4);
    expect(node.isStub).toBe(true);
    // Generation 3 should NOT be a stub
    let node3 = pruned;
    for (let i = 0; i < 3; i++) {
      node3 = node3.sirePedigree!;
    }
    expect(node3.generation).toBe(3);
    expect(node3.isStub).toBe(false);
  });

  it("stub preserves aptitudinalGroup field", () => {
    const deep: PedigreeNode = {
      horseId: "h-root",
      name: "Root",
      generation: 0,
      sireId: "s-0",
      damId: "d-0",
      sireName: "Sire 0",
      damName: "Dam 0",
      aptitudinalGroup: "router",
      sirePedigree: {
        horseId: "h-1",
        name: "Gen 1",
        generation: 1,
        sireId: "s-1",
        damId: "d-1",
        sireName: "Sire 1",
        damName: "Dam 1",
        aptitudinalGroup: "miler",
      },
    };
    const pruned = prunePedigree(deep, 1)!;
    expect(pruned.aptitudinalGroup).toBe("router");
    expect(pruned.sirePedigree?.isStub).toBe(true);
    expect(pruned.sirePedigree?.aptitudinalGroup).toBe("miler");
  });
});

describe("expandPedigreeStubs", () => {
  it("expands stubs using a horse resolver", () => {
    const deep = makeDeepPedigree(6);
    const pruned = prunePedigree(deep, 4)!;
    expect(countStubs(pruned)).toBeGreaterThan(0);

    // Resolver: return a horse with a 2-deep pedigree for any ID
    const resolveHorse = (id: string): Horse | undefined => {
      if (!id.startsWith("h-gen-")) return undefined;
      const gen = parseInt(id.split("-")[2]);
      if (gen <= 0) return undefined;
      return {
        id,
        pedigree: makeDeepPedigree(2, gen),
      } as Horse;
    };

    const expanded = expandPedigreeStubs(pruned, resolveHorse)!;
    // Stubs should be replaced (count may not be zero if deeper stubs are created
    // from the replacement pedigree, but the original stubs should be gone)
    expect(countStubs(expanded)).toBeLessThan(countStubs(pruned));
  });

  it("returns stub as-is when horse cannot be resolved", () => {
    const deep = makeDeepPedigree(6);
    const pruned = prunePedigree(deep, 4)!;
    const stubCountBefore = countStubs(pruned);

    const resolveHorse = (): Horse | undefined => undefined;
    const expanded = expandPedigreeStubs(pruned, resolveHorse)!;

    expect(countStubs(expanded)).toBe(stubCountBefore);
  });

  it("returns undefined for undefined input", () => {
    expect(expandPedigreeStubs(undefined, () => undefined)).toBeUndefined();
  });

  it("respects maxExpandDepth=0 safety limit", () => {
    const deep = makeDeepPedigree(6);
    const pruned = prunePedigree(deep, 4)!;
    const stubCountBefore = countStubs(pruned);

    const resolveHorse = (id: string): Horse | undefined => {
      if (!id.startsWith("h-gen-")) return undefined;
      const gen = parseInt(id.split("-")[2]);
      if (gen <= 0) return undefined;
      return { id, pedigree: makeDeepPedigree(2, gen) } as Horse;
    };

    // With maxExpandDepth=0, stubs should not be expanded
    const expanded = expandPedigreeStubs(pruned, resolveHorse, 0)!;
    expect(countStubs(expanded)).toBe(stubCountBefore);
  });

  it("handles stub with no horseId (returns as-is)", () => {
    const stubNoId: PedigreeNode = {
      name: "Unknown Parent",
      generation: 4,
      isStub: true,
    };
    const root: PedigreeNode = {
      horseId: "h-root",
      name: "Root",
      generation: 0,
      sirePedigree: stubNoId,
    };

    let resolverCalled = false;
    const resolver = (id: string): Horse | undefined => {
      resolverCalled = true;
      return { id, pedigree: {} } as Horse;
    };
    const expanded = expandPedigreeStubs(root, resolver)!;

    expect(resolverCalled).toBe(false);
    expect(expanded.sirePedigree).toEqual(stubNoId);
  });
});
