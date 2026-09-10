import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFoaling } from "@/core/horse/foaling";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Pregnancy } from "@/game/types";
import {
  FOALING_AGE_RISK_THRESHOLD,
  FOALING_AGE_RISK_MULTIPLIER,
  FOALING_BASE_COMPLICATION_RATE,
} from "@/constants";

let mockSequence: number[] = [];

vi.mock("@/core/common/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/common/rng")>();
  return {
    ...actual,
    createRng: () => {
      let index = 0;
      return {
        next: () => {
          if (index < mockSequence.length) {
            return mockSequence[index++];
          }
          return 0.5; // Default safe roll
        },
        pick: (arr: any[]) => arr[0], // Mock pick
        int: (min: number, max: number) => min, // Mock int
      };
    },
  };
});

describe("resolveFoaling", () => {
  beforeEach(() => {
    mockSequence = []; // Reset sequence before each test
  });

  it("resolves a live foal successfully", () => {
    mockSequence = [0.9, 0.9, 0.5]; // High rolls to avoid complications

    const dam = createTestHorse({ id: "dam-1", age: 5, name: "Dam Name" });
    const sire = createTestHorse({ id: "sire-1", age: 6, name: "Sire Name" });

    const pregnancy: Pregnancy = {
      id: "pregnancy-1",
      damId: dam.id,
      sireId: sire.id,
      sireName: sire.name,
      damName: dam.name,
      dueDay: 100,
      conceivedDay: 1,
      isPlayerOwned: true,
      resolved: false,
    };

    const result = resolveFoaling(pregnancy, sire, dam);

    expect(result.kind).toBe("live");
    if (result.kind === "live") {
      expect(result.foal.pedigree.sireId).toBe(sire.id);
      expect(result.foal.pedigree.damId).toBe(dam.id);
      expect(result.foal.age).toBe(0);
      expect(result.foal.pedigree.generation).toBe(0); // Foal generation
    }
  });

  it("triggers a complication when base risk roll fails", () => {
    // Force the base roll to be lower than FOALING_BASE_COMPLICATION_RATE
    mockSequence = [0.001, 0.5];

    const dam = createTestHorse({ id: "dam-2", age: 5 });
    const sire = createTestHorse({ id: "sire-2", age: 6 });

    const pregnancy: Pregnancy = {
      id: "pregnancy-2",
      damId: dam.id,
      sireId: sire.id,
      sireName: sire.name,
      damName: dam.name,
      dueDay: 100,
      conceivedDay: 1,
      isPlayerOwned: true,
      resolved: false,
    };

    const result = resolveFoaling(pregnancy, sire, dam);
    expect(result.kind).toBe("complication");
  });

  it("increases complication risk for older dams", () => {
    // Age is FOALING_AGE_RISK_THRESHOLD + 10
    // Risk increases by 10 * FOALING_AGE_RISK_MULTIPLIER
    const oldAge = FOALING_AGE_RISK_THRESHOLD + 10;
    const increasedRisk = FOALING_BASE_COMPLICATION_RATE + 10 * FOALING_AGE_RISK_MULTIPLIER;

    // Roll just under the increased risk, but above the base risk
    // This roll would have survived if the dam was young!
    mockSequence = [increasedRisk - 0.001, 0.5];

    const dam = createTestHorse({ id: "dam-old", age: oldAge });
    const sire = createTestHorse({ id: "sire-old", age: 6 });

    const pregnancy: Pregnancy = {
      id: "pregnancy-3",
      damId: dam.id,
      sireId: sire.id,
      sireName: sire.name,
      damName: dam.name,
      dueDay: 100,
      conceivedDay: 1,
      isPlayerOwned: true,
      resolved: false,
    };

    const result = resolveFoaling(pregnancy, sire, dam);
    expect(result.kind).toBe("complication");
  });

  it("triggers lethal recessive complication if both carry marker and roll fails", () => {
    // First roll: base complication (pass)
    // Second roll: lethal recessive (fail)
    mockSequence = [0.9, 0.001];

    const dam = createTestHorse({
      id: "dam-lethal",
      age: 5,
      geneticMarkers: { lethalCarriers: { olws: true } } as any,
    });
    const sire = createTestHorse({
      id: "sire-lethal",
      age: 6,
      geneticMarkers: { lethalCarriers: { olws: true } } as any,
    });

    const pregnancy: Pregnancy = {
      id: "pregnancy-4",
      damId: dam.id,
      sireId: sire.id,
      sireName: sire.name,
      damName: dam.name,
      dueDay: 100,
      conceivedDay: 1,
      isPlayerOwned: true,
      resolved: false,
    };

    const result = resolveFoaling(pregnancy, sire, dam);
    expect(result.kind).toBe("complication");
    if (result.kind === "complication") {
      expect(result.type).toBe("lethal recessive");
    }
  });

  it("triggers twin reduction complication if roll fails", () => {
    // First roll: base complication (pass)
    // Second roll: twin reduction (fail)
    mockSequence = [0.9, 0.001];

    const dam = createTestHorse({ id: "dam-twin", age: 5 });
    const sire = createTestHorse({ id: "sire-twin", age: 6 });

    const pregnancy: Pregnancy = {
      id: "pregnancy-twin",
      damId: dam.id,
      sireId: sire.id,
      sireName: sire.name,
      damName: dam.name,
      dueDay: 100,
      conceivedDay: 1,
      isPlayerOwned: true,
      resolved: false,
    };

    const result = resolveFoaling(pregnancy, sire, dam);
    expect(result.kind).toBe("complication");
    if (result.kind === "complication") {
      expect(result.type).toBe("twin reduction (single survivor)");
    }
  });

  it("throws an error if genotype is missing", () => {
    const dam = createTestHorse({ id: "dam-nogen", age: 5 });
    const sire = createTestHorse({ id: "sire-nogen", age: 6 });

    // Intentionally override genotype reference to undefined to trigger error
    (dam as any).genotype = undefined;

    const pregnancy: Pregnancy = {
      id: "pregnancy-5",
      damId: dam.id,
      sireId: sire.id,
      sireName: sire.name,
      damName: dam.name,
      dueDay: 100,
      conceivedDay: 1,
      isPlayerOwned: true,
      resolved: false,
    };

    expect(() => resolveFoaling(pregnancy, sire, dam)).toThrow(/missing genotype/);
  });
});
