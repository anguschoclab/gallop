import { describe, it, expect } from "vitest";
import {
  FACILITY_TIER_LABELS,
  facilityLevelToTierLabel,
} from "@/core/facilities/facilityTypes";
import type { FacilityLevel } from "@/core/facilities";

describe("FACILITY_TIER_LABELS", () => {
  it("maps basic to Tier 01", () => {
    expect(FACILITY_TIER_LABELS.basic).toBe("Tier 01");
  });

  it("maps standard to Tier 02", () => {
    expect(FACILITY_TIER_LABELS.standard).toBe("Tier 02");
  });

  it("maps premium to Tier 03", () => {
    expect(FACILITY_TIER_LABELS.premium).toBe("Tier 03");
  });

  it("maps elite to Tier 04", () => {
    expect(FACILITY_TIER_LABELS.elite).toBe("Tier 04");
  });

  it("has exactly 4 entries", () => {
    expect(Object.keys(FACILITY_TIER_LABELS)).toHaveLength(4);
  });
});

describe("facilityLevelToTierLabel", () => {
  const levels: FacilityLevel[] = ["basic", "standard", "premium", "elite"];

  it("returns Tier 01 for basic", () => {
    expect(facilityLevelToTierLabel("basic")).toBe("Tier 01");
  });

  it("returns Tier 02 for standard", () => {
    expect(facilityLevelToTierLabel("standard")).toBe("Tier 02");
  });

  it("returns Tier 03 for premium", () => {
    expect(facilityLevelToTierLabel("premium")).toBe("Tier 03");
  });

  it("returns Tier 04 for elite", () => {
    expect(facilityLevelToTierLabel("elite")).toBe("Tier 04");
  });

  it("returns Tier 00 for unknown level (fallback)", () => {
    expect(facilityLevelToTierLabel("unknown" as FacilityLevel)).toBe("Tier 00");
  });

  it("matches FACILITY_TIER_LABELS for all valid levels", () => {
    levels.forEach((level) => {
      expect(facilityLevelToTierLabel(level)).toBe(FACILITY_TIER_LABELS[level]);
    });
  });
});
