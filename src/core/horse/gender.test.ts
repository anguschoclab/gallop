import { describe, it, expect } from "vitest";
import { isGenderEligible, getGenderRestrictionLabel } from "./gender";
import type { Horse } from "@/game/types";

type Gender = Horse["gender"];
const GENDERS: Gender[] = ["colt", "filly", "horse", "mare"];

describe("isGenderEligible", () => {
  it("undefined restriction → true for all genders", () => {
    for (const g of GENDERS) expect(isGenderEligible(g, undefined)).toBe(true);
  });

  it("colt restriction → true for colt and horse only", () => {
    expect(isGenderEligible("colt", "colt")).toBe(true);
    expect(isGenderEligible("horse", "colt")).toBe(true);
    expect(isGenderEligible("filly", "colt")).toBe(false);
    expect(isGenderEligible("mare", "colt")).toBe(false);
  });

  it("filly restriction → true for filly and mare only", () => {
    expect(isGenderEligible("filly", "filly")).toBe(true);
    expect(isGenderEligible("mare", "filly")).toBe(true);
    expect(isGenderEligible("colt", "filly")).toBe(false);
    expect(isGenderEligible("horse", "filly")).toBe(false);
  });

  it("mares restriction → true for mare only", () => {
    expect(isGenderEligible("mare", "mares")).toBe(true);
    expect(isGenderEligible("filly", "mares")).toBe(false);
    expect(isGenderEligible("colt", "mares")).toBe(false);
    expect(isGenderEligible("horse", "mares")).toBe(false);
  });

  it("fillies-and-mares → true for filly and mare", () => {
    expect(isGenderEligible("filly", "fillies-and-mares")).toBe(true);
    expect(isGenderEligible("mare", "fillies-and-mares")).toBe(true);
    expect(isGenderEligible("colt", "fillies-and-mares")).toBe(false);
    expect(isGenderEligible("horse", "fillies-and-mares")).toBe(false);
  });

  it("colts-and-fillies → true for all four genders", () => {
    for (const g of GENDERS) {
      expect(isGenderEligible(g, "colts-and-fillies")).toBe(true);
    }
  });

  it("horses restriction → true for horse and colt only", () => {
    expect(isGenderEligible("horse", "horses")).toBe(true);
    expect(isGenderEligible("colt", "horses")).toBe(true);
    expect(isGenderEligible("mare", "horses")).toBe(false);
    expect(isGenderEligible("filly", "horses")).toBe(false);
  });
});

describe("getGenderRestrictionLabel", () => {
  it("undefined → Open", () => expect(getGenderRestrictionLabel(undefined)).toBe("Open"));
  it("colt → Colts", () => expect(getGenderRestrictionLabel("colt")).toBe("Colts"));
  it("colts → Colts", () => expect(getGenderRestrictionLabel("colts" as never)).toBe("Colts"));
  it("filly → Fillies", () => expect(getGenderRestrictionLabel("filly" as never)).toBe("Fillies"));
  it("fillies → Fillies", () =>
    expect(getGenderRestrictionLabel("fillies" as never)).toBe("Fillies"));
  it("mares → Mares", () => expect(getGenderRestrictionLabel("mares")).toBe("Mares"));
  it("fillies-and-mares → Fillies & Mares", () =>
    expect(getGenderRestrictionLabel("fillies-and-mares")).toBe("Fillies & Mares"));
  it("colts-and-fillies → Colts & Fillies", () =>
    expect(getGenderRestrictionLabel("colts-and-fillies")).toBe("Colts & Fillies"));
  it("horses → Horses", () => expect(getGenderRestrictionLabel("horses")).toBe("Horses"));
});
