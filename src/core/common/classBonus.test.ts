import { describe, it, expect } from "vitest";
import { calculateClassBonus } from "./classBonus";

describe("calculateClassBonus", () => {
  it("G1 → 8", () => expect(calculateClassBonus("G1")).toBe(8));
  it("G2 → 5", () => expect(calculateClassBonus("G2")).toBe(5));
  it("G3 → 3", () => expect(calculateClassBonus("G3")).toBe(3));
  it("Group (no grade) → 4", () => expect(calculateClassBonus(undefined, "Group")).toBe(4));
  it("Stakes (no grade) → 2", () => expect(calculateClassBonus(undefined, "Stakes")).toBe(2));
  it("neither → 0", () => expect(calculateClassBonus(undefined, undefined)).toBe(0));
  it("neither (Maiden) → 0", () => expect(calculateClassBonus(undefined, "Maiden")).toBe(0));
  it("neither (Allowance) → 0", () => expect(calculateClassBonus(undefined, "Allowance")).toBe(0));
  it("grade takes priority over class — G1 + Group → 8", () =>
    expect(calculateClassBonus("G1", "Group")).toBe(8));
  it("G2 + Stakes → 5 (grade wins)", () => expect(calculateClassBonus("G2", "Stakes")).toBe(5));
});
