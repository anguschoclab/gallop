import { describe, it, expect } from "vitest";
import {
  resolveBruceLoweFamily,
  familyRole,
  RUNNING_FAMILIES,
  SIRE_FAMILIES,
  rollProceduralFamily,
} from "@/core/breeding/bruceLowe";
import type { Horse } from "@/game/types";
import { createTestHorse } from "@/tests/helpers";

function mkHorse(over: Partial<Horse> = {}): Horse {
  return createTestHorse({
    id: "h",
    name: "H",
    age: 4,
    gender: "mare",
    ...over,
  });
}

describe("familyRole", () => {
  it("classifies running families 1, 2, 4, 5 as Running", () => {
    expect(familyRole(1)).toBe("Running");
    expect(familyRole(2)).toBe("Running");
    expect(familyRole(4)).toBe("Running");
    expect(familyRole(5)).toBe("Running");
  });

  it("family 3 is both Running and Sire", () => {
    expect(familyRole(3)).toBe("Both");
  });

  it("families 8, 11, 12, 14 are Sire-only", () => {
    expect(familyRole(8)).toBe("Sire");
    expect(familyRole(11)).toBe("Sire");
    expect(familyRole(12)).toBe("Sire");
    expect(familyRole(14)).toBe("Sire");
  });

  it("unknown family is Standard", () => {
    expect(familyRole(20)).toBe("Standard");
    expect(familyRole(undefined)).toBe("Unknown");
  });
});

describe("resolveBruceLoweFamily", () => {
  it("returns the cached value when set on the horse", () => {
    const h = mkHorse({ bruceLoweFamily: 7 });
    expect(resolveBruceLoweFamily(h, { horses: [h] } as any)).toBe(7);
  });

  it("walks up to the dam to find the family", () => {
    const dam = mkHorse({ id: "dam", bruceLoweFamily: 12 });
    const foal = mkHorse({ id: "foal", pedigree: { name: "Foal", generation: 0, damId: "dam" } });
    expect(resolveBruceLoweFamily(foal, { horses: [dam, foal] } as any)).toBe(12);
  });

  it("undefined when no chain hits a known family", () => {
    const foal = mkHorse({ id: "x" });
    expect(resolveBruceLoweFamily(foal, { horses: [foal] } as any)).toBeUndefined();
  });
});

describe("rollProceduralFamily", () => {
  it("returns a positive integer", () => {
    for (let i = 0; i < 50; i++) {
      const f = rollProceduralFamily();
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThan(0);
    }
  });

  it("over many trials produces some running and some non-running families", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rollProceduralFamily());
    expect([...seen].some((f) => RUNNING_FAMILIES.has(f))).toBe(true);
    expect([...seen].some((f) => !RUNNING_FAMILIES.has(f) && !SIRE_FAMILIES.has(f))).toBe(true);
  });
});
