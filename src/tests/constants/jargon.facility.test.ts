import { describe, it, expect } from "vitest";
import { JARGON_DEFINITIONS } from "@/core/horse/jargon";

describe("JARGON_DEFINITIONS — facility terms", () => {
  it("defines Tier as a non-empty string", () => {
    expect(JARGON_DEFINITIONS.Tier).toBeTruthy();
    expect(typeof JARGON_DEFINITIONS.Tier).toBe("string");
    expect(JARGON_DEFINITIONS.Tier.length).toBeGreaterThan(0);
  });

  it("defines Regimens Unlocked as a non-empty string", () => {
    expect(JARGON_DEFINITIONS["Regimens Unlocked"]).toBeTruthy();
    expect(typeof JARGON_DEFINITIONS["Regimens Unlocked"]).toBe("string");
    expect(JARGON_DEFINITIONS["Regimens Unlocked"].length).toBeGreaterThan(0);
  });

  it("defines Commission as a non-empty string", () => {
    expect(JARGON_DEFINITIONS.Commission).toBeTruthy();
    expect(typeof JARGON_DEFINITIONS.Commission).toBe("string");
    expect(JARGON_DEFINITIONS.Commission.length).toBeGreaterThan(0);
  });

  it("Tier definition mentions tier or 01 (case-insensitive)", () => {
    const def = JARGON_DEFINITIONS.Tier.toLowerCase();
    expect(def.includes("tier") || def.includes("01")).toBe(true);
  });

  it("Commission definition mentions upgrade", () => {
    const def = JARGON_DEFINITIONS.Commission.toLowerCase();
    expect(def.includes("upgrade")).toBe(true);
  });
});
