import { describe, it, expect } from "vitest";
import {
  formatAgeRestrictions,
  formatGenderRestriction,
  formatAllRestrictions,
} from "./restrictions";

describe("formatAgeRestrictions", () => {
  it("undefined → empty string", () => expect(formatAgeRestrictions(undefined)).toBe(""));
  it("no minAge → empty string", () => expect(formatAgeRestrictions({})).toBe(""));
  it("minAge === maxAge → 'XYO only'", () =>
    expect(formatAgeRestrictions({ minAge: 3, maxAge: 3 })).toBe("3YO only"));
  it("minAge + maxAge different → range string", () =>
    expect(formatAgeRestrictions({ minAge: 2, maxAge: 4 })).toMatch(/2.*4/));
  it("minAge only → open-ended string with +", () =>
    expect(formatAgeRestrictions({ minAge: 3 })).toContain("3"));
  it("minAge only → does not include maxAge number when absent", () => {
    const result = formatAgeRestrictions({ minAge: 3 });
    expect(result).not.toContain("undefined");
  });
});

describe("formatGenderRestriction", () => {
  it("undefined → empty string", () => expect(formatGenderRestriction(undefined)).toBe(""));
  it("colt → Colts only", () => expect(formatGenderRestriction("colt")).toBe("Colts only"));
  it("filly → Fillies only", () => expect(formatGenderRestriction("filly")).toBe("Fillies only"));
  it("mares → Mares Only", () => {
    const result = formatGenderRestriction("mares");
    expect(result).toContain("Mare");
  });
  it("fillies-and-mares → Fillies & Mares", () => {
    const result = formatGenderRestriction("fillies-and-mares");
    expect(result).toContain("Fill");
    expect(result).toContain("Mare");
  });
  it("colts-and-fillies → Colts & Fillies", () => {
    const result = formatGenderRestriction("colts-and-fillies");
    expect(result).toContain("Colt");
    expect(result).toContain("Fill");
  });
  it("horses → Horses Only", () => {
    const result = formatGenderRestriction("horses");
    expect(result).toContain("Horse");
  });
});

describe("formatAllRestrictions", () => {
  it("no restrictions → empty string", () => expect(formatAllRestrictions(undefined)).toBe(""));

  it("empty restrictions object → empty string", () => expect(formatAllRestrictions({})).toBe(""));

  it("age only", () => {
    const result = formatAllRestrictions({ minAge: 3, maxAge: 3 });
    expect(result).toContain("3");
    expect(result).not.toContain("·");
  });

  it("gender only", () => {
    const result = formatAllRestrictions({ gender: "mares" });
    expect(result).toContain("Mare");
    expect(result).not.toContain("·");
  });

  it("both age and gender → joined with ' · '", () => {
    const result = formatAllRestrictions({ minAge: 3, maxAge: 3, gender: "mares" });
    expect(result).toContain("·");
    expect(result).toContain("3");
    expect(result).toContain("Mare");
  });
});
